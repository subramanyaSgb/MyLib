"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Cover } from "@/lib/design/cover";
import { Btn, StoreDot } from "@/lib/design/primitives";
import { STORE_PALETTE } from "@/lib/store-meta";

type Offer = {
  id: string;
  storeId: string;
  title: string;
  coverUrl: string | null;
  url: string;
  offerType: string;
  startsAt: string | null;
  endsAt: string | null;
  originalCents: number | null;
  currency: string | null;
};

function fmtPrice(cents: number | null, currency: string | null): string {
  if (cents == null || cents === 0) return "";
  const amount = (cents / 100).toFixed(2).replace(/\.00$/, "");
  const sym =
    currency === "INR" ? "₹"
    : currency === "USD" ? "$"
    : currency === "EUR" ? "€"
    : currency === "GBP" ? "£"
    : currency ? `${currency} ` : "$";
  return `${sym}${amount}`;
}

function endsInLabel(iso: string | null): string {
  if (!iso) return "";
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "Ended";
  const hr = Math.round(ms / 3_600_000);
  if (hr < 24) return `Ends in ${hr}h`;
  const d = Math.round(hr / 24);
  return `Ends in ${d}d`;
}

export function DealsView({ offers }: { offers: Offer[] }) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function refresh() {
    setSyncing(true);
    setMsg("Fetching Epic + GOG…");
    const r = await fetch("/api/free-offers/sync", { method: "POST" });
    const j = (await r.json()) as { fetched: number; upserted: number; errors: string[] };
    setMsg(`+${j.upserted} offers${j.errors.length ? ` · ${j.errors.length} err` : ""}`);
    setSyncing(false);
    router.refresh();
  }

  async function dismiss(id: string) {
    await fetch(`/api/free-offers/${id}/dismiss`, { method: "POST" });
    router.refresh();
  }

  const timed = offers.filter((o) => o.offerType === "free_keep" || o.offerType === "giveaway");
  const perma = offers.filter((o) => o.offerType === "perma_free");
  const soon = offers.filter((o) => o.offerType === "free_play");

  return (
    <div style={{ padding: "24px 40px 60px", display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Btn primary icon="cloud" onClick={refresh} disabled={syncing}>
          {syncing ? "Fetching…" : "Refresh offers"}
        </Btn>
        {msg && (
          <span style={{ fontSize: 11.5, color: "var(--text-faint)", fontFamily: "var(--font-sans)" }}>
            {msg}
          </span>
        )}
      </div>

      {offers.length === 0 && (
        <div style={{ padding: 40, border: "1px dashed var(--border)", borderRadius: 8, textAlign: "center", color: "var(--text-faint)" }}>
          No active offers. Click refresh.
        </div>
      )}

      {timed.length > 0 && <Section title="Claim now — time-limited" offers={timed} onDismiss={dismiss} />}
      {soon.length > 0 && <Section title="Free to play" offers={soon} onDismiss={dismiss} />}
      {perma.length > 0 && <Section title="Always free on GOG" offers={perma} onDismiss={dismiss} />}
    </div>
  );
}

function Section({ title, offers, onDismiss }: { title: string; offers: Offer[]; onDismiss: (id: string) => void }) {
  return (
    <section>
      <div className="eyebrow" style={{ marginBottom: 12 }}>{title}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
        {offers.map((o) => (
          <OfferCard key={o.id} o={o} onDismiss={() => onDismiss(o.id)} />
        ))}
      </div>
    </section>
  );
}

function OfferCard({ o, onDismiss }: { o: Offer; onDismiss: () => void }) {
  const m = STORE_PALETTE[o.storeId];
  const endLabel = endsInLabel(o.endsAt);
  const priceLabel = fmtPrice(o.originalCents, o.currency);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        border: "1px solid var(--border)",
        borderRadius: 8,
        background: "var(--bg-2)",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "relative" }}>
        <Cover game={{ title: o.title, dev: null, coverUrl: o.coverUrl }} w="100%" h={140} radius={0} showTitle={false} />
        <div style={{ position: "absolute", top: 8, left: 8 }}>
          <StoreDot id={o.storeId} size={18} ring />
        </div>
        {endLabel && (
          <div
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              fontSize: 10,
              padding: "2px 6px",
              background: "var(--accent)",
              color: "var(--bg)",
              fontFamily: "var(--font-sans)",
              fontWeight: 700,
              letterSpacing: 0.5,
              borderRadius: 3,
            }}
          >
            {endLabel}
          </div>
        )}
      </div>
      <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ fontSize: 14, fontFamily: "var(--font-serif)", letterSpacing: -0.2, lineHeight: 1.25 }}>
          {o.title}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-faint)", fontFamily: "var(--font-sans)" }}>
          {m?.name ?? o.storeId}
          {priceLabel && <span style={{ marginLeft: 8, textDecoration: "line-through" }}>{priceLabel}</span>}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
          <Btn primary icon="link" onClick={() => window.open(o.url, "_blank", "noopener")}>
            Claim
          </Btn>
          <Btn ghost onClick={onDismiss}>
            Hide
          </Btn>
        </div>
      </div>
    </div>
  );
}
