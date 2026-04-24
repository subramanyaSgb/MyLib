"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Cover } from "@/lib/design/cover";
import { Btn, Chip, CloudBadge, Icon, PageHeader, StoreDot } from "@/lib/design/primitives";
import type { DerivedAccount, DerivedGame } from "@/lib/design/derived";
import { STORE_PALETTE } from "@/lib/store-meta";
import { GameDetailModal } from "./game-detail-modal";
import { MergeModal } from "./merge-modal";

type Filters = {
  q: string;
  storeId: string;
  accountId: string;
  genre: string;
  played: "all" | "played" | "unplayed";
  favoritesOnly: boolean;
  showHidden: boolean;
  duplicatesOnly: boolean;
  cloud: "" | "gfn" | "xcloud" | "any";
  playState: "" | "backlog" | "playing" | "done" | "dropped";
  tag: string;
  sort: "title" | "recent" | "playtime" | "copies";
  view: "grid" | "list";
};

export function LibraryView({
  games,
  allCount,
  totalsCopies,
  duplicatesCount,
  accounts,
  filters,
  topGenres,
  allTags,
  playCounts,
  openGameId,
  openMergeId,
}: {
  games: DerivedGame[];
  allCount: number;
  totalsCopies: number;
  duplicatesCount: number;
  accounts: DerivedAccount[];
  filters: Filters;
  topGenres: Array<{ genre: string; count: number }>;
  allTags: Array<{ id: string; name: string; color: string | null; gameCount: number }>;
  playCounts: Record<string, number>;
  openGameId: string | null;
  openMergeId: string | null;
}) {
  const router = useRouter();
  const sp = useSearchParams();

  function setParam(k: string, v: string | null) {
    const next = new URLSearchParams(sp.toString());
    if (v === null || v === "" || v === "all") next.delete(k);
    else next.set(k, v);
    router.push(`/library?${next.toString()}`);
  }
  function toggleParam(k: string, on: boolean) {
    setParam(k, on ? "1" : null);
  }

  function openGame(id: string) {
    const next = new URLSearchParams(sp.toString());
    next.set("game", id);
    next.delete("merge");
    router.push(`/library?${next.toString()}`);
  }
  function openMerge(id: string) {
    const next = new URLSearchParams(sp.toString());
    next.set("merge", id);
    next.delete("game");
    router.push(`/library?${next.toString()}`);
  }
  function closeModals() {
    const next = new URLSearchParams(sp.toString());
    next.delete("game");
    next.delete("merge");
    router.push(`/library?${next.toString()}`);
  }

  const filterStore = filters.storeId ? STORE_PALETTE[filters.storeId] : null;
  const filterAcc = filters.accountId ? accounts.find((a) => a.id === filters.accountId) : null;
  const filterAccStore = filterAcc ? STORE_PALETTE[filterAcc.storeId] : null;

  const eyebrow = filterStore
    ? "Library"
    : filterAcc
    ? `${filterAccStore?.name} · Account`
    : "All libraries";
  const title = filterStore
    ? filterStore.name
    : filterAcc
    ? `@${filterAcc.handle}`
    : "Your library";
  const subtitle = filterStore
    ? `Combined view across ${accounts.filter((a) => a.storeId === filterStore.id).length} ${filterStore.name} account(s) — duplicates consolidated.`
    : filterAcc
    ? `${games.length} games`
    : `${allCount} unique games · ${totalsCopies} copies · ${accounts.length} accounts`;

  const anyFilter =
    filters.storeId || filters.accountId || filters.genre || filters.played !== "all" || filters.favoritesOnly || filters.duplicatesOnly || filters.cloud || filters.playState || filters.tag;

  const openGame_ = openGameId ? games.find((g) => g.id === openGameId) ?? null : null;
  const openMerge_ = openMergeId ? games.find((g) => g.id === openMergeId) ?? null : null;

  return (
    <div>
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        right={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden" }}>
              <button
                type="button"
                onClick={() => setParam("view", "grid")}
                style={{
                  padding: "7px 10px",
                  background: filters.view === "grid" ? "var(--bg-3)" : "transparent",
                  border: "none",
                  color: filters.view === "grid" ? "var(--accent)" : "var(--text-faint)",
                  display: "flex",
                }}
                aria-label="Grid view"
              >
                <Icon name="grid" size={13} />
              </button>
              <button
                type="button"
                onClick={() => setParam("view", "list")}
                style={{
                  padding: "7px 10px",
                  background: filters.view === "list" ? "var(--bg-3)" : "transparent",
                  border: "none",
                  color: filters.view === "list" ? "var(--accent)" : "var(--text-faint)",
                  display: "flex",
                }}
                aria-label="List view"
              >
                <Icon name="list" size={13} />
              </button>
            </div>
            <select
              value={filters.sort}
              onChange={(e) => setParam("sort", e.target.value)}
              style={{
                background: "transparent",
                color: "var(--text)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: "7px 10px",
                fontSize: 12,
                fontFamily: "var(--font-sans)",
              }}
            >
              <option value="title">Title A–Z</option>
              <option value="recent">Recently played</option>
              <option value="playtime">Most played</option>
              <option value="copies">Most copies</option>
            </select>
          </div>
        }
      />

      {/* Filter chips */}
      <div
        style={{
          padding: "14px 40px",
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center",
          borderBottom: "1px solid var(--border-soft)",
        }}
      >
        <Chip
          active={filters.played === "unplayed"}
          onClick={() => setParam("played", filters.played === "unplayed" ? "all" : "unplayed")}
        >
          Never played
        </Chip>
        <Chip
          active={filters.duplicatesOnly}
          onClick={() => toggleParam("duplicatesOnly", !filters.duplicatesOnly)}
        >
          Duplicates only ({duplicatesCount})
        </Chip>
        <Chip active={filters.favoritesOnly} onClick={() => toggleParam("favoritesOnly", !filters.favoritesOnly)}>
          ★ Favorites
        </Chip>
        <Chip active={filters.showHidden} onClick={() => toggleParam("showHidden", !filters.showHidden)}>
          Show hidden
        </Chip>
        <Chip
          active={filters.cloud === "gfn"}
          onClick={() => setParam("cloud", filters.cloud === "gfn" ? null : "gfn")}
        >
          <CloudBadge service="gfn" size={12} /> GeForce Now
        </Chip>
        <Chip
          active={filters.cloud === "xcloud"}
          onClick={() => setParam("cloud", filters.cloud === "xcloud" ? null : "xcloud")}
        >
          <CloudBadge service="xcloud" size={12} /> Xbox Cloud
        </Chip>
        {(["backlog", "playing", "done", "dropped"] as const).map((s) => (
          <Chip
            key={s}
            active={filters.playState === s}
            onClick={() => setParam("playState", filters.playState === s ? null : s)}
          >
            {playStateLabel(s)}
            {playCounts[s] ? (
              <span style={{ opacity: 0.6, marginLeft: 2 }} className="tnum">
                {playCounts[s]}
              </span>
            ) : null}
          </Chip>
        ))}
        {allTags.map((t) => (
          <Chip
            key={t.id}
            active={filters.tag === t.id}
            onClick={() => setParam("tag", filters.tag === t.id ? null : t.id)}
            style={t.color ? { borderColor: filters.tag === t.id ? t.color : undefined, color: filters.tag === t.id ? t.color : undefined } : undefined}
          >
            # {t.name}
            <span style={{ opacity: 0.6, marginLeft: 2 }} className="tnum">
              {t.gameCount}
            </span>
          </Chip>
        ))}
        {topGenres.map((g) => (
          <Chip
            key={g.genre}
            active={filters.genre === g.genre}
            onClick={() => setParam("genre", filters.genre === g.genre ? null : g.genre)}
          >
            {g.genre} <span style={{ opacity: 0.6, marginLeft: 2 }} className="tnum">{g.count}</span>
          </Chip>
        ))}
        <div style={{ flex: 1 }} />
        {anyFilter && (
          <Chip
            onClick={() => {
              const next = new URLSearchParams();
              if (filters.q) next.set("q", filters.q);
              if (filters.view !== "grid") next.set("view", filters.view);
              if (filters.sort !== "title") next.set("sort", filters.sort);
              router.push(`/library?${next.toString()}`);
            }}
          >
            Clear filters ×
          </Chip>
        )}
      </div>

      {/* Grid / list */}
      {games.length === 0 ? (
        <div style={{ padding: 60, textAlign: "center", color: "var(--text-faint)" }}>
          No games match. Try adjusting filters.
        </div>
      ) : filters.view === "grid" ? (
        <div
          style={{
            padding: "22px 40px 60px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 18,
          }}
        >
          {games.map((g) => (
            <GameCard key={g.id} g={g} onClick={() => openGame(g.id)} />
          ))}
        </div>
      ) : (
        <div style={{ padding: "8px 40px 60px" }}>
          {games.map((g) => (
            <GameRow key={g.id} g={g} onClick={() => openGame(g.id)} />
          ))}
        </div>
      )}

      {openGame_ && (
        <GameDetailModal
          game={openGame_}
          accounts={accounts}
          allTags={allTags}
          onClose={closeModals}
          onMerge={() => openMerge(openGame_.id)}
        />
      )}
      {openMerge_ && (
        <MergeModal
          game={openMerge_}
          accounts={accounts}
          onClose={closeModals}
          onComplete={() => {
            closeModals();
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function GameCard({ g, onClick }: { g: DerivedGame; onClick: () => void }) {
  const dupe = g.ownedBy.length > 1;
  return (
    <button
      type="button"
      onClick={onClick}
      className="hover-lift"
      style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer", color: "inherit", textAlign: "left" }}
    >
      <div style={{ position: "relative" }}>
        <Cover game={{ title: g.title, dev: g.dev, coverUrl: g.coverUrl }} w="100%" h={240} radius={5} />
        <div style={{ position: "absolute", top: 8, left: 8, display: "flex", gap: 4, alignItems: "center" }}>
          {distinctStores(g.ownedBy.map((o) => o.storeId))
            .slice(0, 3)
            .map((sid, i) => (
              <StoreDot key={i} id={sid} size={18} ring />
            ))}
          {distinctStores(g.ownedBy.map((o) => o.storeId)).length > 3 && (
            <span
              style={{
                fontSize: 10,
                padding: "1px 5px",
                background: "rgba(0,0,0,0.6)",
                color: "#fff",
                borderRadius: 3,
                fontFamily: "var(--font-sans)",
              }}
            >
              +{distinctStores(g.ownedBy.map((o) => o.storeId)).length - 3}
            </span>
          )}
        </div>
        {dupe && (
          <div
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              padding: "2px 7px",
              background: "var(--accent)",
              color: "var(--accent-ink)",
              borderRadius: 3,
              fontSize: 9,
              fontWeight: 700,
              fontFamily: "var(--font-sans)",
              letterSpacing: 1,
            }}
          >
            ×{g.ownedBy.length}
          </div>
        )}
        {g.isFavorite && (
          <div style={{ position: "absolute", bottom: 8, right: 8, color: "#ffd56b", fontSize: 16 }}>★</div>
        )}
        {g.playState && (
          <div
            style={{
              position: "absolute",
              top: 8,
              left: 8,
              padding: "2px 7px",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: "uppercase",
              background: playStateColor(g.playState),
              color: "#0b0b0f",
              borderRadius: 3,
              fontFamily: "var(--font-sans)",
            }}
          >
            {playStateLabel(g.playState)}
          </div>
        )}
        {(g.cloudGfn || g.cloudXcloud) && (
          <div
            style={{
              position: "absolute",
              bottom: 8,
              left: 8,
              display: "flex",
              gap: 6,
              alignItems: "center",
            }}
          >
            {g.cloudGfn && <CloudBadge service="gfn" size={16} />}
            {g.cloudXcloud && <CloudBadge service="xcloud" size={16} />}
          </div>
        )}
      </div>
      <div
        style={{
          marginTop: 10,
          fontFamily: "var(--font-sans)",
          minWidth: 0,
        }}
      >
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
          title={g.title}
        >
          {g.title}
        </div>
        <div
          style={{
            marginTop: 3,
            display: "flex",
            gap: 8,
            alignItems: "baseline",
            color: "var(--text-soft)",
            fontSize: 11.5,
          }}
        >
          <span style={{ color: g.totalHours > 0 ? "var(--accent)" : "var(--text-faint)" }} className="tnum">
            {g.totalHours > 0 ? `${g.totalHours.toFixed(1)}h` : "Unplayed"}
          </span>
          {g.genre && (
            <>
              <span style={{ opacity: 0.4 }}>·</span>
              <span
                style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                title={g.genre}
              >
                {g.genre}
              </span>
            </>
          )}
        </div>
      </div>
    </button>
  );
}

function GameRow({ g, onClick }: { g: DerivedGame; onClick: () => void }) {
  const dupe = g.ownedBy.length > 1;
  const lastPlayed = g.ownedBy.reduce((best, o) => (o.lastPlayedAt && (!best || o.lastPlayedAt > best) ? o.lastPlayedAt : best), null as Date | null);
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "10px 0",
        borderBottom: "1px solid var(--border-soft)",
        background: "transparent",
        border: "none",
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        width: "100%",
        cursor: "pointer",
        color: "inherit",
        textAlign: "left",
      }}
    >
      <Cover game={{ title: g.title, dev: g.dev, coverUrl: g.coverUrl }} w={48} h={64} showTitle={false} radius={3} />
      <div style={{ flex: 1, fontFamily: "var(--font-sans)" }}>
        <div
          style={{
            fontSize: 14,
            fontFamily: "var(--font-serif)",
            color: "var(--text)",
            letterSpacing: -0.2,
          }}
        >
          {g.title}{" "}
          {dupe && (
            <span
              style={{
                fontSize: 9,
                marginLeft: 6,
                padding: "1px 5px",
                background: "var(--accent-soft)",
                color: "var(--accent)",
                borderRadius: 3,
                fontWeight: 700,
                fontFamily: "var(--font-sans)",
                letterSpacing: 1,
                verticalAlign: "middle",
              }}
            >
              ×{g.ownedBy.length}
            </span>
          )}
          {g.isFavorite && <span style={{ marginLeft: 6, color: "#ffd56b" }}>★</span>}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: 2 }}>
          {[g.dev, g.year, g.genre].filter(Boolean).join(" · ") || "—"}
        </div>
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        {distinctStores(g.ownedBy.map((o) => o.storeId)).map((sid, i) => (
          <StoreDot key={i} id={sid} size={18} />
        ))}
      </div>
      <div
        style={{
          width: 100,
          fontFamily: "var(--font-sans)",
          fontSize: 12,
          color: "var(--text-soft)",
          textAlign: "right",
        }}
        className="tnum"
      >
        {g.totalHours > 0 ? `${g.totalHours.toFixed(1)} hrs` : <span style={{ color: "var(--text-faint)" }}>—</span>}
      </div>
      <div
        style={{
          width: 110,
          fontFamily: "var(--font-sans)",
          fontSize: 11.5,
          color: "var(--text-faint)",
          textAlign: "right",
        }}
      >
        {lastPlayed ? lastPlayed.toLocaleDateString() : "—"}
      </div>
    </button>
  );
}

function distinctStores(ids: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) if (!seen.has(id)) { seen.add(id); out.push(id); }
  return out;
}

export function playStateLabel(s: NonNullable<DerivedGame["playState"]>): string {
  return { backlog: "Backlog", playing: "Playing", done: "Done", dropped: "Dropped" }[s];
}

export function playStateColor(s: NonNullable<DerivedGame["playState"]>): string {
  return {
    backlog: "#6b8aff",
    playing: "#22d3ee",
    done: "#10b981",
    dropped: "#8a8ea0",
  }[s];
}
