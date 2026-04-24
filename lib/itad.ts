import { prisma } from "./db";

const ITAD_BASE = "https://api.isthereanydeal.com";

export class ItadMissingKeyError extends Error {
  constructor() {
    super("ITAD_API_KEY not set. Grab one at https://isthereanydeal.com/apps/my/ and add it to .env.");
  }
}

function key(): string {
  const k = process.env.ITAD_API_KEY;
  if (!k) throw new ItadMissingKeyError();
  return k;
}

function region(): { country: string; currency: string } {
  return {
    country: process.env.STORE_REGION ?? "IN",
    currency: process.env.STORE_CURRENCY ?? "INR",
  };
}

type LookupRes = {
  found?: boolean;
  game?: { id?: string; slug?: string; title?: string };
};

export async function lookupGameId(title: string): Promise<string | null> {
  const url = new URL(`${ITAD_BASE}/games/lookup/v1`);
  url.searchParams.set("key", key());
  url.searchParams.set("title", title);
  const r = await fetch(url, { headers: { "user-agent": "playdex/1.0" } });
  if (!r.ok) throw new Error(`ITAD lookup ${r.status}: ${await r.text()}`);
  const j = (await r.json()) as LookupRes;
  return j.found && j.game?.id ? j.game.id : null;
}

type Shop = { id?: number | string; name?: string };
type Money = { amount?: number; amountInt?: number; currency?: string };
type Deal = { shop?: Shop; price?: Money; url?: string; cut?: number };
type HistoryLow = { all?: Money & { shop?: Shop } };
type PriceEntry = {
  id: string;
  deals?: Deal[];
  historyLow?: HistoryLow;
};

export async function fetchPrices(ids: string[]): Promise<PriceEntry[]> {
  if (ids.length === 0) return [];
  const { country } = region();
  const url = new URL(`${ITAD_BASE}/games/prices/v3`);
  url.searchParams.set("key", key());
  url.searchParams.set("country", country);
  url.searchParams.set("nondeals", "true");
  url.searchParams.set("capacity", "12");
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": "playdex/1.0" },
    body: JSON.stringify(ids),
  });
  if (!r.ok) throw new Error(`ITAD prices ${r.status}: ${await r.text()}`);
  return (await r.json()) as PriceEntry[];
}

export async function syncWishlistDeals(): Promise<{ matched: number; updated: number; missing: number; skipped: number }> {
  key();
  const items = await prisma.wishlistItem.findMany({
    select: { id: true, title: true, currency: true },
  });

  const titleToId = new Map<string, string | null>();
  let missing = 0;
  const chunks: Array<{ wishlistItemId: string; gameId: string }> = [];
  for (const it of items) {
    const cacheKey = it.title.toLowerCase();
    if (!titleToId.has(cacheKey)) {
      try {
        titleToId.set(cacheKey, await lookupGameId(it.title));
      } catch {
        titleToId.set(cacheKey, null);
      }
    }
    const gid = titleToId.get(cacheKey) ?? null;
    if (!gid) {
      missing++;
      continue;
    }
    chunks.push({ wishlistItemId: it.id, gameId: gid });
  }

  if (chunks.length === 0) return { matched: 0, updated: 0, missing, skipped: 0 };

  const gameIds = [...new Set(chunks.map((c) => c.gameId))];
  const prices = await fetchPrices(gameIds);
  const priceMap = new Map(prices.map((p) => [p.id, p]));

  let updated = 0;
  let skipped = 0;
  for (const c of chunks) {
    const entry = priceMap.get(c.gameId);
    if (!entry || !entry.deals?.length) {
      skipped++;
      continue;
    }
    const best = [...entry.deals].sort(
      (a, b) => (a.price?.amountInt ?? Infinity) - (b.price?.amountInt ?? Infinity),
    )[0];
    const bestCents = best.price?.amountInt ?? null;
    if (bestCents == null) {
      skipped++;
      continue;
    }
    const low = entry.historyLow?.all;
    const lowCents = low?.amountInt ?? null;

    const bestShopId = best.shop?.id != null ? String(best.shop.id) : "unknown";
    const bestShopName = best.shop?.name ?? bestShopId;
    const lowShopId = low?.shop?.id != null ? String(low.shop.id) : null;

    await prisma.externalDeal.upsert({
      where: { wishlistItemId: c.wishlistItemId },
      create: {
        wishlistItemId: c.wishlistItemId,
        bestShop: bestShopId,
        bestShopName,
        bestPriceCents: bestCents,
        bestUrl: best.url ?? null,
        historicalLowCents: lowCents,
        historicalLowShop: lowShopId,
        currency: best.price?.currency ?? null,
      },
      update: {
        bestShop: bestShopId,
        bestShopName,
        bestPriceCents: bestCents,
        bestUrl: best.url ?? null,
        historicalLowCents: lowCents,
        historicalLowShop: lowShopId,
        currency: best.price?.currency ?? null,
        fetchedAt: new Date(),
      },
    });
    updated++;
  }

  return { matched: chunks.length, updated, missing, skipped };
}
