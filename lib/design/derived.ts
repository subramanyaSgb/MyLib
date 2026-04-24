import { prisma } from "@/lib/db";

export type DerivedAccount = {
  id: string;
  storeId: string;
  label: string;
  handle: string; // displayName preferred, falls back to label
  email: string | null;
  primary: boolean;
  avatarHueSeed: string;
  gameCount: number;
  lastSyncAt: Date | null;
};

export type DerivedOwner = {
  acc: string;
  storeId: string;
  hours: number;
  lastPlayed: string;        // humanized
  lastPlayedAt: Date | null; // raw for sorting
  achievements: string | null;     // "N/M" if known
  achievementsPct: number | null;  // 0..100
  preorder: boolean;
};

export type DerivedGame = {
  id: string;
  title: string;
  dev: string | null;
  genre: string | null;
  year: number | null;
  tags: string[];
  coverUrl: string | null;
  isFavorite: boolean;
  isHidden: boolean;
  mergedPrimaryAccountId: string | null;
  cloudGfn: boolean;
  cloudXcloud: boolean;
  /** Synthetic price ($/copy) — used only for "redundant spend" until real prices wired up. */
  price: number;
  /** Visible owners after applying mergedPrimaryAccountId (used for grid display). */
  ownedBy: DerivedOwner[];
  /** All owners regardless of merge state (used for stats + duplicates count). */
  allOwners: DerivedOwner[];
  totalHours: number;
};

function humanizeDate(d: Date | null): string {
  if (!d) return "Never";
  const ms = Date.now() - d.getTime();
  const min = ms / 60_000;
  const hr = min / 60;
  const day = hr / 24;
  const wk = day / 7;
  const mo = day / 30;
  const yr = day / 365;
  if (min < 60) return "Today";
  if (hr < 24) return `${Math.floor(hr)} hr ago`;
  if (day < 2) return "Yesterday";
  if (day < 7) return `${Math.floor(day)} days ago`;
  if (wk < 4) return `${Math.floor(wk)} wk ago`;
  if (mo < 12) return `${Math.floor(mo)} mo ago`;
  return `${Math.floor(yr)} yr ago`;
}

export async function getAccounts(): Promise<DerivedAccount[]> {
  const rows = await prisma.account.findMany({
    orderBy: [{ storeId: "asc" }, { createdAt: "asc" }],
    include: { _count: { select: { owned: true } } },
  });
  // First account per store is "primary".
  const seenStore = new Set<string>();
  return rows.map((r) => {
    const isPrimary = !seenStore.has(r.storeId);
    seenStore.add(r.storeId);
    return {
      id: r.id,
      storeId: r.storeId,
      label: r.label,
      handle: r.displayName ?? r.label,
      email: null,
      primary: isPrimary,
      avatarHueSeed: r.id,
      gameCount: r._count.owned,
      lastSyncAt: r.lastSyncAt,
    };
  });
}

/** Default unit price used when computing "redundant spend" for duplicates. */
const SYNTHETIC_PRICE = 20;

export async function getGames(filters?: {
  q?: string;
  storeId?: string;
  accountId?: string;
  unplayed?: boolean;
  favoritesOnly?: boolean;
  showHidden?: boolean;
  genre?: string;
  cloudOnly?: "gfn" | "xcloud" | "any";
}): Promise<DerivedGame[]> {
  const games = await prisma.game.findMany({
    where: {
      ...(filters?.q ? { normTitle: { contains: filters.q.toLowerCase() } } : {}),
      ...(filters?.favoritesOnly ? { isFavorite: true } : {}),
      ...(filters?.showHidden ? {} : { isHidden: false }),
      ...(filters?.genre ? { genre: filters.genre } : {}),
      ...(filters?.cloudOnly === "gfn" ? { cloudGfn: true } : {}),
      ...(filters?.cloudOnly === "xcloud" ? { cloudXcloud: true } : {}),
      ...(filters?.cloudOnly === "any" ? { OR: [{ cloudGfn: true }, { cloudXcloud: true }] } : {}),
    },
    include: {
      copies: {
        include: {
          owned: { include: { account: { select: { id: true, storeId: true } } } },
        },
      },
    },
  });

  return games
    .map<DerivedGame>((g) => {
      const allOwners: DerivedOwner[] = g.copies.flatMap((c) =>
        c.owned.map((o) => {
          const hasAch = o.achievementsTotal != null && o.achievementsTotal > 0;
          return {
            acc: o.account.id,
            storeId: o.account.storeId,
            hours: Number((o.playtimeMin / 60).toFixed(1)),
            lastPlayed: humanizeDate(o.lastPlayedAt),
            lastPlayedAt: o.lastPlayedAt,
            achievements: hasAch ? `${o.achievementsUnlocked ?? 0}/${o.achievementsTotal}` : null,
            achievementsPct: hasAch
              ? Math.round(((o.achievementsUnlocked ?? 0) / (o.achievementsTotal as number)) * 100)
              : null,
            preorder: false,
          };
        }),
      );
      // If a primary is pinned, hide the other owners from the grid view.
      const ownedBy = g.mergedPrimaryAccountId
        ? allOwners.filter((o) => o.acc === g.mergedPrimaryAccountId)
        : allOwners;
      const totalHours = allOwners.reduce((s, o) => s + o.hours, 0);
      let tags: string[] = [];
      if (g.tagsJson) {
        try {
          const v = JSON.parse(g.tagsJson);
          if (Array.isArray(v)) tags = v.map(String);
        } catch { /* ignore */ }
      }
      return {
        id: g.id,
        title: g.title,
        dev: g.dev,
        genre: g.genre,
        year: g.releaseYear,
        tags,
        coverUrl: g.coverUrl,
        isFavorite: g.isFavorite,
        isHidden: g.isHidden,
        mergedPrimaryAccountId: g.mergedPrimaryAccountId,
        cloudGfn: g.cloudGfn,
        cloudXcloud: g.cloudXcloud,
        price: SYNTHETIC_PRICE,
        ownedBy,
        allOwners,
        totalHours,
      };
    })
    .filter((g) => g.allOwners.length > 0)
    .filter((g) => (filters?.storeId ? g.allOwners.some((o) => o.storeId === filters.storeId) : true))
    .filter((g) => (filters?.accountId ? g.allOwners.some((o) => o.acc === filters.accountId) : true))
    .filter((g) => (filters?.unplayed ? g.allOwners.every((o) => o.hours === 0) : true));
}

export type DerivedTotals = {
  totalGames: number;
  totalCopies: number;
  totalHours: number;
  duplicates: DerivedGame[];
  unplayed: DerivedGame[];
  dupeSavings: number;
};

export function computeTotals(games: DerivedGame[]): DerivedTotals {
  // Duplicate count uses ALL owners (so merged-into-primary games still count
  // as duplicates while remaining hidden from grid).
  const duplicates = games.filter((g) => g.allOwners.length > 1);
  return {
    totalGames: games.length,
    totalCopies: games.reduce((t, g) => t + g.allOwners.length, 0),
    totalHours: games.reduce((t, g) => t + g.totalHours, 0),
    duplicates,
    unplayed: games.filter((g) => g.allOwners.every((o) => o.hours === 0)),
    dupeSavings: duplicates.reduce((t, g) => t + (g.allOwners.length - 1) * g.price, 0),
  };
}

/** Top N genres present in the library, with game counts. */
export async function getTopGenres(limit = 8): Promise<Array<{ genre: string; count: number }>> {
  const rows = await prisma.game.groupBy({
    by: ["genre"],
    where: { genre: { not: null }, isHidden: false },
    _count: { _all: true },
    orderBy: { _count: { id: "desc" } },
    take: limit,
  });
  return rows
    .filter((r): r is { genre: string; _count: { _all: number } } => !!r.genre)
    .map((r) => ({ genre: r.genre, count: r._count._all }));
}

export function totalPlaytime(g: DerivedGame): number { return g.totalHours; }
export function maxPlayedAccount(g: DerivedGame): DerivedOwner {
  return g.allOwners.reduce((a, o) => (o.hours > a.hours ? o : a), g.allOwners[0]);
}
