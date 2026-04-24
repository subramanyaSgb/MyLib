"use client";

import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Icon, StoreDot, Avatar, avatarHueFor } from "./primitives";
import { ROUTES } from "./routes";
import { STORE_PALETTE } from "@/lib/store-meta";

export type SidebarAccount = {
  id: string;
  storeId: string;
  handle: string;
  primary: boolean;
  gameCount: number;
};

export type SidebarStats = {
  totalHours: number;
  totalGames: number;
  totalCopies: number;
  duplicateCount: number;
};

export function Sidebar({
  accounts,
  stats,
  storeGameCounts,
}: {
  accounts: SidebarAccount[];
  stats: SidebarStats;
  storeGameCounts: Record<string, number>;
}) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const router = useRouter();

  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(["steam"]));

  const accountsByStore = useMemo(() => {
    const map: Record<string, SidebarAccount[]> = {};
    for (const a of accounts) (map[a.storeId] ??= []).push(a);
    return map;
  }, [accounts]);

  const filterStore = sp.get("store") ?? null;
  const filterAccount = sp.get("account") ?? null;

  function isRouteActive(path: string): boolean {
    if (path === "/") return pathname === "/" && !filterStore && !filterAccount;
    if (path === "/library") return pathname === "/library" && !filterStore && !filterAccount;
    return pathname === path;
  }

  function toggleExpand(id: string) {
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function navStore(storeId: string) {
    router.push(`/library?store=${storeId}`);
  }
  function navAccount(accountId: string) {
    router.push(`/library?account=${accountId}`);
  }

  return (
    <aside
      style={{
        borderRight: "1px solid var(--border)",
        background: "var(--bg-2)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        height: "100vh",
        position: "sticky",
        top: 0,
      }}
    >
      {/* Brand */}
      <div style={{ padding: "22px 20px 14px", display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: 5,
            background: "var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--accent-ink)",
            fontWeight: 800,
            fontSize: 13,
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
          }}
        >
          M
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: -0.2, fontFamily: "var(--font-serif)" }}>
          Mylibrary
        </div>
        <div
          style={{
            fontSize: 9,
            opacity: 0.45,
            letterSpacing: 2,
            marginLeft: "auto",
            fontFamily: "var(--font-sans)",
          }}
        >
          v0.4
        </div>
      </div>

      <div className="scroll-thin" style={{ flex: 1, overflowY: "auto", padding: "4px 12px 20px" }}>
        {ROUTES.map((r) => {
          const active = isRouteActive(r.path);
          return (
            <Link
              key={r.id}
              href={r.path}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "7px 10px",
                borderRadius: 5,
                marginBottom: 1,
                background: active ? "var(--bg-3)" : "transparent",
                color: active ? "var(--accent)" : "var(--text)",
                fontFamily: "var(--font-sans)",
                position: "relative",
                textDecoration: "none",
                fontSize: 13,
                fontWeight: active ? 600 : 500,
              }}
            >
              {active && (
                <span
                  style={{
                    position: "absolute",
                    left: -12,
                    top: 7,
                    bottom: 7,
                    width: 2,
                    borderRadius: 1,
                    background: "var(--accent)",
                  }}
                />
              )}
              <Icon name={r.icon} size={14} opacity={active ? 1 : 0.65} />
              <div style={{ flex: 1 }}>{r.label}</div>
              {r.id === "duplicates" && stats.duplicateCount > 0 && (
                <span
                  style={{
                    fontSize: 9,
                    padding: "1px 5px",
                    background: "var(--accent-soft)",
                    color: "var(--accent)",
                    borderRadius: 3,
                    fontWeight: 700,
                    letterSpacing: 0.5,
                  }}
                  className="tnum"
                >
                  {stats.duplicateCount}
                </span>
              )}
            </Link>
          );
        })}

        {/* Libraries section */}
        <div
          style={{
            fontSize: 9,
            opacity: 0.45,
            letterSpacing: 2.5,
            textTransform: "uppercase",
            fontFamily: "var(--font-sans)",
            margin: "22px 10px 8px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <span>Libraries</span>
          <span style={{ marginLeft: "auto", fontWeight: 600, color: "var(--accent)" }} className="tnum">
            {accounts.length}
          </span>
        </div>

        {Object.keys(STORE_PALETTE)
          .filter((sid) => accountsByStore[sid]?.length)
          .map((sid) => {
            const s = STORE_PALETTE[sid];
            const accs = accountsByStore[sid];
            const open = expanded.has(sid);
            const multi = accs.length > 1;
            const storeActive = filterStore === sid && !filterAccount;
            const nGames = storeGameCounts[sid] ?? 0;
            return (
              <div key={sid} style={{ marginBottom: 1 }}>
                <div
                  onClick={() => navStore(sid)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    padding: "7px 8px",
                    cursor: "pointer",
                    borderRadius: 5,
                    background: storeActive ? "var(--bg-3)" : "transparent",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpand(sid);
                    }}
                    style={{ width: 14, opacity: 0.45, display: "flex", alignItems: "center" }}
                  >
                    <Icon name={open ? "chev" : "chevR"} size={11} />
                  </span>
                  <StoreDot id={sid} size={14} />
                  <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{s.name}</div>
                  {multi && (
                    <span
                      style={{
                        fontSize: 9,
                        padding: "1px 5px",
                        background: "var(--accent-soft)",
                        color: "var(--accent)",
                        borderRadius: 3,
                        fontWeight: 700,
                        letterSpacing: 0.5,
                      }}
                    >
                      ×{accs.length}
                    </span>
                  )}
                  <div style={{ fontSize: 11, color: "var(--text-faint)" }} className="tnum">
                    {nGames}
                  </div>
                </div>

                {open &&
                  accs.map((a) => {
                    const sel = filterAccount === a.id;
                    return (
                      <div
                        key={a.id}
                        onClick={() => navAccount(a.id)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "5px 8px 5px 32px",
                          cursor: "pointer",
                          borderRadius: 5,
                          background: sel ? "var(--bg-3)" : "transparent",
                          fontFamily: "var(--font-sans)",
                          position: "relative",
                        }}
                      >
                        <span
                          style={{
                            position: "absolute",
                            left: 21,
                            top: 0,
                            bottom: 0,
                            width: 1,
                            background: sel ? "var(--accent)" : "var(--border)",
                          }}
                        />
                        <Avatar hue={avatarHueFor(a.id)} size={16} label={a.handle[0] ?? "?"} />
                        <div
                          style={{
                            flex: 1,
                            fontSize: 12,
                            color: "var(--text-soft)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          @{a.handle}
                        </div>
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
                            }}
                          >
                            PRI
                          </span>
                        )}
                        <div style={{ fontSize: 10, color: "var(--text-faint)" }} className="tnum">
                          {a.gameCount}
                        </div>
                      </div>
                    );
                  })}

                {open && (
                  <Link
                    href="/accounts"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "5px 8px 6px 32px",
                      borderRadius: 5,
                      color: "var(--accent)",
                      fontSize: 11.5,
                      fontFamily: "var(--font-sans)",
                      textDecoration: "none",
                    }}
                  >
                    <Icon name="plus" size={11} />
                    <span>Add another {s.name}</span>
                  </Link>
                )}
              </div>
            );
          })}
      </div>

      {/* Footer stat */}
      <div
        style={{
          padding: "14px 20px",
          borderTop: "1px solid var(--border)",
          fontFamily: "var(--font-sans)",
        }}
      >
        <div className="eyebrow" style={{ marginBottom: 4 }}>All time</div>
        <div
          style={{
            fontSize: 22,
            fontFamily: "var(--font-serif)",
            fontWeight: 500,
            letterSpacing: -0.5,
          }}
          className="tnum"
        >
          {Math.round(stats.totalHours).toLocaleString()}
          <span style={{ fontSize: 12, color: "var(--text-faint)", marginLeft: 4, fontFamily: "var(--font-sans)" }}>
            hrs
          </span>
        </div>
        <div style={{ fontSize: 10.5, color: "var(--text-soft)", marginTop: 2 }}>
          {stats.totalGames} games · {stats.totalCopies} copies
        </div>
      </div>
    </aside>
  );
}
