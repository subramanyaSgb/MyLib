import { z } from "zod";
import { prisma } from "@/lib/db";

const PatchBody = z.object({
  isFavorite: z.boolean().optional(),
  isHidden: z.boolean().optional(),
  /** "backlog" | "playing" | "done" | "dropped" | null to clear */
  playState: z.enum(["backlog", "playing", "done", "dropped"]).nullable().optional(),
  /** Replace the full tag list. Use the dedicated tag endpoints for delta. */
  tagIds: z.array(z.string()).optional(),
});

export async function PATCH(req: Request, ctx: RouteContext<"/api/games/[id]">) {
  const { id } = await ctx.params;
  const parsed = PatchBody.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: parsed.error.issues }, { status: 400 });
  const { tagIds, ...rest } = parsed.data;

  const game = await prisma.$transaction(async (tx) => {
    if (tagIds) {
      await tx.gameTag.deleteMany({ where: { gameId: id } });
      if (tagIds.length) {
        await tx.gameTag.createMany({
          data: tagIds.map((tagId) => ({ gameId: id, tagId })),
        });
      }
    }
    return tx.game.update({
      where: { id },
      data: rest,
      select: { id: true, isFavorite: true, isHidden: true, playState: true },
    });
  });

  return Response.json({ game });
}
