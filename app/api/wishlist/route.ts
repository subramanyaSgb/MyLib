import { prisma } from "@/lib/db";

export async function GET() {
  const items = await prisma.wishlistItem.findMany({
    orderBy: [{ isOnSale: "desc" }, { discountPct: "desc" }, { title: "asc" }],
    include: {
      account: { select: { id: true, storeId: true, label: true, displayName: true } },
      game: { select: { id: true, dev: true, genre: true, releaseYear: true } },
    },
  });
  return Response.json({
    items: items.map((i) => ({
      id: i.id,
      storeId: i.storeId,
      storeGameId: i.storeGameId,
      title: i.title,
      coverUrl: i.coverUrl,
      storeUrl: i.storeUrl,
      fullPriceCents: i.fullPriceCents,
      currentPriceCents: i.currentPriceCents,
      discountPct: i.discountPct,
      currency: i.currency,
      isOnSale: i.isOnSale,
      targetPriceCents: i.targetPriceCents,
      addedAt: i.addedAt.toISOString(),
      account: i.account,
      game: i.game,
    })),
  });
}
