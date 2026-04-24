import { prisma } from "@/lib/db";

export async function DELETE(_req: Request, ctx: RouteContext<"/api/accounts/[id]">) {
  const { id } = await ctx.params;
  await prisma.account.delete({ where: { id } });
  return Response.json({ ok: true });
}
