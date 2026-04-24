import { z } from "zod";
import { prisma } from "@/lib/db";

const Body = z.object({
  primaryAccountId: z.string().nullable(),
});

/**
 * Soft-merge: pin a primary account for this canonical Game. Library views
 * suppress the other accounts' OwnedCopies in the grid (still counted in stats).
 * Pass primaryAccountId=null to undo the merge.
 */
export async function POST(req: Request, ctx: RouteContext<"/api/games/[id]/consolidate">) {
  const { id } = await ctx.params;
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: parsed.error.issues }, { status: 400 });
  const { primaryAccountId } = parsed.data;

  if (primaryAccountId) {
    // Verify the chosen account actually owns a copy.
    const owned = await prisma.ownedCopy.findFirst({
      where: { accountId: primaryAccountId, gameOnStore: { gameId: id } },
      select: { id: true },
    });
    if (!owned) return Response.json({ error: "That account does not own this game" }, { status: 400 });
  }

  await prisma.game.update({
    where: { id },
    data: { mergedPrimaryAccountId: primaryAccountId },
  });
  return Response.json({ ok: true });
}
