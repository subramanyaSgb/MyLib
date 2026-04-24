import { prisma } from "@/lib/db";
import { PageHeader } from "@/lib/design/primitives";
import { WishlistView } from "./wishlist-view";

export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  const items = await prisma.wishlistItem.findMany({
    orderBy: [{ isOnSale: "desc" }, { discountPct: "desc" }, { title: "asc" }],
    include: {
      account: { select: { id: true, storeId: true, label: true, displayName: true } },
    },
  });

  const onSaleCount = items.filter((i) => i.isOnSale).length;
  const belowTargetCount = items.filter(
    (i) => i.targetPriceCents != null && i.currentPriceCents != null && i.currentPriceCents <= i.targetPriceCents,
  ).length;

  return (
    <div>
      <PageHeader
        eyebrow="Track + alert"
        title={
          <>
            Wishlist —{" "}
            <span style={{ color: "var(--accent)", fontStyle: "italic" }} className="tnum">
              {items.length} games
            </span>
          </>
        }
        subtitle={
          items.length === 0
            ? "No wishlist items synced yet. Hit Sync to pull from Steam + GOG."
            : `${onSaleCount} on sale · ${belowTargetCount} below your target.`
        }
      />
      <WishlistView
        items={items.map((i) => ({
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
          accountLabel: i.account.displayName ?? i.account.label,
          addedAt: i.addedAt.toISOString(),
        }))}
      />
    </div>
  );
}
