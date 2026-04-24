"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader, Toggle } from "@/lib/design/primitives";

type Sub = {
  id: string;
  name: string;
  storeHint: string | null;
  monthlyCostCents: number | null;
  currency: string | null;
  isActive: boolean;
  refreshedAt: string | null;
  catalogSize: number;
};

export default function SettingsPage() {
  const [autoSync, setAutoSync] = useState(true);
  const [notifyDup, setNotifyDup] = useState(true);
  const [notifySale, setNotifySale] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [subs, setSubs] = useState<Sub[]>([]);

  useEffect(() => {
    fetch("/api/subs")
      .then((r) => r.json())
      .then((j: { subs: Sub[] }) => setSubs(j.subs))
      .catch(() => setSubs([]));
  }, []);

  async function toggleSub(id: string, isActive: boolean) {
    setSubs((xs) => xs.map((x) => (x.id === id ? { ...x, isActive } : x)));
    await fetch(`/api/subs/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
  }

  return (
    <div>
      <PageHeader
        eyebrow="Preferences"
        title="Settings"
        subtitle="Local-only configuration. Credentials are encrypted at rest."
      />
      <div style={{ padding: "24px 40px 60px", display: "flex", flexDirection: "column", gap: 24, maxWidth: 760 }}>
        <Group title="Library">
          <Row label="Auto-sync accounts every 6 hours" sub="Background; runs in dev only with AUTOSYNC_HOURS env var.">
            <Toggle on={autoSync} onChange={setAutoSync} />
          </Row>
          <Row label="Group multi-store copies as one card" sub="Off shows each copy as its own card.">
            <Toggle on={true} onChange={() => {}} />
          </Row>
          <Row label="Replay onboarding tour" sub="Walk through the 4-step intro again.">
            <Link
              href="/onboarding"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "6px 12px",
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: 6,
                fontSize: 12,
                color: "var(--text)",
                textDecoration: "none",
              }}
            >
              Replay
            </Link>
          </Row>
        </Group>

        <Group title="Subscriptions you pay for">
          <div style={{ padding: "10px 18px 4px", fontSize: 11.5, color: "var(--text-faint)", lineHeight: 1.5 }}>
            Flip on the ones you already subscribe to. Playdex will flag wishlist games inside those catalogs so you don't double-pay.
          </div>
          {subs.length === 0 && (
            <div style={{ padding: "14px 18px", fontSize: 12, color: "var(--text-faint)" }}>Loading…</div>
          )}
          {subs.map((s) => {
            const monthly = s.monthlyCostCents != null
              ? ` · ${s.currency === "USD" ? "$" : s.currency ? `${s.currency} ` : "$"}${(s.monthlyCostCents / 100).toFixed(2).replace(/\.00$/, "")}/mo`
              : "";
            return (
              <Row
                key={s.id}
                label={s.name}
                sub={`${s.catalogSize} games in catalog${monthly}${s.refreshedAt ? ` · refreshed ${new Date(s.refreshedAt).toLocaleDateString()}` : " · catalog empty — upload via PUT /api/subs/" + s.id + "/catalog"}`}
              >
                <Toggle on={s.isActive} onChange={(v) => toggleSub(s.id, v)} />
              </Row>
            );
          })}
        </Group>

        <Group title="Notifications">
          <Row label="Notify when a duplicate is detected" sub="Surfaces on the home dashboard.">
            <Toggle on={notifyDup} onChange={setNotifyDup} />
          </Row>
          <Row label="Notify when a wishlist item drops below your target" sub="(Wishlist coming soon)">
            <Toggle on={notifySale} onChange={setNotifySale} />
          </Row>
        </Group>

        <Group title="Privacy">
          <Row label="Send anonymous usage data" sub="Off. Playdex doesn't phone home.">
            <Toggle on={analytics} onChange={setAnalytics} />
          </Row>
          <Row label="Delete all data" sub="Removes accounts, library cache, and image cache. Cannot be undone." danger>
            <button
              type="button"
              onClick={() => alert("Stub — wire DELETE /api/data to enable.")}
              style={{
                background: "transparent",
                border: "1px solid var(--danger)",
                color: "var(--danger)",
                padding: "6px 12px",
                borderRadius: 6,
                fontSize: 12,
                fontFamily: "var(--font-sans)",
              }}
            >
              Delete everything
            </button>
          </Row>
        </Group>
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-2)" }}>
      <div
        style={{
          padding: "12px 18px",
          borderBottom: "1px solid var(--border-soft)",
          fontSize: 11,
          letterSpacing: 2.5,
          textTransform: "uppercase",
          color: "var(--text-faint)",
          fontFamily: "var(--font-sans)",
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({
  label, sub, children, danger,
}: { label: string; sub?: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "14px 18px",
        borderBottom: "1px solid var(--border-soft)",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: danger ? "var(--danger)" : "var(--text)", fontWeight: 500 }}>
          {label}
        </div>
        {sub && (
          <div style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: 3, lineHeight: 1.4 }}>
            {sub}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
