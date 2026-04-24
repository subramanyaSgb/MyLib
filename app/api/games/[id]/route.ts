import { z } from "zod";
import { prisma } from "@/lib/db";

const PatchBody = z.object({
  isFavorite: z.boolean().optional(),
  isHidden: z.boolean().optional(),
});

export async function PATCH(req: Request, ctx: RouteContext<"/api/games/[id]">) {
  const { id } = await ctx.params;
  const parsed = PatchBody.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: parsed.error.issues }, { status: 400 });

  const game = await prisma.game.update({
    where: { id },
    data: parsed.data,
    select: { id: true, isFavorite: true, isHidden: true },
  });
  return Response.json({ game });
}
