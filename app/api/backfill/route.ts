import { prisma } from "@/lib/db";
import { decryptJSON } from "@/lib/crypto";
import { getSteamAppMeta, getSteamPlayerAchievements, type SteamCreds } from "@/lib/connectors/steam";
import { enrichEpicViaStore } from "@/lib/connectors/epic";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Backfill metadata + achievements for existing rows. Throttled to stay under
 * each provider's rate limits.
 *
 * Query params (all optional, default = run everything):
 *  - onlyMeta=1   → Steam appdetails + Epic store enrichment, skip achievements
 *  - onlyAch=1    → Steam achievements only
 *  - includeUnplayed=1 → also fetch Steam achievements for OwnedCopies with playtime=0
 *  - storeId=steam|gog|epic → restrict meta backfill to one store
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const onlyMeta = url.searchParams.get("onlyMeta") === "1";
  const onlyAch = url.searchParams.get("onlyAch") === "1";
  const includeUnplayed = url.searchParams.get("includeUnplayed") === "1";
  const storeFilter = url.searchParams.get("storeId");
  const doMeta = !onlyAch;
  const doAch = !onlyMeta;

  let metaUpdated = 0;
  let achUpdated = 0;
  const errors: string[] = [];

  if (doMeta) {
    // Steam appdetails
    if (!storeFilter || storeFilter === "steam") {
      const incompleteGames = await prisma.game.findMany({
        where: { OR: [{ dev: null }, { genre: null }, { releaseYear: null }, { kind: null }] },
        select: { id: true },
      });
      const targets = await prisma.gameOnStore.findMany({
        where: { storeId: "steam", gameId: { in: incompleteGames.map((g) => g.id) } },
        include: { game: true },
      });
      for (const t of targets) {
        try {
          const meta = await getSteamAppMeta(Number(t.storeGameId));
          if (meta) {
            await prisma.game.update({
              where: { id: t.gameId },
              data: {
                dev: t.game.dev ?? meta.dev,
                genre: t.game.genre ?? meta.genre,
                releaseYear: t.game.releaseYear ?? meta.year,
                tagsJson: t.game.tagsJson ?? (meta.tags.length ? JSON.stringify(meta.tags) : null),
                kind: t.game.kind ?? meta.kind,
              },
            });
            metaUpdated++;
          }
        } catch (e) {
          errors.push(`steam-meta ${t.storeGameId}: ${e instanceof Error ? e.message : e}`);
        }
        await sleep(150);
      }
    }

    // Epic store enrichment via GraphQL search-by-title
    if (!storeFilter || storeFilter === "epic") {
      const incompleteEpic = await prisma.gameOnStore.findMany({
        where: {
          storeId: "epic",
          owned: { some: {} }, // skip orphaned rows
          gameId: {
            in: (
              await prisma.game.findMany({
                where: { OR: [{ dev: null }, { genre: null }, { coverUrl: null }, { kind: null }] },
                select: { id: true },
              })
            ).map((g) => g.id),
          },
        },
        include: { game: true },
      });
      for (const t of incompleteEpic) {
        try {
          const extra = await enrichEpicViaStore(t.game.title);
          if (extra && (extra.dev || extra.genre || extra.year || extra.coverUrl)) {
            await prisma.game.update({
              where: { id: t.gameId },
              data: {
                dev: t.game.dev ?? extra.dev,
                genre: t.game.genre ?? extra.genre,
                releaseYear: t.game.releaseYear ?? extra.year,
                tagsJson: t.game.tagsJson ?? (extra.tags.length ? JSON.stringify(extra.tags) : null),
                coverUrl: t.game.coverUrl ?? extra.coverUrl,
              },
            });
            metaUpdated++;
          }
        } catch (e) {
          errors.push(`epic-meta ${t.game.title}: ${e instanceof Error ? e.message : e}`);
        }
        await sleep(200);
      }
    }
  }

  if (doAch) {
    const accounts = await prisma.account.findMany({ where: { storeId: "steam" } });
    for (const acc of accounts) {
      let creds: SteamCreds;
      try {
        creds = decryptJSON<SteamCreds>(acc.credsEnc);
      } catch {
        continue;
      }
      const where: Record<string, unknown> = {
        accountId: acc.id,
        achievementsTotal: null,
        gameOnStore: { storeId: "steam" },
      };
      if (!includeUnplayed) where.playtimeMin = { gt: 0 };
      const copies = await prisma.ownedCopy.findMany({
        where,
        include: { gameOnStore: true },
      });
      for (const c of copies) {
        try {
          const ach = await getSteamPlayerAchievements(creds.steamId64, Number(c.gameOnStore.storeGameId));
          if (ach) {
            await prisma.ownedCopy.update({
              where: { id: c.id },
              data: { achievementsUnlocked: ach.unlocked, achievementsTotal: ach.total },
            });
            achUpdated++;
          }
        } catch (e) {
          errors.push(`ach ${acc.label}/${c.gameOnStore.storeGameId}: ${e instanceof Error ? e.message : e}`);
        }
        await sleep(150);
      }
    }
  }

  return Response.json({ ok: true, metaUpdated, achUpdated, errorCount: errors.length, errors: errors.slice(0, 10) });
}
