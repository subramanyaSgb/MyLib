"use client";

import { useEffect, useState } from "react";
import { Cover } from "@/lib/design/cover";
import { Btn, Icon, StoreDot, Avatar, avatarHueFor } from "@/lib/design/primitives";
import type { DerivedAccount, DerivedGame } from "@/lib/design/derived";
import { STORE_PALETTE } from "@/lib/store-meta";

export function MergeModal({
  game,
  accounts,
  onClose,
  onComplete,
}: {
  game: DerivedGame;
  accounts: DerivedAccount[];
  onClose: () => void;
  onComplete: () => void;
}) {
  const accById = Object.fromEntries(accounts.map((a) => [a.id, a]));
  const owners = game.allOwners;
  const recommended = [...owners].sort((a, b) => b.hours - a.hours)[0];

  const [step, setStep] = useState<0 | 1>(0);
  const [primaryAccId, setPrimaryAccId] = useState<string>(
    game.mergedPrimaryAccountId ?? recommended?.acc ?? owners[0].acc,
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function commit() {
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/games/${game.id}/consolidate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ primaryAccountId: primaryAccId }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(typeof j.error === "string" ? j.error : "Merge failed");
      return;
    }
    onComplete();
  }

  const primaryOwner = owners.find((o) => o.acc === primaryAccId)!;
  const secondariesCount = owners.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
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
          width: "min(640px, 100%)",
          background: "var(--bg-2)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          overflow: "hidden",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", gap: 14, padding: 22, borderBottom: "1px solid var(--border)" }}>
          <Cover game={{ title: game.title, dev: game.dev, coverUrl: game.coverUrl }} w={64} h={86} showTitle={false} radius={4} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="eyebrow" style={{ marginBottom: 4 }}>
              Consolidate {owners.length} copies
            </div>
            <div
              style={{
                fontSize: 22,
                fontFamily: "var(--font-serif)",
                fontWeight: 500,
                letterSpacing: -0.4,
                lineHeight: 1.15,
              }}
            >
              Merge <span style={{ fontStyle: "italic" }}>{game.title}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-faint)",
              padding: 4,
              alignSelf: "flex-start",
            }}
          >
            <Icon name="close" size={14} />
          </button>
        </div>

        <div style={{ padding: 22, overflowY: "auto", flex: 1 }}>
          {step === 0 ? (
            <>
              <div className="eyebrow" style={{ marginBottom: 10 }}>Set primary copy</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {owners.map((o) => {
                  const a = accById[o.acc];
                  const s = STORE_PALETTE[o.storeId];
                  const isRec = o === recommended;
                  const sel = primaryAccId === o.acc;
                  return (
                    <label
                      key={o.acc}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: 12,
                        border: `1px solid ${sel ? "var(--accent)" : "var(--border)"}`,
                        background: sel ? "var(--accent-soft)" : "var(--bg-3)",
                        borderRadius: 6,
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="radio"
                        name="primary"
                        checked={sel}
                        onChange={() => setPrimaryAccId(o.acc)}
                        style={{ accentColor: "var(--accent)" }}
                      />
                      <StoreDot id={o.storeId} size={20} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>
                          {s?.name ?? o.storeId}
                          {isRec && (
                            <span
                              style={{
                                fontSize: 9,
                                marginLeft: 8,
                                padding: "1px 6px",
                                background: "var(--accent)",
                                color: "var(--accent-ink)",
                                borderRadius: 3,
                                fontWeight: 700,
                                letterSpacing: 1,
                                verticalAlign: "middle",
                              }}
                            >
                              RECOMMENDED
                            </span>
                          )}
                        </div>
                        {a && (
                          <div
                            style={{
                              fontSize: 11.5,
                              color: "var(--text-faint)",
                              marginTop: 3,
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <Avatar hue={avatarHueFor(a.id)} size={12} label={a.handle[0] ?? "?"} />
                            <span>@{a.handle}</span>
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: 13, color: "var(--text-soft)" }} className="tnum">
                        {o.hours.toFixed(1)}h
                      </div>
                    </label>
                  );
                })}
              </div>
              {err && <div style={{ marginTop: 10, color: "var(--danger)", fontSize: 12 }}>{err}</div>}
            </>
          ) : (
            <div
              style={{
                padding: 18,
                border: "1px solid var(--accent)",
                background: "var(--accent-soft)",
                borderRadius: 8,
              }}
            >
              <div className="eyebrow" style={{ color: "var(--accent)", marginBottom: 8 }}>
                After merge
              </div>
              <div
                style={{
                  fontSize: 18,
                  fontFamily: "var(--font-serif)",
                  letterSpacing: -0.3,
                  lineHeight: 1.3,
                  marginBottom: 10,
                }}
              >
                <span style={{ fontStyle: "italic" }}>{game.title}</span> appears as <em>one game</em>.
              </div>
              <div style={{ fontSize: 13, color: "var(--text-soft)", lineHeight: 1.5 }}>
                Primary: <strong style={{ color: "var(--text)" }}>{STORE_PALETTE[primaryOwner.storeId]?.name}</strong>
                {accById[primaryOwner.acc] && (
                  <> · <span>@{accById[primaryOwner.acc].handle}</span></>
                )}<br />
                Total playtime aggregated:{" "}
                <span className="tnum" style={{ color: "var(--accent)", fontWeight: 600 }}>
                  {game.totalHours.toFixed(1)}h
                </span>
                <br />
                {secondariesCount} secondary {secondariesCount === 1 ? "copy" : "copies"} kept, hidden from main grid.
              </div>
              {err && <div style={{ marginTop: 10, color: "var(--danger)", fontSize: 12 }}>{err}</div>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 22px",
            borderTop: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          {step === 0 ? (
            <>
              <Btn ghost onClick={onClose}>Cancel</Btn>
              <Btn primary onClick={() => setStep(1)}>Preview merge →</Btn>
            </>
          ) : (
            <>
              <Btn ghost icon="back" onClick={() => setStep(0)}>Back</Btn>
              <Btn primary icon="check" onClick={commit} disabled={busy}>
                {busy ? "Merging…" : "Merge now"}
              </Btn>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
