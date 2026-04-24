"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon, Avatar, avatarHueFor } from "./primitives";

export type TopChromeAccount = { id: string; handle: string };

export function TopChrome({
  accounts,
  lastSyncAt,
}: {
  accounts: TopChromeAccount[];
  lastSyncAt: Date | null;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");

  function syncNow() {
    fetch("/api/sync-all", { method: "POST" }).then(() => router.refresh());
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim()) router.push(`/library?q=${encodeURIComponent(q.trim())}`);
  }

  const lastSyncText = lastSyncAt
    ? `Synced ${humanize(Date.now() - lastSyncAt.getTime())}`
    : "Never synced";

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 5,
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "12px 40px",
        borderBottom: "1px solid var(--border-soft)",
        background: "color-mix(in srgb, var(--bg) 88%, transparent)",
        backdropFilter: "blur(8px)",
      }}
    >
      <form onSubmit={submit} style={{ flex: 1, maxWidth: 560, position: "relative" }}>
        <span style={{ position: "absolute", left: 11, top: 9, color: "var(--text-faint)" }}>
          <Icon name="search" size={13} />
        </span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search your library…"
          style={{
            width: "100%",
            padding: "8px 60px 8px 32px",
            background: "var(--bg-2)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            color: "var(--text)",
            fontSize: 13,
            fontFamily: "var(--font-sans)",
          }}
        />
        <span
          style={{
            position: "absolute",
            right: 10,
            top: 8,
            fontSize: 10,
            color: "var(--text-faint)",
            border: "1px solid var(--border)",
            padding: "1px 6px",
            borderRadius: 3,
            fontFamily: "var(--font-sans)",
            letterSpacing: 1,
          }}
        >
          ⌘K
        </span>
      </form>

      <button
        type="button"
        onClick={syncNow}
        title="Sync all accounts now"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 10px",
          background: "transparent",
          border: "1px solid var(--border)",
          borderRadius: 6,
          color: "var(--text-soft)",
          fontSize: 11.5,
          fontFamily: "var(--font-sans)",
        }}
      >
        <Icon name="cloud" size={12} />
        <span>{lastSyncText}</span>
      </button>

      <div style={{ display: "flex", alignItems: "center" }}>
        {accounts.slice(0, 5).map((a, i) => (
          <div
            key={a.id}
            style={{
              marginLeft: i === 0 ? 0 : -6,
              border: "2px solid var(--bg)",
              borderRadius: 99,
              display: "inline-flex",
            }}
          >
            <Avatar hue={avatarHueFor(a.id)} size={22} label={a.handle[0] ?? "?"} />
          </div>
        ))}
        {accounts.length > 5 && (
          <span
            style={{
              fontSize: 10.5,
              color: "var(--text-faint)",
              marginLeft: 6,
              fontFamily: "var(--font-sans)",
            }}
            className="tnum"
          >
            +{accounts.length - 5}
          </span>
        )}
      </div>
    </div>
  );
}

function humanize(ms: number): string {
  const min = ms / 60_000;
  if (min < 1) return "just now";
  if (min < 60) return `${Math.floor(min)}m ago`;
  const hr = min / 60;
  if (hr < 24) return `${Math.floor(hr)}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}
