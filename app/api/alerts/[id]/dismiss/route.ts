import { prisma } from "@/lib/db";

export async function POST(_req: Request, ctx: RouteContext<"/api/alerts/[id]/dismiss">) {
  const { id } = await ctx.params;
  await prisma.priceAlert.update({
    where: { id },
    data: { dismissedAt: new Date() },
  });
  return Response.json({ ok: true });
}
