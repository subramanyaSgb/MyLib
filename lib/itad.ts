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

type LookupRes = { found?: boolean; game?: { id?: string; slug?: string; title?: string } };

export async function lookupGameId(title: string): Promise<string | null> {
  const url = new URL(`${ITAD_BASE}/games/lookup/v1`);
  url.searchParams.set("key", key());
  url.searchParams.set("title", title);
  const r = await fetch(url, { headers: { "user-agent": "playdex/1.0" } });
  if (!r.ok) throw new Error(`ITAD lookup: HTTP ${r.status}`);
  const j = (await r.json()) as LookupRes;
  return j.found && j.game?.id ? j.game.id : null;
}

type PriceEntry = {
  id: string;
  deals?: Array<{
    shop?: { id?: string; name?: string };
    price?: { amount?: number; amountInt?: number; currency?: string };
    url?: string;
    cut?: number;
  }>;
};
type HistoryLow = {
  id: string;
  history_low?: { all?: { amount?: number; amountInt?: number; currency?: string; shop?: { id?: string; name?: string } } };
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
  if (!r.ok) throw new Error(`ITAD prices: HTTP ${r.status}`);
  return (await r.json()) as PriceEntry[];
}

export async function fetchHistoryLows(ids: string[]): Promise<Record<string, HistoryLow>> {
  if (ids.length === 0) return {};
  const { country } = region();
  const url = new URL(`${ITAD_BASE}/games/storelow/v2`);
  url.searchParams.set("key", key());
  url.searchParams.set("country", country);
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": "playdex/1.0" },
    body: JSON.stringify(ids),
  });
  if (!r.ok) {
    const url2 = new URL(`${ITAD_BASE}/games/info/v2`);
    url2.searchParams.set("key", key());
    const r2 = await fetch(url2, {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": "playdex/1.0" },
      body: JSON.stringify(ids),
    });
    if (!r2.ok) throw new Error(`ITAD history: HTTP ${r2.status}`);
    const raw = (await r2.json()) as HistoryLow[];
    return Object.fromEntries(raw.map((e) => [e.id, e]));
  }
  const raw = (await r.json()) as HistoryLow[];
  return Object.fromEntries(raw.map((e) => [e.id, e]));
}

export async function syncWishlistDeals(): Promise<{ matched: number; updated: number; missing: number; skipped: number }> {
  key();
  const items = await prisma.wishlistItem.findMany({
    select: { id: true, title: true, currency: true },
  });

  const titleToIds = new Map<string, string>();
  let missing = 0;
  const chunks: Array<{ wishlistItemId: string; gameId: string }> = [];
  for (const it of items) {
    const cached = titleToIds.get(it.title.toLowerCase());
    const gid = cached ?? (await lookupGameId(it.title));
    if (!gid) {
      missing++;
      continue;
    }
    titleToIds.set(it.title.toLowerCase(), gid);
    chunks.push({ wishlistItemId: it.id, gameId: gid });
  }

  if (chunks.length === 0) return { matched: 0, updated: 0, missing, skipped: 0 };

  const gameIds = [...new Set(chunks.map((c) => c.gameId))];
  const [prices, lows] = await Promise.all([fetchPrices(gameIds), fetchHistoryLows(gameIds)]);
  const priceMap = new Map(prices.map((p) => [p.id, p]));

  let updated = 0;
  let skipped = 0;
  for (const c of chunks) {
    const entry = priceMap.get(c.gameId);
    if (!entry || !entry.deals?.length) {
      skipped++;
      continue;
    }
    const best = [...entry.deals].sort((a, b) => (a.price?.amountInt ?? Infinity) - (b.price?.amountInt ?? Infinity))[0];
    const bestCents = best.price?.amountInt ?? (best.price?.amount ? Math.round(best.price.amount * 100) : null);
    if (bestCents == null) {
      skipped++;
      continue;
    }
    const low = lows[c.gameId]?.history_low?.all;
    const lowCents = low?.amountInt ?? (low?.amount ? Math.round(low.amount * 100) : null);

    await prisma.externalDeal.upsert({
      where: { wishlistItemId: c.wishlistItemId },
      create: {
        wishlistItemId: c.wishlistItemId,
        bestShop: best.shop?.id ?? "unknown",
        bestShopName: best.shop?.name ?? best.shop?.id ?? "Unknown",
        bestPriceCents: bestCents,
        bestUrl: best.url ?? null,
        historicalLowCents: lowCents,
        historicalLowShop: low?.shop?.id ?? null,
        currency: best.price?.currency ?? null,
      },
      update: {
        bestShop: best.shop?.id ?? "unknown",
        bestShopName: best.shop?.name ?? best.shop?.id ?? "Unknown",
        bestPriceCents: bestCents,
        bestUrl: best.url ?? null,
        historicalLowCents: lowCents,
        historicalLowShop: low?.shop?.id ?? null,
        currency: best.price?.currency ?? null,
        fetchedAt: new Date(),
      },
    });
    updated++;
  }

  return { matched: chunks.length, updated, missing, skipped };
}
