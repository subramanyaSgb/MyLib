import { prisma } from "@/lib/db";
import { PageHeader } from "@/lib/design/primitives";
import { WishlistView } from "./wishlist-view";
import { getSubCoverageForWishlist } from "@/lib/subscriptions";

export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  const [items, subCoverage, epicAccountCount] = await Promise.all([
    prisma.wishlistItem.findMany({
      orderBy: [{ isOnSale: "desc" }, { discountPct: "desc" }, { title: "asc" }],
      include: {
        account: { select: { id: true, storeId: true, label: true, displayName: true } },
        externalDeal: true,
      },
    }),
    getSubCoverageForWishlist(),
    prisma.account.count({ where: { storeId: "epic" } }),
  ]);

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
      {epicAccountCount > 0 && (
        <div
          style={{
            margin: "0 40px",
            padding: "10px 14px",
            border: "1px dashed var(--border)",
            borderRadius: 6,
            fontSize: 12,
            color: "var(--text-faint)",
            fontFamily: "var(--font-sans)",
            lineHeight: 1.5,
          }}
        >
          <b style={{ color: "var(--text-soft)" }}>Epic wishlist not synced.</b> Epic's wishlist API sits behind storefront cookies that the launcher OAuth we use doesn't cover — Steam + GOG only for now.
        </div>
      )}
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
          externalDeal: i.externalDeal
            ? {
                bestShop: i.externalDeal.bestShop,
                bestShopName: i.externalDeal.bestShopName,
                bestPriceCents: i.externalDeal.bestPriceCents,
                bestUrl: i.externalDeal.bestUrl,
                historicalLowCents: i.externalDeal.historicalLowCents,
                historicalLowShop: i.externalDeal.historicalLowShop,
                currency: i.externalDeal.currency,
              }
            : null,
          subCoverage: (subCoverage[i.id] ?? []).map((h) => ({
            subscriptionId: h.subscriptionId,
            subscriptionName: h.subscriptionName,
          })),
        }))}
      />
    </div>
  );
}
