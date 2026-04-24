import "dotenv/config";
import { prisma } from "../lib/db";
async function main() {
  const owned = await prisma.gameOnStore.findMany({
    where: { storeId: "epic", owned: { some: {} } },
    include: { game: true },
    take: 200,
  });
  const hosts: Record<string, number> = {};
  for (const g of owned) {
    if (!g.game.coverUrl) continue;
    try {
      const h = new URL(g.game.coverUrl).hostname;
      hosts[h] = (hosts[h] ?? 0) + 1;
    } catch { /* skip */ }
  }
  console.log("Epic cover hostnames:");
  for (const [h, n] of Object.entries(hosts).sort((a, b) => b[1] - a[1])) console.log(`  ${n}x ${h}`);
  console.log("\nSample cover URLs (first 3):");
  for (const g of owned.slice(0, 3)) console.log(`  ${g.game.title}\n    ${g.game.coverUrl}`);
}
main().finally(() => prisma.$disconnect());
