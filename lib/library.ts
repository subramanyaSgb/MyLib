import { prisma } from "./db";

export type LibraryGame = {
  id: string;
  title: string;
  coverUrl: string | null;
  isFavorite: boolean;
  isHidden: boolean;
  storeIds: string[];
  totalPlaytimeMin: number;
  lastPlayedAt: string | null;
  ownerCount: number;
  owners: Array<{
    accountId: string;
    storeId: string;
    accountLabel: string;
    playtimeMin: number;
    lastPlayedAt: string | null;
    storeUrl: string | null;
  }>;
};

export type LibraryFilters = {
  q?: string;
  store?: string;
  played?: "all" | "played" | "unplayed";
  sort?: "title" | "recent" | "playtime";
  favoritesOnly?: boolean;
  showHidden?: boolean;
};

export async function fetchLibrary(filters: LibraryFilters): Promise<LibraryGame[]> {
  const games = await prisma.game.findMany({
    where: {
      ...(filters.q ? { normTitle: { contains: filters.q.toLowerCase() } } : {}),
      ...(filters.favoritesOnly ? { isFavorite: true } : {}),
      ...(filters.showHidden ? {} : { isHidden: false }),
    },
    include: {
      copies: {
        include: {
          owned: {
            include: { account: { select: { id: true, storeId: true, label: true } } },
          },
        },
      },
    },
  });

  const mapped: LibraryGame[] = games
    .map((g) => {
      const owners = g.copies.flatMap((c) =>
        c.owned.map((o) => ({
          accountId: o.account.id,
          storeId: o.account.storeId,
          accountLabel: o.account.label,
          playtimeMin: o.playtimeMin,
          lastPlayedAt: o.lastPlayedAt ? o.lastPlayedAt.toISOString() : null,
          storeUrl: c.storeUrl,
        })),
      );
      const totalPlaytimeMin = owners.reduce((s, o) => s + o.playtimeMin, 0);
      const lastPlayedDates = owners
        .map((o) => (o.lastPlayedAt ? new Date(o.lastPlayedAt).getTime() : 0))
        .filter((t) => t > 0);
      const lastPlayed = lastPlayedDates.length ? Math.max(...lastPlayedDates) : null;
      return {
        id: g.id,
        title: g.title,
        coverUrl: g.coverUrl,
        isFavorite: g.isFavorite,
        isHidden: g.isHidden,
        storeIds: [...new Set(g.copies.map((c) => c.storeId))],
        totalPlaytimeMin,
        lastPlayedAt: lastPlayed ? new Date(lastPlayed).toISOString() : null,
        ownerCount: owners.length,
        owners,
      };
    })
    .filter((g) => g.owners.length > 0)
    .filter((g) => !filters.store || g.storeIds.includes(filters.store))
    .filter((g) => {
      if (filters.played === "played") return g.totalPlaytimeMin > 0;
      if (filters.played === "unplayed") return g.totalPlaytimeMin === 0;
      return true;
    });

  // Sort
  switch (filters.sort) {
    case "playtime":
      mapped.sort((a, b) => b.totalPlaytimeMin - a.totalPlaytimeMin);
      break;
    case "recent":
      mapped.sort((a, b) => {
        const ta = a.lastPlayedAt ? new Date(a.lastPlayedAt).getTime() : 0;
        const tb = b.lastPlayedAt ? new Date(b.lastPlayedAt).getTime() : 0;
        return tb - ta;
      });
      break;
    default:
      mapped.sort((a, b) => a.title.localeCompare(b.title));
  }

  // Always: favorites bubble up within the chosen sort
  mapped.sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite));

  return mapped;
}
