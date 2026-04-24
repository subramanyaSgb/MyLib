import { prisma } from "@/lib/db";

/**
 * Drop GameOnStore rows with zero OwnedCopy, then drop Game rows with zero
 * GameOnStore. Safe to run anytime — only affects rows nobody references.
 */
export async function POST() {
  const orphanGOS = await prisma.gameOnStore.deleteMany({
    where: { owned: { none: {} } },
  });
  const orphanGames = await prisma.game.deleteMany({
    where: { copies: { none: {} } },
  });
  return Response.json({
    ok: true,
    removedGameOnStore: orphanGOS.count,
    removedGames: orphanGames.count,
  });
}
