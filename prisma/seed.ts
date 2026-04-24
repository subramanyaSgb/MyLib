import { prisma } from "../lib/db";
import { STORES } from "../lib/stores";

async function main() {
  for (const s of STORES) {
    await prisma.store.upsert({
      where: { id: s.id },
      update: { name: s.name },
      create: { id: s.id, name: s.name },
    });
  }
  console.log(`Seeded ${STORES.length} stores.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
