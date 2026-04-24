import "dotenv/config";
import { prisma } from "../lib/db";

async function main() {
  const totalGames = await prisma.game.count();
  const totalCopies = await prisma.ownedCopy.count();

  // Per-account owned counts
  const accs = await prisma.account.findMany({
    include: { _count: { select: { owned: true } } },
  });
  console.log(`unique games: ${totalGames}`);
  console.log(`owned copies: ${totalCopies}`);
  console.log(`\nPer account:`);
  let sum = 0;
  for (const a of accs) {
    console.log(`  ${a.storeId}/${a.label} (${a.displayName ?? "?"})  →  ${a._count.owned} copies`);
    sum += a._count.owned;
  }
  console.log(`  SUM: ${sum}`);

  // Games owned by N accounts
  const games = await prisma.game.findMany({ include: { copies: { include: { owned: true } } } });
  const buckets: Record<number, number> = {};
  for (const g of games) {
    const owners = g.copies.flatMap((c) => c.owned).length;
    if (owners === 0) continue;
    buckets[owners] = (buckets[owners] ?? 0) + 1;
  }
  console.log("\nGames by owner count:");
  for (const k of Object.keys(buckets).map(Number).sort((a, b) => a - b)) {
    console.log(`  owned ${k}× → ${buckets[k]} games`);
  }
}

main().finally(() => prisma.$disconnect());
