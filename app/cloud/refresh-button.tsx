"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Btn } from "@/lib/design/primitives";

export function CloudRefreshButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function refresh() {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/cloud/refresh", { method: "POST" });
    const j = await res.json();
    setBusy(false);
    setMsg(
      `gfn:${j.gfnCatalogCount ?? "—"} xcloud:${j.xcloudCatalogCount ?? "—"} · matched ${j.gfnHits ?? 0}/${j.xcloudHits ?? 0}`,
    );
    router.refresh();
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {msg && <span style={{ fontSize: 11, color: "var(--text-faint)" }}>{msg}</span>}
      <Btn primary icon="cloud" onClick={refresh} disabled={busy}>
        {busy ? "Refreshing…" : "Refresh cloud catalogs"}
      </Btn>
    </div>
  );
}
