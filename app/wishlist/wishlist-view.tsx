"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Cover } from "@/lib/design/cover";
import { Btn, StoreDot, Icon } from "@/lib/design/primitives";
import { STORE_PALETTE } from "@/lib/store-meta";

type ExternalDeal = {
  bestShop: string;
  bestShopName: string;
  bestPriceCents: number;
  bestUrl: string | null;
  historicalLowCents: number | null;
  historicalLowShop: string | null;
  currency: string | null;
};

type SubCoverage = {
  subscriptionId: string;
  subscriptionName: string;
};

type Item = {
  id: string;
  storeId: string;
  storeGameId: string;
  title: string;
  coverUrl: string | null;
  storeUrl: string | null;
  fullPriceCents: number | null;
  currentPriceCents: number | null;
  discountPct: number | null;
  currency: string | null;
  isOnSale: boolean;
  targetPriceCents: number | null;
  accountLabel: string;
  addedAt: string;
  externalDeal: ExternalDeal | null;
  subCoverage: SubCoverage[];
};

function fmtPrice(cents: number | null, currency: string | null): string {
  if (cents == null) return "—";
  const amount = (cents / 100).toFixed(2).replace(/\.00$/, "");
  const sym =
    currency === "INR" ? "₹"
    : currency === "USD" ? "$"
    : currency === "EUR" ? "€"
    : currency === "GBP" ? "£"
    : currency === "JPY" ? "¥"
    : currency ? `${currency} ` : "$";
  return `${sym}${amount}`;
}

export function WishlistView({ items }: { items: Item[] }) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function syncAll() {
    setSyncing(true);
    setMsg("Fetching wishlists…");
    const r = await fetch("/api/wishlist/sync", { method: "POST" });
    const j = await r.json();
    type R = { storeId: string; label: string; ok: boolean; added?: number; updated?: number; removed?: number; total?: number; error?: string };
    setMsg(
      (j.results as R[])
        .map((x) => x.ok ? `${x.storeId}/${x.label}: +${x.added ?? 0} ~${x.updated ?? 0} -${x.removed ?? 0}` : `${x.storeId}/${x.label}: ERR ${x.error}`)
        .join(" · "),
    );
    setSyncing(false);
    router.refresh();
  }

  async function refreshDeals() {
    setSyncing(true);
    setMsg("Looking up ITAD deals…");
    const r = await fetch("/api/deals/refresh", { method: "POST" });
    if (r.status === 412) {
      const j = await r.json();
      setMsg(j.error ?? "ITAD_API_KEY missing");
    } else if (!r.ok) {
      setMsg(`Error ${r.status}`);
    } else {
      const j = (await r.json()) as { matched: number; updated: number; missing: number; skipped: number };
      setMsg(`ITAD: matched ${j.matched}, updated ${j.updated}, missing ${j.missing}, skipped ${j.skipped}`);
    }
    setSyncing(false);
    router.refresh();
  }

  return (
    <div style={{ padding: "24px 40px 60px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Btn primary icon="cloud" onClick={syncAll} disabled={syncing}>
          {syncing ? "Syncing…" : "Sync wishlists"}
        </Btn>
        <Btn icon="trend" onClick={refreshDeals} disabled={syncing}>
          {syncing ? "…" : "Refresh deals"}
        </Btn>
        {msg && (
          <span style={{ fontSize: 11.5, color: "var(--text-faint)", fontFamily: "var(--font-sans)" }}>
            {msg}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div style={{ padding: 40, border: "1px dashed var(--border)", borderRadius: 8, textAlign: "center", color: "var(--text-faint)" }}>
          Empty. Sync to pull from Steam + GOG.
        </div>
      ) : (
        items.map((it) => <Row key={it.id} it={it} onChanged={() => router.refresh()} />)
      )}
    </div>
  );
}

function Row({ it, onChanged }: { it: Item; onChanged: () => void }) {
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState(
    it.targetPriceCents != null ? (it.targetPriceCents / 100).toFixed(2).replace(/\.00$/, "") : "",
  );

  const m = STORE_PALETTE[it.storeId];
  const fullCents = it.fullPriceCents ?? 0;
  const curCents = it.currentPriceCents ?? fullCents;
  const targetCents = it.targetPriceCents;
  const belowTarget = targetCents != null && curCents <= targetCents && curCents > 0;
  const fillPct = fullCents > 0 ? Math.max(2, Math.min(100, (curCents / fullCents) * 100)) : 0;
  const targetPct = fullCents > 0 && targetCents != null ? Math.max(0, Math.min(100, (targetCents / fullCents) * 100)) : null;

  async function saveTarget() {
    const cleaned = targetInput.trim();
    const value = cleaned === "" ? null : Math.round(parseFloat(cleaned) * 100);
    if (cleaned !== "" && (isNaN(value as number) || (value as number) < 0)) {
      alert("Bad price");
      return;
    }
    await fetch(`/api/wishlist/${it.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ targetPriceCents: value }),
    });
    setEditingTarget(false);
    onChanged();
  }

  async function remove() {
    if (!confirm(`Remove "${it.title}" from local wishlist? (Won't touch your store wishlist — next sync re-adds it.)`)) return;
    await fetch(`/api/wishlist/${it.id}`, { method: "DELETE" });
    onChanged();
  }

  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        padding: 16,
        border: `1px solid ${belowTarget ? "var(--accent)" : "var(--border)"}`,
        background: belowTarget ? "var(--accent-soft)" : "var(--bg-2)",
        borderRadius: 8,
        alignItems: "center",
      }}
    >
      <Cover game={{ title: it.title, dev: null, coverUrl: it.coverUrl }} w={64} h={86} showTitle={false} radius={4} />

      <div style={{ flex: 1, minWidth: 0, fontFamily: "var(--font-sans)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <a
            href={it.storeUrl ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 16,
              fontFamily: "var(--font-serif)",
              color: "var(--text)",
              letterSpacing: -0.3,
              textDecoration: "none",
            }}
          >
            {it.title}
          </a>
          <StoreDot id={it.storeId} size={14} />
          <span style={{ fontSize: 11, color: "var(--text-faint)" }}>{m?.name ?? it.storeId} · @{it.accountLabel}</span>
        </div>

        {/* Price bar */}
        <div style={{ position: "relative", height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden", marginTop: 6 }}>
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              height: "100%",
              width: `${fillPct}%`,
              background: belowTarget ? "var(--accent)" : "var(--text-faint)",
            }}
          />
          {targetPct != null && (
            <div
              title="Your target"
              style={{
                position: "absolute",
                left: `${targetPct}%`,
                top: -2,
                bottom: -2,
                width: 1.5,
                background: "var(--accent)",
              }}
            />
          )}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 4,
            fontSize: 11,
            color: "var(--text-faint)",
          }}
          className="tnum"
        >
          <span style={{ color: belowTarget ? "var(--accent)" : "var(--text-soft)", fontWeight: 600 }}>
            {fmtPrice(curCents, it.currency)} now
          </span>
          <span>
            Target{" "}
            {editingTarget ? (
              <input
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                onBlur={saveTarget}
                onKeyDown={(e) => { if (e.key === "Enter") saveTarget(); if (e.key === "Escape") setEditingTarget(false); }}
                autoFocus
                placeholder="0.00"
                style={{
                  width: 60,
                  padding: "1px 4px",
                  background: "var(--bg-3)",
                  border: "1px solid var(--border)",
                  borderRadius: 3,
                  color: "var(--text)",
                  fontSize: 11,
                  fontFamily: "var(--font-sans)",
                }}
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingTarget(true)}
                style={{
                  background: "none",
                  border: "none",
                  color: targetCents != null ? "var(--accent)" : "var(--text-faint)",
                  fontSize: 11,
                  cursor: "pointer",
                  padding: 0,
                  textDecoration: "underline dotted",
                  fontFamily: "var(--font-sans)",
                }}
              >
                {targetCents != null ? fmtPrice(targetCents, it.currency) : "set"}
              </button>
            )}
          </span>
          <span>{fmtPrice(fullCents, it.currency)} full</span>
        </div>

        {it.subCoverage.length > 0 && <SubCoverageBadge hits={it.subCoverage} />}

        {it.externalDeal && (
          <DealBadge deal={it.externalDeal} currentCents={curCents} />
        )}
      </div>

      {/* Right block */}
      <div style={{ width: 120, textAlign: "right", fontFamily: "var(--font-sans)" }}>
        {it.isOnSale && it.discountPct ? (
          <>
            <div
              style={{
                fontSize: 10,
                letterSpacing: 1.5,
                color: "var(--danger)",
                textTransform: "uppercase",
                fontWeight: 700,
              }}
            >
              −{it.discountPct}% off
            </div>
            <div
              style={{
                fontSize: 22,
                fontFamily: "var(--font-serif)",
                color: "var(--accent)",
                letterSpacing: -0.4,
                marginTop: 2,
              }}
              className="tnum"
            >
              {fmtPrice(curCents, it.currency)}
            </div>
            {belowTarget && (
              <div style={{ fontSize: 10, color: "var(--accent)", marginTop: 2 }}>✓ below target</div>
            )}
          </>
        ) : (
          <>
            <div className="eyebrow">Watching</div>
            <div
              style={{
                fontSize: 18,
                fontFamily: "var(--font-serif)",
                marginTop: 2,
                color: "var(--text-soft)",
              }}
              className="tnum"
            >
              {fmtPrice(curCents, it.currency)}
            </div>
          </>
        )}
        <div style={{ marginTop: 8, display: "flex", gap: 4, justifyContent: "flex-end" }}>
          {it.storeUrl && (
            <a
              href={it.storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "4px 10px",
                background: belowTarget ? "var(--accent)" : "transparent",
                color: belowTarget ? "var(--accent-ink)" : "var(--text)",
                border: belowTarget ? "none" : "1px solid var(--border)",
                borderRadius: 6,
                fontSize: 11.5,
                fontWeight: belowTarget ? 600 : 500,
                textDecoration: "none",
              }}
            >
              {belowTarget ? "Buy now" : "Open"}
            </a>
          )}
          <button
            type="button"
            onClick={remove}
            title="Remove from local cache"
            style={{ background: "transparent", border: "none", color: "var(--text-faint)", padding: 4, cursor: "pointer" }}
          >
            <Icon name="close" size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

function SubCoverageBadge({ hits }: { hits: SubCoverage[] }) {
  const label = hits.length === 1
    ? hits[0].subscriptionName
    : `${hits[0].subscriptionName} +${hits.length - 1} more`;
  return (
    <div
      title={hits.map((h) => h.subscriptionName).join(", ")}
      style={{
        marginTop: 8,
        padding: "6px 10px",
        border: "1px solid #1e5f38",
        borderRadius: 6,
        background: "rgba(46, 125, 70, 0.12)",
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 11.5,
        fontFamily: "var(--font-sans)",
        color: "#64d38c",
      }}
    >
      <span style={{ fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700 }}>
        Already on your subscription
      </span>
      <span style={{ fontWeight: 600 }}>{label}</span>
      <span style={{ marginLeft: "auto", color: "var(--text-faint)", fontSize: 10.5 }}>
        Don't buy — stream it
      </span>
    </div>
  );
}

function DealBadge({ deal, currentCents }: { deal: ExternalDeal; currentCents: number }) {
  const saving = currentCents - deal.bestPriceCents;
  const cheaper = saving > 0;
  const same = saving === 0;
  const savingPct = currentCents > 0 && cheaper ? Math.round((saving / currentCents) * 100) : 0;
  const atHistoricalLow = deal.historicalLowCents != null && deal.bestPriceCents <= deal.historicalLowCents;
  const eyebrow = cheaper ? "Cheaper on" : same ? "Also on" : "ITAD: cheapest is";
  const priceColor = cheaper ? "#64d38c" : same ? "var(--text)" : "var(--text-soft)";
  return (
    <div
      style={{
        marginTop: 8,
        padding: "6px 10px",
        border: "1px solid var(--border-soft)",
        borderRadius: 6,
        background: "var(--bg-3)",
        display: "flex",
        alignItems: "center",
        gap: 10,
        fontSize: 11.5,
        fontFamily: "var(--font-sans)",
        flexWrap: "wrap",
      }}
    >
      <span style={{ color: "var(--text-faint)", letterSpacing: 1, textTransform: "uppercase", fontSize: 9 }}>
        {eyebrow}
      </span>
      <span style={{ color: "var(--text)", fontWeight: 600 }}>{deal.bestShopName}</span>
      <span className="tnum" style={{ color: priceColor, fontWeight: 700 }}>
        {fmtPrice(deal.bestPriceCents, deal.currency ?? null)}
      </span>
      {cheaper && (
        <span style={{ color: "var(--text-faint)" }}>
          save {fmtPrice(saving, deal.currency ?? null)} ({savingPct}%)
        </span>
      )}
      {!cheaper && deal.historicalLowCents != null && (
        <span style={{ color: "var(--text-faint)" }}>
          ATL {fmtPrice(deal.historicalLowCents, deal.currency ?? null)}
        </span>
      )}
      {atHistoricalLow && (
        <span
          style={{
            fontSize: 9,
            letterSpacing: 1,
            textTransform: "uppercase",
            color: "var(--accent)",
            fontWeight: 700,
          }}
        >
          ★ At all-time low
        </span>
      )}
      {deal.bestUrl && (
        <a
          href={deal.bestUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            marginLeft: "auto",
            color: "var(--accent)",
            textDecoration: "none",
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          View →
        </a>
      )}
    </div>
  );
}
