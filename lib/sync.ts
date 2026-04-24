import { prisma } from "./db";
import { decryptJSON, encryptJSON } from "./crypto";
import {
  getOwnedGames as getSteamOwned,
  getSteamAppMeta,
  getSteamPlayerAchievements,
  type SteamCreds,
} from "./connectors/steam";
import {
  ensureFreshGog,
  getOwnedGogGames,
  type GogCreds,
} from "./connectors/gog";
import {
  ensureFreshEpic,
  getOwnedEpicGames,
  enrichEpicViaStore,
  type EpicCreds,
} from "./connectors/epic";

export type NormalizedGame = {
  storeGameId: string;
  title: string;
  coverUrl: string | null;
  playtimeMin: number;
  lastPlayedAt: Date | null;
  storeUrl: string | null;
  /** Cross-store metadata. Used to backfill Game.dev/genre/year on first see. */
  dev: string | null;
  genre: string | null;
  year: number | null;
  tags: string[];
  /** Steam-only: pre-fetched per-account achievements. */
  achievementsUnlocked?: number | null;
  achievementsTotal?: number | null;
};

function normalizeTitle(t: string): string {
  return t
    .toLowerCase()
    .replace(/[™®©]/g, "")
    .replace(/[:\-–—_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchForAccount(account: {
  id: string;
  storeId: string;
  credsEnc: string;
}): Promise<{ games: NormalizedGame[]; updatedCredsEnc?: string }> {
  if (account.storeId === "steam") {
    const creds = decryptJSON<SteamCreds>(account.credsEnc);
    const games = await getSteamOwned(creds.steamId64);

    // Pre-load existing Game.dev for these appids so we only fetch meta
    // for games with no cached metadata yet (avoids re-hitting appdetails).
    const appids = games.map((g) => String(g.appid));
    const knownGOS = await prisma.gameOnStore.findMany({
      where: { storeId: "steam", storeGameId: { in: appids } },
      include: { game: true },
    });
    const metaByAppid: Record<string, { dev: string | null; genre: string | null; year: number | null; tags: string[] } | null> = {};
    for (const k of knownGOS) {
      if (k.game.dev || k.game.genre) {
        metaByAppid[k.storeGameId] = {
          dev: k.game.dev,
          genre: k.game.genre,
          year: k.game.releaseYear,
          tags: k.game.tagsJson ? safeJsonArray(k.game.tagsJson) : [],
        };
      }
    }

    // Fetch missing metadata serially with a small delay (Steam rate-limits ~200/5min/IP).
    for (const g of games) {
      const id = String(g.appid);
      if (metaByAppid[id]) continue;
      const meta = await getSteamAppMeta(g.appid);
      metaByAppid[id] = meta;
      await sleep(150);
    }

    // Fetch achievements ONLY for games with playtime > 0 (saves API calls).
    const achByAppid: Record<string, { unlocked: number; total: number } | null> = {};
    for (const g of games) {
      if (g.playtimeMin <= 0) continue;
      const ach = await getSteamPlayerAchievements(creds.steamId64, g.appid);
      achByAppid[String(g.appid)] = ach;
      await sleep(150);
    }

    return {
      games: games.map((g) => {
        const meta = metaByAppid[String(g.appid)] ?? null;
        const ach = achByAppid[String(g.appid)] ?? null;
        return {
          storeGameId: String(g.appid),
          title: g.title,
          coverUrl: g.coverUrl,
          playtimeMin: g.playtimeMin,
          lastPlayedAt: g.lastPlayedAt,
          storeUrl: g.storeUrl,
          dev: meta?.dev ?? null,
          genre: meta?.genre ?? null,
          year: meta?.year ?? null,
          tags: meta?.tags ?? [],
          achievementsUnlocked: ach?.unlocked ?? null,
          achievementsTotal: ach?.total ?? null,
        };
      }),
    };
  }

  if (account.storeId === "gog") {
    let creds = decryptJSON<GogCreds>(account.credsEnc);
    const refreshed = await ensureFreshGog(creds);
    const credsChanged = refreshed.accessToken !== creds.accessToken;
    creds = refreshed;
    const raw = await getOwnedGogGames(creds);
    return {
      games: raw.map((g) => ({
        storeGameId: String(g.productId),
        title: g.title,
        coverUrl: g.coverUrl,
        playtimeMin: 0,
        lastPlayedAt: null,
        storeUrl: g.storeUrl,
        dev: g.dev,
        genre: g.genre,
        year: g.year,
        tags: g.tags,
      })),
      updatedCredsEnc: credsChanged ? encryptJSON(creds) : undefined,
    };
  }

  if (account.storeId === "epic") {
    let creds = decryptJSON<EpicCreds>(account.credsEnc);
    const refreshed = await ensureFreshEpic(creds);
    const credsChanged = refreshed.accessToken !== creds.accessToken;
    creds = refreshed;
    const raw = await getOwnedEpicGames(creds);

    // Enrich via Epic Store GraphQL for games where catalog returned no dev/genre.
    // Throttled to 200ms to dodge Cloudflare rate limiting.
    const enriched = [];
    for (const g of raw) {
      let dev = g.dev;
      let genre = g.genre;
      let year = g.year;
      let tags = g.tags;
      if (!dev || !genre) {
        const extra = await enrichEpicViaStore(g.title);
        if (extra) {
          dev = dev ?? extra.dev;
          genre = genre ?? extra.genre;
          year = year ?? extra.year;
          if (!tags.length && extra.tags.length) tags = extra.tags;
        }
        await sleep(200);
      }
      enriched.push({ ...g, dev, genre, year, tags });
    }

    return {
      games: enriched.map((g) => ({
        storeGameId: g.catalogItemId,
        title: g.title,
        coverUrl: g.coverUrl,
        playtimeMin: 0,
        lastPlayedAt: null,
        storeUrl: g.storeUrl,
        dev: g.dev,
        genre: g.genre,
        year: g.year,
        tags: g.tags,
      })),
      updatedCredsEnc: credsChanged ? encryptJSON(creds) : undefined,
    };
  }

  throw new Error(`Sync not yet implemented for store: ${account.storeId}`);
}

export async function syncAccount(accountId: string): Promise<{ added: number; updated: number; removed: number; total: number }> {
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) throw new Error(`Account ${accountId} not found`);

  const syncStartedAt = new Date();

  let fetched: NormalizedGame[];
  let credsUpdate: string | undefined;
  try {
    const r = await fetchForAccount(account);
    fetched = r.games;
    credsUpdate = r.updatedCredsEnc;
  } catch (err) {
    await prisma.account.update({
      where: { id: accountId },
      data: {
        lastSyncAt: new Date(),
        lastSyncOk: false,
        lastError: err instanceof Error ? err.message : String(err),
      },
    });
    throw err;
  }

  let added = 0;
  let updated = 0;

  for (const g of fetched) {
    const normTitle = normalizeTitle(g.title);

    let game = await prisma.game.findFirst({ where: { normTitle } });
    if (!game) {
      game = await prisma.game.create({
        data: {
          title: g.title,
          normTitle,
          coverUrl: g.coverUrl,
          dev: g.dev,
          genre: g.genre,
          releaseYear: g.year,
          tagsJson: g.tags.length ? JSON.stringify(g.tags) : null,
        },
      });
    } else {
      // Backfill missing fields from this store's data without overwriting existing values.
      const patch: Record<string, unknown> = {};
      if (!game.coverUrl && g.coverUrl) patch.coverUrl = g.coverUrl;
      if (!game.dev && g.dev) patch.dev = g.dev;
      if (!game.genre && g.genre) patch.genre = g.genre;
      if (!game.releaseYear && g.year) patch.releaseYear = g.year;
      if (!game.tagsJson && g.tags.length) patch.tagsJson = JSON.stringify(g.tags);
      if (Object.keys(patch).length) {
        game = await prisma.game.update({ where: { id: game.id }, data: patch });
      }
    }

    const existingGOS = await prisma.gameOnStore.findUnique({
      where: { storeId_storeGameId: { storeId: account.storeId, storeGameId: g.storeGameId } },
    });
    const gos =
      existingGOS ??
      (await prisma.gameOnStore.create({
        data: {
          gameId: game.id,
          storeId: account.storeId,
          storeGameId: g.storeGameId,
          storeTitle: g.title,
          coverUrl: g.coverUrl,
          storeUrl: g.storeUrl,
        },
      }));

    const now = new Date();
    const existingCopy = await prisma.ownedCopy.findUnique({
      where: { accountId_gameOnStoreId: { accountId: account.id, gameOnStoreId: gos.id } },
    });
    const copyData = {
      playtimeMin: g.playtimeMin,
      lastPlayedAt: g.lastPlayedAt,
      lastSeenAt: now,
      ...(g.achievementsUnlocked != null
        ? {
            achievementsUnlocked: g.achievementsUnlocked,
            achievementsTotal: g.achievementsTotal,
          }
        : {}),
    };
    if (existingCopy) {
      await prisma.ownedCopy.update({ where: { id: existingCopy.id }, data: copyData });
      updated++;
    } else {
      await prisma.ownedCopy.create({
        data: {
          accountId: account.id,
          gameOnStoreId: gos.id,
          firstSeenAt: now,
          ...copyData,
        },
      });
      added++;
    }
  }

  // Remove OwnedCopy rows for this account that weren't seen in this sync.
  // These are leftovers from earlier sync runs with broader filters.
  const removedRes = await prisma.ownedCopy.deleteMany({
    where: { accountId: account.id, lastSeenAt: { lt: syncStartedAt } },
  });

  await prisma.account.update({
    where: { id: accountId },
    data: {
      lastSyncAt: new Date(),
      lastSyncOk: true,
      lastError: null,
      ...(credsUpdate ? { credsEnc: credsUpdate } : {}),
    },
  });

  return { added, updated, removed: removedRes.count, total: fetched.length };
}

function safeJsonArray(s: string): string[] {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}
