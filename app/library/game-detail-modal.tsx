"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Cover } from "@/lib/design/cover";
import { Btn, StoreDot, Avatar, avatarHueFor, Icon } from "@/lib/design/primitives";
import type { DerivedAccount, DerivedGame } from "@/lib/design/derived";
import { STORE_PALETTE } from "@/lib/store-meta";

export function GameDetailModal({
  game,
  accounts,
  onClose,
  onMerge,
}: {
  game: DerivedGame;
  accounts: DerivedAccount[];
  onClose: () => void;
  onMerge: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const accById = Object.fromEntries(accounts.map((a) => [a.id, a]));
  const totalHours = game.totalHours;
  const copiesCount = game.ownedBy.length;
  const combinedValue = (copiesCount * game.price).toFixed(0);
  const top = [...game.ownedBy].sort((a, b) => b.hours - a.hours)[0];

  async function toggleFavorite() {
    await fetch(`/api/games/${game.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isFavorite: !game.isFavorite }),
    });
    router.refresh();
  }
  async function toggleHidden() {
    await fetch(`/api/games/${game.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isHidden: !game.isHidden }),
    });
    router.refresh();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        animation: "fadeIn 0.18s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(920px, 100%)",
          maxHeight: "92vh",
          background: "var(--bg-2)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          overflow: "hidden",
          display: "grid",
          gridTemplateColumns: "360px 1fr",
        }}
      >
        {/* Cover panel */}
        <div style={{ position: "relative", minHeight: 480 }}>
          <Cover game={{ title: game.title, dev: game.dev, coverUrl: game.coverUrl }} w="100%" h="100%" showTitle={false} radius={0} />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.85) 100%)",
            }}
          />
          <div style={{ position: "absolute", left: 22, right: 22, bottom: 22, color: "#fff" }}>
            <div className="eyebrow" style={{ marginBottom: 6, color: "rgba(255,255,255,0.75)" }}>
              {[game.year, game.genre].filter(Boolean).join(" · ") || "Game"}
            </div>
            <div
              style={{
                fontSize: 28,
                fontFamily: "var(--font-serif)",
                fontWeight: 500,
                letterSpacing: -0.4,
                lineHeight: 1.1,
              }}
            >
              {game.title}
              {game.isFavorite && <span style={{ marginLeft: 8, color: "#ffd56b" }}>★</span>}
            </div>
            {game.dev && (
              <div style={{ fontSize: 13, opacity: 0.7, marginTop: 6 }}>{game.dev}</div>
            )}
          </div>
        </div>

        {/* Content */}
        <div style={{ display: "flex", flexDirection: "column", maxHeight: "92vh", overflow: "hidden" }}>
          <div style={{ padding: 24, overflowY: "auto", flex: 1 }}>
            {/* Stat blocks */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              <Stat label="Total playtime" value={`${totalHours.toFixed(1)}h`} accent={totalHours > 0} />
              <Stat label="Copies" value={String(copiesCount)} accent={copiesCount > 1} />
              <Stat label="Combined value" value={`$${combinedValue}`} accent={copiesCount > 1} />
            </div>

            {/* Merge nudge */}
            {copiesCount > 1 && (
              <div
                style={{
                  marginTop: 20,
                  padding: 16,
                  border: "1px solid var(--accent)",
                  background: "var(--accent-soft)",
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <span style={{ color: "var(--accent)", display: "flex" }}>
                  <Icon name="sparkle" size={16} />
                </span>
                <div style={{ flex: 1, fontSize: 13, lineHeight: 1.5 }}>
                  <strong>You own this {copiesCount} times.</strong>{" "}
                  Merge to consolidate playtime and clean up your shelf.
                </div>
                <Btn primary sm icon="check" onClick={onMerge}>
                  Merge
                </Btn>
              </div>
            )}

            {/* Copies list */}
            <div style={{ marginTop: 24 }}>
              <div className="eyebrow" style={{ marginBottom: 10 }}>Owned by</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {game.ownedBy.map((o, i) => {
                  const a = accById[o.acc];
                  const s = STORE_PALETTE[o.storeId];
                  const isTop = top && o.acc === top.acc && o.hours > 0;
                  return (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: 12,
                        border: `1px solid ${isTop ? "var(--accent)" : "var(--border)"}`,
                        background: isTop ? "var(--accent-soft)" : "var(--bg-3)",
                        borderRadius: 6,
                      }}
                    >
                      <StoreDot id={o.storeId} size={20} />
                      <div style={{ minWidth: 110 }}>
                        <div style={{ fontSize: 12, color: "var(--text)", fontWeight: 500 }}>
                          {s?.name ?? o.storeId}
                        </div>
                        {a && (
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
                            <Avatar hue={avatarHueFor(a.id)} size={12} label={a.handle[0] ?? "?"} />
                            <span>@{a.handle}</span>
                            {a.primary && (
                              <span
                                style={{
                                  fontSize: 8,
                                  padding: "1px 4px",
                                  background: "var(--accent)",
                                  color: "var(--accent-ink)",
                                  borderRadius: 2,
                                  fontWeight: 700,
                                  letterSpacing: 0.5,
                                  marginLeft: 4,
                                }}
                              >
                                PRI
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 11.5,
                            color: "var(--text-faint)",
                            fontFamily: "var(--font-sans)",
                          }}
                        >
                          {o.lastPlayed}
                        </div>
                        {o.achievements && (
                          <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                            <div
                              style={{
                                flex: 1,
                                height: 4,
                                background: "var(--border)",
                                borderRadius: 2,
                                overflow: "hidden",
                                maxWidth: 120,
                              }}
                            >
                              <div
                                style={{
                                  width: `${o.achievementsPct ?? 0}%`,
                                  height: "100%",
                                  background: "var(--accent)",
                                }}
                              />
                            </div>
                            <span
                              style={{ fontSize: 10.5, color: "var(--text-faint)" }}
                              className="tnum"
                            >
                              {o.achievements} · {o.achievementsPct}%
                            </span>
                          </div>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          color: o.hours > 0 ? "var(--text)" : "var(--text-faint)",
                          minWidth: 60,
                          textAlign: "right",
                        }}
                        className="tnum"
                      >
                        {o.hours > 0 ? `${o.hours.toFixed(1)}h` : "—"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div
            style={{
              padding: "14px 24px",
              borderTop: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              gap: 8,
              background: "var(--bg-2)",
            }}
          >
            <div style={{ display: "flex", gap: 8 }}>
              <Btn sm onClick={toggleFavorite}>
                {game.isFavorite ? "★ Unfavorite" : "☆ Favorite"}
              </Btn>
              <Btn sm onClick={toggleHidden}>
                {game.isHidden ? "Unhide" : "Hide"}
              </Btn>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {copiesCount > 1 && (
                <Btn sm primary icon="check" onClick={onMerge}>
                  Merge copies
                </Btn>
              )}
              <Btn sm onClick={onClose}>Close</Btn>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      style={{
        padding: 14,
        background: "var(--bg-3)",
        border: "1px solid var(--border)",
        borderRadius: 6,
      }}
    >
      <div className="eyebrow">{label}</div>
      <div
        style={{
          marginTop: 6,
          fontSize: 22,
          fontFamily: "var(--font-serif)",
          fontWeight: 500,
          color: accent ? "var(--accent)" : "var(--text)",
          letterSpacing: -0.4,
          lineHeight: 1,
        }}
        className="tnum"
      >
        {value}
      </div>
    </div>
  );
}
