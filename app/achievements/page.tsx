import Link from "next/link";
import { prisma } from "@/lib/db";
import { Cover } from "@/lib/design/cover";
import { PageHeader, StoreDot, Btn } from "@/lib/design/primitives";
import { STORE_PALETTE } from "@/lib/store-meta";

export const dynamic = "force-dynamic";

export default async function AchievementsPage() {
  // Pull every OwnedCopy with achievement data, group by canonical Game,
  // pick the highest-percentage copy per game.
  const copies = await prisma.ownedCopy.findMany({
    where: { achievementsTotal: { not: null, gt: 0 } },
    include: {
      gameOnStore: { include: { game: true } },
      account: { select: { id: true, storeId: true, label: true, displayName: true } },
    },
  });

  type Row = {
    gameId: string;
    title: string;
    coverUrl: string | null;
    storeId: string;
    accountLabel: string;
    unlocked: number;
    total: number;
    pct: number;
  };

  const bestByGame = new Map<string, Row>();
  for (const c of copies) {
    const total = c.achievementsTotal ?? 0;
    if (total === 0) continue;
    const unlocked = c.achievementsUnlocked ?? 0;
    const pct = Math.round((unlocked / total) * 100);
    const cur = bestByGame.get(c.gameOnStore.gameId);
    if (!cur || pct > cur.pct) {
      bestByGame.set(c.gameOnStore.gameId, {
        gameId: c.gameOnStore.gameId,
        title: c.gameOnStore.game.title,
        coverUrl: c.gameOnStore.game.coverUrl,
        storeId: c.account.storeId,
        accountLabel: c.account.displayName ?? c.account.label,
        unlocked,
        total,
        pct,
      });
    }
  }

  const rows = [...bestByGame.values()].sort((a, b) => b.pct - a.pct);
  const grandUnlocked = rows.reduce((s, r) => s + r.unlocked, 0);
  const grandTotal = rows.reduce((s, r) => s + r.total, 0);

  return (
    <div>
      <PageHeader
        eyebrow="Cross-account aggregate"
        title={
          <>
            <span className="tnum">{grandUnlocked.toLocaleString()}</span>
            <span style={{ color: "var(--text-faint)" }}> / {grandTotal.toLocaleString()}</span> achievements
          </>
        }
        subtitle="When you own a game on multiple accounts, we show the copy with the highest unlock %. Steam-only for now — other stores coming soon."
        right={
          <form action="/api/backfill" method="post">
            <Btn primary type="submit">
              Refresh achievements
            </Btn>
          </form>
        }
      />

      {rows.length === 0 ? (
        <div style={{ padding: "60px 40px", textAlign: "center", color: "var(--text-faint)" }}>
          No achievements synced yet. Hit{" "}
          <code style={{ color: "var(--accent)" }}>POST /api/backfill?onlyAch=1&includeUnplayed=1</code>{" "}
          to fetch from Steam.
        </div>
      ) : (
        <div
          style={{
            padding: "24px 40px 60px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 14,
          }}
        >
          {rows.map((r) => {
            const m = STORE_PALETTE[r.storeId];
            return (
              <Link
                key={r.gameId}
                href={`/library?game=${r.gameId}`}
                style={{
                  display: "flex",
                  gap: 12,
                  padding: 12,
                  border: "1px solid var(--border)",
                  background: "var(--bg-2)",
                  borderRadius: 8,
                  textDecoration: "none",
                  color: "inherit",
                }}
                className="hover-lift"
              >
                <Cover game={{ title: r.title, dev: null, coverUrl: r.coverUrl }} w={48} h={64} showTitle={false} radius={3} />
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        fontFamily: "var(--font-serif)",
                        color: "var(--text)",
                        letterSpacing: -0.2,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={r.title}
                    >
                      {r.title}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-faint)",
                        marginTop: 2,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <StoreDot id={r.storeId} size={10} /> Best on {m?.name ?? r.storeId} · @{r.accountLabel}
                    </div>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <div
                      style={{
                        height: 6,
                        background: "var(--border)",
                        borderRadius: 3,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${r.pct}%`,
                          height: "100%",
                          background: r.pct === 100 ? "var(--accent)" : "var(--accent)",
                        }}
                      />
                    </div>
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 11,
                        color: "var(--text-soft)",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                      className="tnum"
                    >
                      <span>{r.unlocked} / {r.total}</span>
                      <span style={{ color: "var(--accent)", fontWeight: 600 }}>{r.pct}%</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
