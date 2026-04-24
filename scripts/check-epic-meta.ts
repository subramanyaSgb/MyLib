import "dotenv/config";
import { prisma } from "../lib/db";

async function main() {
  // Owned Epic games with no cover.
  const allOwnedEpic = await prisma.gameOnStore.findMany({
    where: { storeId: "epic", owned: { some: {} } },
    include: { game: true },
  });
  const noCover = allOwnedEpic.filter((g) => !g.game.coverUrl);
  const noDev = allOwnedEpic.filter((g) => !g.game.dev);
  const noGenre = allOwnedEpic.filter((g) => !g.game.genre);
  console.log(`Epic owned total: ${allOwnedEpic.length}`);
  console.log(`  no cover: ${noCover.length}`);
  console.log(`  no dev: ${noDev.length}`);
  console.log(`  no genre: ${noGenre.length}`);
  console.log(`\nFirst 10 no-cover titles:`);
  for (const g of noCover.slice(0, 10)) console.log(` - ${g.game.title}`);
}

main().finally(() => prisma.$disconnect());
