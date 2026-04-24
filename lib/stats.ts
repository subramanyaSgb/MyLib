import { prisma } from "./db";

export type LibraryStats = {
  totalGames: number;
  totalCopies: number;
  totalPlaytimeMin: number;
  neverPlayed: number;
  favorites: number;
  hidden: number;
  byStore: Array<{ storeId: string; games: number; playtimeMin: number }>;
  topPlayed: Array<{ id: string; title: string; coverUrl: string | null; playtimeMin: number }>;
};

export async function computeStats(): Promise<LibraryStats> {
  const games = await prisma.game.findMany({
    include: {
      copies: {
        include: { owned: { select: { playtimeMin: true, account: { select: { storeId: true } } } } },
      },
    },
  });

  let totalCopies = 0;
  let totalPlaytimeMin = 0;
  let neverPlayed = 0;
  let favorites = 0;
  let hidden = 0;
  const storeAgg = new Map<string, { games: number; playtimeMin: number }>();
  const playedTotals: Array<{ id: string; title: string; coverUrl: string | null; playtimeMin: number }> = [];

  for (const g of games) {
    if (g.isFavorite) favorites++;
    if (g.isHidden) hidden++;
    let gamePlaytime = 0;
    let owned = 0;
    const storesForGame = new Set<string>();
    for (const c of g.copies) {
      for (const o of c.owned) {
        owned++;
        gamePlaytime += o.playtimeMin;
        const s = o.account.storeId;
        storesForGame.add(s);
        const cur = storeAgg.get(s) ?? { games: 0, playtimeMin: 0 };
        cur.playtimeMin += o.playtimeMin;
        storeAgg.set(s, cur);
      }
    }
    if (owned === 0) continue; // not actually owned
    totalCopies += owned;
    totalPlaytimeMin += gamePlaytime;
    if (gamePlaytime === 0) neverPlayed++;
    for (const s of storesForGame) {
      const cur = storeAgg.get(s)!;
      cur.games += 1;
    }
    playedTotals.push({ id: g.id, title: g.title, coverUrl: g.coverUrl, playtimeMin: gamePlaytime });
  }

  const ownedGames = playedTotals.length;
  const topPlayed = playedTotals
    .filter((g) => g.playtimeMin > 0)
    .sort((a, b) => b.playtimeMin - a.playtimeMin)
    .slice(0, 5);

  return {
    totalGames: ownedGames,
    totalCopies,
    totalPlaytimeMin,
    neverPlayed,
    favorites,
    hidden,
    byStore: [...storeAgg.entries()]
      .map(([storeId, v]) => ({ storeId, ...v }))
      .sort((a, b) => b.games - a.games),
    topPlayed,
  };
}
