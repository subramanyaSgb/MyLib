import { prisma } from "../lib/db";

async function main() {
  // Per-store: total games actually OWNED (with at least one OwnedCopy) and how many have dev.
  for (const sid of ["steam", "gog", "epic"]) {
    const ownedGOS = await prisma.gameOnStore.findMany({
      where: { storeId: sid, owned: { some: {} } },
      include: { game: true },
    });
    const total = ownedGOS.length;
    const withDev = ownedGOS.filter((g) => g.game.dev).length;
    const withGenre = ownedGOS.filter((g) => g.game.genre).length;
    const withYear = ownedGOS.filter((g) => g.game.releaseYear).length;
    console.log(`${sid}: ownedTotal=${total}  withDev=${withDev}  withGenre=${withGenre}  withYear=${withYear}`);
  }
  const ach = await prisma.ownedCopy.count({ where: { achievementsTotal: { not: null } } });
  console.log(`\nAchievements rows: ${ach}`);
}

main().finally(() => prisma.$disconnect());
