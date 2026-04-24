import { prisma } from "@/lib/db";

export async function GET() {
  const alerts = await prisma.priceAlert.findMany({
    where: { dismissedAt: null },
    orderBy: { firedAt: "desc" },
    include: {
      wishlistItem: {
        select: {
          id: true,
          storeId: true,
          title: true,
          coverUrl: true,
          storeUrl: true,
          currency: true,
          currentPriceCents: true,
          fullPriceCents: true,
          targetPriceCents: true,
          account: { select: { id: true, label: true, displayName: true } },
        },
      },
    },
  });
  return Response.json({
    alerts: alerts.map((a) => ({
      id: a.id,
      kind: a.kind,
      priceCents: a.priceCents,
      targetCents: a.targetCents,
      prevLowCents: a.prevLowCents,
      currency: a.currency,
      firedAt: a.firedAt.toISOString(),
      item: a.wishlistItem,
    })),
  });
}
