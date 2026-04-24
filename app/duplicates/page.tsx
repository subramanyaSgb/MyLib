import Link from "next/link";
import { getAccounts, getGames, computeTotals } from "@/lib/design/derived";
import { Cover } from "@/lib/design/cover";
import { Btn, PageHeader, StoreDot, Avatar, avatarHueFor } from "@/lib/design/primitives";
import { STORE_PALETTE } from "@/lib/store-meta";

export const dynamic = "force-dynamic";

export default async function DuplicatesPage() {
  const [accounts, games] = await Promise.all([getAccounts(), getGames({ showHidden: true })]);
  const totals = computeTotals(games);
  const accById = Object.fromEntries(accounts.map((a) => [a.id, a]));
  const sorted = [...totals.duplicates].sort((a, b) => b.allOwners.length - a.allOwners.length);

  return (
    <div>
      <PageHeader
        eyebrow="The one that pays for itself"
        title={
          <>
            Duplicates —{" "}
            <span style={{ color: "var(--accent)", fontStyle: "italic" }} className="tnum">
              {totals.duplicates.length} games
            </span>
          </>
        }
        subtitle={`You spent roughly $${totals.dupeSavings.toFixed(0)} buying these games more than once. Merge to consolidate playtime into your primary copy.`}
      />
      {sorted.length === 0 ? (
        <div style={{ padding: "60px 40px", textAlign: "center", color: "var(--text-faint)" }}>
          No duplicates yet. Add another account on a store you already use to find overlaps.
        </div>
      ) : (
        <div style={{ padding: "24px 40px 60px", display: "flex", flexDirection: "column", gap: 14 }}>
          {sorted.map((g) => {
            const best = g.allOwners.reduce((a, o) => (o.hours > a.hours ? o : a), g.allOwners[0]);
            const waste = (g.allOwners.length - 1) * g.price;
            return (
              <div
                key={g.id}
                style={{
                  display: "flex",
                  gap: 20,
                  padding: 18,
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  background: "var(--bg-2)",
                }}
              >
                <Cover game={{ title: g.title, dev: g.dev, coverUrl: g.coverUrl }} w={90} h={120} radius={4} />
                <div style={{ flex: 1, fontFamily: "var(--font-sans)", minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
                    <div
                      style={{
                        fontSize: 18,
                        fontFamily: "var(--font-serif)",
                        color: "var(--text)",
                        letterSpacing: -0.3,
                      }}
                    >
                      {g.title}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        padding: "2px 7px",
                        background: "var(--accent-soft)",
                        color: "var(--accent)",
                        borderRadius: 3,
                        fontWeight: 700,
                        letterSpacing: 1,
                      }}
                    >
                      ×{g.allOwners.length} COPIES
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 12 }}>
                    {[g.dev, g.genre, g.year].filter(Boolean).join(" · ") || "Owned multiple times across your accounts"}
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: `repeat(${g.allOwners.length}, 1fr)`,
                      gap: 1,
                      background: "var(--border)",
                      borderRadius: 4,
                      overflow: "hidden",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {g.allOwners.map((o, i) => {
                      const a = accById[o.acc];
                      const s = STORE_PALETTE[o.storeId];
                      const isBest = o === best && o.hours > 0;
                      return (
                        <div
                          key={i}
                          style={{
                            padding: "10px 12px",
                            background: isBest ? "var(--accent-soft)" : "var(--bg-3)",
                            position: "relative",
                          }}
                        >
                          {isBest && (
                            <div
                              style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                right: 0,
                                height: 2,
                                background: "var(--accent)",
                              }}
                            />
                          )}
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                            <StoreDot id={o.storeId} size={14} />
                            <span style={{ fontSize: 11, color: "var(--text)", fontWeight: 500 }}>
                              {s?.name ?? o.storeId}
                            </span>
                            {isBest && (
                              <span
                                style={{
                                  fontSize: 8,
                                  padding: "1px 4px",
                                  background: "var(--accent)",
                                  color: "var(--accent-ink)",
                                  borderRadius: 2,
                                  fontWeight: 700,
                                  letterSpacing: 0.5,
                                  marginLeft: "auto",
                                }}
                              >
                                PRIMARY
                              </span>
                            )}
                          </div>
                          {a && (
                            <div
                              style={{
                                fontSize: 10.5,
                                color: "var(--text-faint)",
                                marginBottom: 4,
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <Avatar hue={avatarHueFor(a.id)} size={11} label={a.handle[0] ?? "?"} />
                              <span>@{a.handle}</span>
                            </div>
                          )}
                          <div
                            style={{
                              fontSize: 13,
                              color: o.hours > 0 ? "var(--text)" : "var(--text-faint)",
                            }}
                            className="tnum"
                          >
                            {o.hours > 0 ? `${o.hours.toFixed(1)}h` : "—"}
                          </div>
                          <div style={{ fontSize: 10.5, color: "var(--text-faint)", marginTop: 2 }}>
                            {o.lastPlayed}
                          </div>
                          {o.achievements && (
                            <div
                              style={{
                                fontSize: 10,
                                color: "var(--text-faint)",
                                marginTop: 4,
                              }}
                              className="tnum"
                            >
                              🏆 {o.achievements}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div
                  style={{
                    width: 130,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    fontFamily: "var(--font-sans)",
                    textAlign: "right",
                  }}
                >
                  <div>
                    <div className="eyebrow">Redundant spend</div>
                    <div
                      style={{
                        fontSize: 22,
                        fontFamily: "var(--font-serif)",
                        color: "var(--accent)",
                        letterSpacing: -0.4,
                        marginTop: 4,
                      }}
                      className="tnum"
                    >
                      ${waste.toFixed(0)}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <Link
                      href={`/library?merge=${g.id}`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        padding: "5px 10px",
                        background: "var(--accent)",
                        color: "var(--accent-ink)",
                        borderRadius: 6,
                        fontSize: 11.5,
                        fontWeight: 600,
                        textDecoration: "none",
                      }}
                    >
                      Merge
                    </Link>
                    <Link
                      href={`/library?game=${g.id}`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "5px 10px",
                        color: "var(--text)",
                        borderRadius: 6,
                        fontSize: 11.5,
                        textDecoration: "none",
                        border: "1px solid transparent",
                      }}
                    >
                      Details →
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
