import { prisma } from "./db";

export type SubDef = {
  id: string;
  name: string;
  storeHint: string | null;
  monthlyCostCents: number | null;
  currency: string | null;
};

export const KNOWN_SUBS: SubDef[] = [
  { id: "gamepass-pc",        name: "PC Game Pass",            storeHint: "xbox",        monthlyCostCents: 1199, currency: "USD" },
  { id: "gamepass-ultimate",  name: "Xbox Game Pass Ultimate", storeHint: "xbox",        monthlyCostCents: 1999, currency: "USD" },
  { id: "ps-plus-essential",  name: "PS Plus Essential",       storeHint: "playstation", monthlyCostCents: 999,  currency: "USD" },
  { id: "ps-plus-extra",      name: "PS Plus Extra",           storeHint: "playstation", monthlyCostCents: 1499, currency: "USD" },
  { id: "ps-plus-premium",    name: "PS Plus Premium",         storeHint: "playstation", monthlyCostCents: 1799, currency: "USD" },
  { id: "ea-play",            name: "EA Play",                 storeHint: "ea",          monthlyCostCents: 499,  currency: "USD" },
  { id: "ea-play-pro",        name: "EA Play Pro",             storeHint: "ea",          monthlyCostCents: 1499, currency: "USD" },
  { id: "ubisoft-plus",       name: "Ubisoft+ Classics",       storeHint: "ubisoft",     monthlyCostCents: 799,  currency: "USD" },
];

export async function ensureKnownSubs(): Promise<void> {
  for (const s of KNOWN_SUBS) {
    await prisma.subscription.upsert({
      where: { id: s.id },
      create: {
        id: s.id,
        name: s.name,
        storeHint: s.storeHint,
        monthlyCostCents: s.monthlyCostCents,
        currency: s.currency,
      },
      update: {
        name: s.name,
        storeHint: s.storeHint,
        monthlyCostCents: s.monthlyCostCents,
        currency: s.currency,
      },
    });
  }
}

export function normalizeTitle(t: string): string {
  return t
    .toLowerCase()
    .replace(/[™®©]/g, "")
    .replace(/[:\-–—_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function upsertCatalog(subscriptionId: string, titles: string[]): Promise<{ inserted: number; kept: number; removed: number }> {
  const normalized = titles.map((t) => ({ title: t, normTitle: normalizeTitle(t) }));
  const before = await prisma.subCatalogEntry.findMany({ where: { subscriptionId }, select: { id: true, normTitle: true } });
  const existing = new Map(before.map((e) => [e.normTitle, e.id]));

  const seen = new Set<string>();
  let inserted = 0;
  let kept = 0;
  for (const { title, normTitle } of normalized) {
    if (!normTitle || seen.has(normTitle)) continue;
    seen.add(normTitle);
    if (existing.has(normTitle)) {
      kept++;
      continue;
    }
    await prisma.subCatalogEntry.create({
      data: { subscriptionId, title, normTitle },
    });
    inserted++;
  }

  const toDrop = before.filter((e) => !seen.has(e.normTitle)).map((e) => e.id);
  if (toDrop.length) {
    await prisma.subCatalogEntry.deleteMany({ where: { id: { in: toDrop } } });
  }
  await prisma.subscription.update({ where: { id: subscriptionId }, data: { refreshedAt: new Date() } });
  return { inserted, kept, removed: toDrop.length };
}

export type SubCoverageHit = {
  subscriptionId: string;
  subscriptionName: string;
  catalogEntryId: string;
  title: string;
};

export async function getSubCoverageForWishlist(): Promise<Record<string, SubCoverageHit[]>> {
  const activeSubs = await prisma.subscription.findMany({
    where: { isActive: true },
    include: { catalog: true },
  });
  if (activeSubs.length === 0) return {};

  const wishlist = await prisma.wishlistItem.findMany({ select: { id: true, title: true } });
  const hitsByItem: Record<string, SubCoverageHit[]> = {};
  for (const w of wishlist) {
    const nt = normalizeTitle(w.title);
    for (const sub of activeSubs) {
      const entry = sub.catalog.find((c) => c.normTitle === nt);
      if (!entry) continue;
      (hitsByItem[w.id] ??= []).push({
        subscriptionId: sub.id,
        subscriptionName: sub.name,
        catalogEntryId: entry.id,
        title: entry.title,
      });
    }
  }
  return hitsByItem;
}
