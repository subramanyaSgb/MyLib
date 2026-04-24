import { prisma } from "@/lib/db";
import { getAccounts, getGames, computeTotals, maxPlayedAccount } from "@/lib/design/derived";
import { EmptyState } from "@/lib/design/empty-state";
import { HomeView } from "./home-view";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const accountCount = await prisma.account.count();
  if (accountCount === 0) return <EmptyState />;

  const [accounts, games, onSale, biggestSale] = await Promise.all([
    getAccounts(),
    getGames({}),
    prisma.wishlistItem.count({ where: { isOnSale: true } }),
    prisma.wishlistItem.findFirst({
      where: { isOnSale: true },
      orderBy: { discountPct: "desc" },
      select: { title: true, discountPct: true },
    }),
  ]);
  const totals = computeTotals(games);

  const recent = [...games]
    .filter((g) => g.ownedBy.some((o) => o.lastPlayedAt))
    .sort((a, b) => {
      const ta = Math.max(0, ...a.ownedBy.map((o) => (o.lastPlayedAt ? o.lastPlayedAt.getTime() : 0)));
      const tb = Math.max(0, ...b.ownedBy.map((o) => (o.lastPlayedAt ? o.lastPlayedAt.getTime() : 0)));
      return tb - ta;
    })
    .slice(0, 5);

  const topDupe = totals.duplicates[0] ?? null;

  return (
    <HomeView
      accounts={accounts}
      games={games}
      totals={totals}
      onSaleCount={onSale}
      biggestSale={biggestSale ? { title: biggestSale.title, discountPct: biggestSale.discountPct ?? 0 } : null}
      recent={recent.map((g) => {
        const top = maxPlayedAccount(g);
        return {
          id: g.id,
          title: g.title,
          dev: g.dev,
          coverUrl: g.coverUrl,
          ownedStoreIds: g.ownedBy.map((o) => o.storeId),
          topHours: top.hours,
          topLastPlayed: top.lastPlayed,
        };
      })}
      topDupe={
        topDupe
          ? {
              id: topDupe.id,
              title: topDupe.title,
              dev: topDupe.dev,
              coverUrl: topDupe.coverUrl,
              copies: topDupe.ownedBy.map((o) => ({ acc: o.acc, storeId: o.storeId, hours: o.hours })),
            }
          : null
      }
    />
  );
}
