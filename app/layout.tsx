import type { Metadata } from "next";
import "./globals.css";
import { prisma } from "@/lib/db";
import { getAccounts, getGames, computeTotals } from "@/lib/design/derived";
import { Sidebar } from "@/lib/design/sidebar";
import { TopChrome } from "@/lib/design/top-chrome";

export const metadata: Metadata = {
  title: "Mylibrary — unified game library",
  description: "One library across every store you've ever used.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const accountCount = await prisma.account.count();

  // Empty state: no shell, just children fill the screen.
  if (accountCount === 0) {
    return (
      <html lang="en" data-accent="amber">
        <body>{children}</body>
      </html>
    );
  }

  const [accounts, games] = await Promise.all([getAccounts(), getGames({})]);
  const totals = computeTotals(games);

  // Per-store game counts (for sidebar badges).
  const storeGameCounts: Record<string, number> = {};
  for (const g of games) {
    const seen = new Set<string>();
    for (const o of g.ownedBy) {
      if (seen.has(o.storeId)) continue;
      seen.add(o.storeId);
      storeGameCounts[o.storeId] = (storeGameCounts[o.storeId] ?? 0) + 1;
    }
  }

  const lastSyncAt = accounts
    .map((a) => a.lastSyncAt)
    .filter((d): d is Date => !!d)
    .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

  return (
    <html lang="en" data-accent="amber">
      <body>
        <div style={{ display: "grid", gridTemplateColumns: "248px 1fr", minHeight: "100vh" }}>
          <Sidebar
            accounts={accounts.map((a) => ({
              id: a.id,
              storeId: a.storeId,
              handle: a.handle,
              primary: a.primary,
              gameCount: a.gameCount,
            }))}
            stats={{
              totalHours: totals.totalHours,
              totalGames: totals.totalGames,
              totalCopies: totals.totalCopies,
              duplicateCount: totals.duplicates.length,
            }}
            storeGameCounts={storeGameCounts}
          />
          <main style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <TopChrome
              accounts={accounts.map((a) => ({ id: a.id, handle: a.handle }))}
              lastSyncAt={lastSyncAt}
            />
            <div className="page-enter" style={{ flex: 1 }}>
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
