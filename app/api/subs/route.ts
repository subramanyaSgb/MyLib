import { prisma } from "@/lib/db";
import { ensureKnownSubs } from "@/lib/subscriptions";

export async function GET() {
  await ensureKnownSubs();
  const subs = await prisma.subscription.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { catalog: true } } },
  });
  return Response.json({
    subs: subs.map((s) => ({
      id: s.id,
      name: s.name,
      storeHint: s.storeHint,
      monthlyCostCents: s.monthlyCostCents,
      currency: s.currency,
      isActive: s.isActive,
      refreshedAt: s.refreshedAt?.toISOString() ?? null,
      catalogSize: s._count.catalog,
    })),
  });
}
