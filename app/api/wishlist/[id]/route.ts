import { z } from "zod";
import { prisma } from "@/lib/db";

const Patch = z.object({
  targetPriceCents: z.number().int().nullable().optional(),
});

export async function PATCH(req: Request, ctx: RouteContext<"/api/wishlist/[id]">) {
  const { id } = await ctx.params;
  const parsed = Patch.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: parsed.error.issues }, { status: 400 });
  const item = await prisma.wishlistItem.update({
    where: { id },
    data: parsed.data,
    select: { id: true, targetPriceCents: true },
  });
  return Response.json({ item });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/wishlist/[id]">) {
  const { id } = await ctx.params;
  await prisma.wishlistItem.delete({ where: { id } });
  return Response.json({ ok: true });
}
