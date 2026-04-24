import { prisma } from "./db";
import { decryptJSON, encryptJSON } from "./crypto";
import { getSteamWishlist, type SteamCreds } from "./connectors/steam";
import { ensureFreshGog, getGogWishlist, type GogCreds } from "./connectors/gog";

function normalizeTitle(t: string): string {
  return t
    .toLowerCase()
    .replace(/[™®©]/g, "")
    .replace(/[:\-–—_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function syncWishlistForAccount(accountId: string): Promise<{ added: number; updated: number; removed: number; total: number }> {
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) throw new Error(`Account ${accountId} not found`);

  const syncStartedAt = new Date();
  let credsUpdate: string | undefined;

  type Item = {
    storeGameId: string;
    title: string;
    coverUrl: string | null;
    storeUrl: string | null;
    fullPriceCents: number | null;
    currentPriceCents: number | null;
    discountPct: number | null;
    currency: string | null;
    isOnSale: boolean;
  };
  let items: Item[] = [];

  if (account.storeId === "steam") {
    const c = decryptJSON<SteamCreds>(account.credsEnc);
    const raw = await getSteamWishlist(c.steamId64);
    items = raw.map((g) => ({
      storeGameId: String(g.appid),
      title: g.title,
      coverUrl: g.coverUrl,
      storeUrl: g.storeUrl,
      fullPriceCents: g.fullPriceCents,
      currentPriceCents: g.currentPriceCents,
      discountPct: g.discountPct,
      currency: g.currency,
      isOnSale: g.isOnSale,
    }));
  } else if (account.storeId === "gog") {
    let creds = decryptJSON<GogCreds>(account.credsEnc);
    const refreshed = await ensureFreshGog(creds);
    if (refreshed.accessToken !== creds.accessToken) credsUpdate = encryptJSON(refreshed);
    creds = refreshed;
    const raw = await getGogWishlist(creds);
    items = raw.map((g) => ({
      storeGameId: String(g.productId),
      title: g.title,
      coverUrl: g.coverUrl,
      storeUrl: g.storeUrl,
      fullPriceCents: g.fullPriceCents,
      currentPriceCents: g.currentPriceCents,
      discountPct: g.discountPct,
      currency: g.currency,
      isOnSale: g.isOnSale,
    }));
  } else {
    throw new Error(`Wishlist not supported for store: ${account.storeId}`);
  }

  let added = 0;
  let updated = 0;

  for (const it of items) {
    // Try to link to canonical Game by normalized title.
    const normTitle = normalizeTitle(it.title);
    const linkedGame = await prisma.game.findFirst({ where: { normTitle }, select: { id: true } });

    const existing = await prisma.wishlistItem.findUnique({
      where: { accountId_storeGameId: { accountId: account.id, storeGameId: it.storeGameId } },
    });
    const data = {
      title: it.title,
      coverUrl: it.coverUrl,
      storeUrl: it.storeUrl,
      fullPriceCents: it.fullPriceCents,
      currentPriceCents: it.currentPriceCents,
      discountPct: it.discountPct,
      currency: it.currency,
      isOnSale: it.isOnSale,
      gameId: linkedGame?.id ?? null,
      lastSeenAt: new Date(),
    };
    if (existing) {
      await prisma.wishlistItem.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.wishlistItem.create({
        data: {
          accountId: account.id,
          storeId: account.storeId,
          storeGameId: it.storeGameId,
          ...data,
        },
      });
      added++;
    }
  }

  // Drop wishlist entries no longer present.
  const removed = await prisma.wishlistItem.deleteMany({
    where: { accountId: account.id, lastSeenAt: { lt: syncStartedAt } },
  });

  if (credsUpdate) {
    await prisma.account.update({ where: { id: account.id }, data: { credsEnc: credsUpdate } });
  }

  return { added, updated, removed: removed.count, total: items.length };
}
