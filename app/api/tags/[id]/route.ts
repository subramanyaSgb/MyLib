import { z } from "zod";
import { prisma } from "@/lib/db";

const Patch = z.object({
  name: z.string().trim().min(1).max(40).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
});

export async function PATCH(req: Request, ctx: RouteContext<"/api/tags/[id]">) {
  const { id } = await ctx.params;
  const parsed = Patch.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: parsed.error.issues }, { status: 400 });
  const tag = await prisma.tag.update({ where: { id }, data: parsed.data });
  return Response.json({ tag });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/tags/[id]">) {
  const { id } = await ctx.params;
  await prisma.tag.delete({ where: { id } });
  return Response.json({ ok: true });
}
