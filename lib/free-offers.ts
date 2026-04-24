import { prisma } from "./db";

export type RawOffer = {
  storeId: string;
  externalId: string;
  title: string;
  coverUrl: string | null;
  url: string;
  offerType: "free_keep" | "free_play" | "giveaway" | "perma_free";
  startsAt: Date | null;
  endsAt: Date | null;
  originalCents: number | null;
  currency: string | null;
};

const EPIC_FREE =
  "https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=en-US&country=US&allowCountries=US";

type EpicImg = { type?: string; url?: string };
type EpicPromoOffer = { startDate?: string; endDate?: string; discountSetting?: { discountPercentage?: number } };
type EpicPromo = {
  promotionalOffers?: Array<{ promotionalOffers?: EpicPromoOffer[] }>;
  upcomingPromotionalOffers?: Array<{ promotionalOffers?: EpicPromoOffer[] }>;
};
type EpicElement = {
  title?: string;
  id?: string;
  productSlug?: string | null;
  offerMappings?: Array<{ pageSlug?: string }>;
  catalogNs?: { mappings?: Array<{ pageSlug?: string }> };
  keyImages?: EpicImg[];
  price?: { totalPrice?: { originalPrice?: number; currencyCode?: string; discountPrice?: number } };
  promotions?: EpicPromo | null;
};

export async function fetchEpicFree(): Promise<RawOffer[]> {
  const r = await fetch(EPIC_FREE, { headers: { "user-agent": "playdex/1.0" } });
  if (!r.ok) throw new Error(`Epic free: HTTP ${r.status}`);
  const j = (await r.json()) as { data?: { Catalog?: { searchStore?: { elements?: EpicElement[] } } } };
  const elements: EpicElement[] = j.data?.Catalog?.searchStore?.elements ?? [];
  const offers: RawOffer[] = [];

  for (const el of elements) {
    const promos = el.promotions;
    if (!promos) continue;
    const active = promos.promotionalOffers?.[0]?.promotionalOffers?.[0];
    const upcoming = promos.upcomingPromotionalOffers?.[0]?.promotionalOffers?.[0];
    const pick = active ?? upcoming;
    if (!pick) continue;
    if ((pick.discountSetting?.discountPercentage ?? 100) !== 0) continue;

    const slug =
      el.offerMappings?.[0]?.pageSlug ??
      el.catalogNs?.mappings?.[0]?.pageSlug ??
      (typeof el.productSlug === "string" ? el.productSlug.split("/")[0] : null) ??
      el.id ??
      "";
    const url = slug ? `https://store.epicgames.com/en-US/p/${slug}` : "https://store.epicgames.com/en-US/free-games";
    const cover =
      el.keyImages?.find((i) => i.type === "OfferImageWide")?.url ??
      el.keyImages?.find((i) => i.type === "Thumbnail")?.url ??
      el.keyImages?.[0]?.url ??
      null;
    const startsAt = pick.startDate ? new Date(pick.startDate) : null;
    const endsAt = pick.endDate ? new Date(pick.endDate) : null;
    const originalCents = el.price?.totalPrice?.originalPrice ?? null;
    const currency = el.price?.totalPrice?.currencyCode ?? null;

    offers.push({
      storeId: "epic",
      externalId: el.id ?? slug,
      title: el.title ?? "Untitled",
      coverUrl: cover,
      url,
      offerType: active ? "free_keep" : "giveaway",
      startsAt,
      endsAt,
      originalCents,
      currency,
    });
  }
  return offers;
}

const GOG_FREE =
  "https://catalog.gog.com/v1/catalog?price=between%3A0%2C0&order=desc%3Atrending&productType=in%3Agame%2Cpack&countryCode=US&locale=en-US&currencyCode=USD&limit=24";

type GogProduct = {
  id: string;
  slug?: string;
  title: string;
  coverHorizontal?: string;
  storeLink?: string;
  price?: { finalMoney?: { amount?: string; currency?: string }; baseMoney?: { amount?: string } };
};

export async function fetchGogFree(): Promise<RawOffer[]> {
  const r = await fetch(GOG_FREE, { headers: { "user-agent": "playdex/1.0" } });
  if (!r.ok) throw new Error(`GOG free: HTTP ${r.status}`);
  const j = (await r.json()) as { products?: GogProduct[] };
  const list = j.products ?? [];
  return list.map<RawOffer>((p) => {
    const slug = p.slug ?? p.id;
    const amt = p.price?.baseMoney?.amount ? Math.round(parseFloat(p.price.baseMoney.amount) * 100) : null;
    return {
      storeId: "gog",
      externalId: String(p.id),
      title: p.title,
      coverUrl: p.coverHorizontal ?? null,
      url: p.storeLink ?? `https://www.gog.com/en/game/${slug}`,
      offerType: "perma_free",
      startsAt: null,
      endsAt: null,
      originalCents: amt,
      currency: p.price?.finalMoney?.currency ?? "USD",
    };
  });
}

export async function syncFreeOffers(): Promise<{ fetched: number; upserted: number; errors: string[] }> {
  const errors: string[] = [];
  const batches = await Promise.allSettled([fetchEpicFree(), fetchGogFree()]);
  const raw: RawOffer[] = [];
  for (const b of batches) {
    if (b.status === "fulfilled") raw.push(...b.value);
    else errors.push(String(b.reason));
  }

  let upserted = 0;
  for (const o of raw) {
    await prisma.freeOffer.upsert({
      where: { storeId_externalId: { storeId: o.storeId, externalId: o.externalId } },
      create: {
        storeId: o.storeId,
        externalId: o.externalId,
        title: o.title,
        coverUrl: o.coverUrl,
        url: o.url,
        offerType: o.offerType,
        startsAt: o.startsAt,
        endsAt: o.endsAt,
        originalCents: o.originalCents,
        currency: o.currency,
      },
      update: {
        title: o.title,
        coverUrl: o.coverUrl,
        url: o.url,
        offerType: o.offerType,
        startsAt: o.startsAt,
        endsAt: o.endsAt,
        originalCents: o.originalCents,
        currency: o.currency,
        fetchedAt: new Date(),
        dismissedAt: null,
      },
    });
    upserted++;
  }

  return { fetched: raw.length, upserted, errors };
}

export async function getActiveFreeOffers() {
  const now = new Date();
  return prisma.freeOffer.findMany({
    where: {
      dismissedAt: null,
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    },
    orderBy: [{ offerType: "asc" }, { endsAt: "asc" }, { fetchedAt: "desc" }],
  });
}
