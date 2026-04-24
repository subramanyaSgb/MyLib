import { prisma } from "@/lib/db";

export async function POST(_req: Request, ctx: RouteContext<"/api/free-offers/[id]/dismiss">) {
  const { id } = await ctx.params;
  await prisma.freeOffer.update({ where: { id }, data: { dismissedAt: new Date() } });
  return Response.json({ ok: true });
}
