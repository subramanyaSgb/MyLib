import { getActiveFreeOffers } from "@/lib/free-offers";

export async function GET() {
  const offers = await getActiveFreeOffers();
  return Response.json({
    offers: offers.map((o) => ({
      id: o.id,
      storeId: o.storeId,
      externalId: o.externalId,
      title: o.title,
      coverUrl: o.coverUrl,
      url: o.url,
      offerType: o.offerType,
      startsAt: o.startsAt?.toISOString() ?? null,
      endsAt: o.endsAt?.toISOString() ?? null,
      originalCents: o.originalCents,
      currency: o.currency,
      fetchedAt: o.fetchedAt.toISOString(),
    })),
  });
}
