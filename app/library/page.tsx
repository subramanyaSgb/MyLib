import { getAccounts, getGames, computeTotals, getTopGenres, getAllTags, getPlayStateCounts } from "@/lib/design/derived";
import { LibraryView } from "./library-view";

export const dynamic = "force-dynamic";

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    store?: string;
    account?: string;
    genre?: string;
    played?: "all" | "played" | "unplayed";
    sort?: "title" | "recent" | "playtime" | "copies";
    view?: "grid" | "list";
    favoritesOnly?: string;
    showHidden?: string;
    duplicatesOnly?: string;
    cloud?: "gfn" | "xcloud" | "any";
    playState?: "backlog" | "playing" | "done" | "dropped";
    tag?: string;
    game?: string;
    merge?: string;
  }>;
}) {
  const sp = await searchParams;
  const filters = {
    q: sp.q ?? "",
    storeId: sp.store ?? "",
    accountId: sp.account ?? "",
    genre: sp.genre ?? "",
    played: sp.played ?? "all",
    favoritesOnly: sp.favoritesOnly === "1",
    showHidden: sp.showHidden === "1",
    duplicatesOnly: sp.duplicatesOnly === "1",
    cloud: sp.cloud ?? "",
    playState: sp.playState ?? "",
    tag: sp.tag ?? "",
    sort: sp.sort ?? "title",
    view: sp.view ?? "grid",
  } as const;

  const [accounts, games, topGenres, allTags, playCounts] = await Promise.all([
    getAccounts(),
    getGames({
      q: filters.q || undefined,
      storeId: filters.storeId || undefined,
      accountId: filters.accountId || undefined,
      genre: filters.genre || undefined,
      unplayed: filters.played === "unplayed",
      favoritesOnly: filters.favoritesOnly,
      showHidden: filters.showHidden,
      cloudOnly: filters.cloud as "gfn" | "xcloud" | "any" | undefined,
      playState: filters.playState as "backlog" | "playing" | "done" | "dropped" | undefined,
      tagId: filters.tag || undefined,
    }),
    getTopGenres(8),
    getAllTags(),
    getPlayStateCounts(),
  ]);

  // Apply remaining filters not handled in DB layer
  let filtered = games;
  if (filters.played === "played") filtered = filtered.filter((g) => g.totalHours > 0);
  if (filters.duplicatesOnly) filtered = filtered.filter((g) => g.ownedBy.length > 1);

  // Sort
  switch (filters.sort) {
    case "playtime":
      filtered = [...filtered].sort((a, b) => b.totalHours - a.totalHours);
      break;
    case "copies":
      filtered = [...filtered].sort((a, b) => b.ownedBy.length - a.ownedBy.length);
      break;
    case "recent":
      filtered = [...filtered].sort((a, b) => {
        const ta = Math.max(0, ...a.ownedBy.map((o) => (o.lastPlayedAt ? o.lastPlayedAt.getTime() : 0)));
        const tb = Math.max(0, ...b.ownedBy.map((o) => (o.lastPlayedAt ? o.lastPlayedAt.getTime() : 0)));
        return tb - ta;
      });
      break;
    default:
      filtered = [...filtered].sort((a, b) => a.title.localeCompare(b.title));
  }
  // Favorites bubble up within sort
  filtered = [...filtered].sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite));

  const totals = computeTotals(games);

  return (
    <LibraryView
      games={filtered}
      allCount={games.length}
      totalsCopies={totals.totalCopies}
      duplicatesCount={totals.duplicates.length}
      accounts={accounts}
      filters={filters}
      topGenres={topGenres}
      allTags={allTags}
      playCounts={playCounts}
      openGameId={sp.game ?? null}
      openMergeId={sp.merge ?? null}
    />
  );
}
