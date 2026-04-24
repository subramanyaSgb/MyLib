import { z } from "zod";
import { prisma } from "@/lib/db";

const Body = z.object({
  keepGameId: z.string(),
  mergeGameIds: z.array(z.string()).min(1),
});

/**
 * Merge other games into `keepGameId`:
 *  - Reassign all GameOnStore.gameId → keepGameId
 *  - Delete the merged Game rows
 * OwnedCopy is reached via GameOnStore so no relinking needed.
 */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: parsed.error.issues }, { status: 400 });
  const { keepGameId, mergeGameIds } = parsed.data;

  if (mergeGameIds.includes(keepGameId)) {
    return Response.json({ error: "keepGameId cannot also be in mergeGameIds" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.gameOnStore.updateMany({
      where: { gameId: { in: mergeGameIds } },
      data: { gameId: keepGameId },
    });
    await tx.game.deleteMany({ where: { id: { in: mergeGameIds } } });
  });

  return Response.json({ ok: true, merged: mergeGameIds.length });
}
