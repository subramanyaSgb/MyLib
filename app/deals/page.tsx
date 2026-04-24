import { getActiveFreeOffers } from "@/lib/free-offers";
import { PageHeader } from "@/lib/design/primitives";
import { DealsView } from "./deals-view";

export const dynamic = "force-dynamic";

export default async function DealsPage() {
  const offers = await getActiveFreeOffers();
  const keep = offers.filter((o) => o.offerType === "free_keep" || o.offerType === "giveaway");
  const perma = offers.filter((o) => o.offerType === "perma_free");

  return (
    <div>
      <PageHeader
        eyebrow="Claim + save"
        title={
          <>
            Free games —{" "}
            <span style={{ color: "var(--accent)", fontStyle: "italic" }} className="tnum">
              {offers.length} live
            </span>
          </>
        }
        subtitle={
          offers.length === 0
            ? "Hit refresh to pull Epic weekly + GOG perma-free."
            : `${keep.length} time-limited · ${perma.length} always free on GOG.`
        }
      />
      <DealsView
        offers={offers.map((o) => ({
          id: o.id,
          storeId: o.storeId,
          title: o.title,
          coverUrl: o.coverUrl,
          url: o.url,
          offerType: o.offerType,
          startsAt: o.startsAt?.toISOString() ?? null,
          endsAt: o.endsAt?.toISOString() ?? null,
          originalCents: o.originalCents,
          currency: o.currency,
        }))}
      />
    </div>
  );
}
