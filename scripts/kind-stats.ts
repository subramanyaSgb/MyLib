import "dotenv/config";
import { prisma } from "../lib/db";

async function main() {
  const games = await prisma.game.groupBy({
    by: ["kind"],
    _count: { _all: true },
  });
  console.log("Game by kind:");
  for (const g of games) console.log(`  ${g.kind ?? "(null)"}  →  ${g._count._all}`);

  const hidden = await prisma.game.count({ where: { isHidden: true } });
  const visible = await prisma.game.count({ where: { isHidden: false } });
  console.log(`\nHidden: ${hidden}  Visible: ${visible}`);
}

main().finally(() => prisma.$disconnect());
