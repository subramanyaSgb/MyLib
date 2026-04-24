import { z } from "zod";
import { prisma } from "@/lib/db";

const Patch = z.object({
  isActive: z.boolean().optional(),
});

export async function PATCH(req: Request, ctx: RouteContext<"/api/subs/[id]">) {
  const { id } = await ctx.params;
  const parsed = Patch.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: parsed.error.issues }, { status: 400 });
  const sub = await prisma.subscription.update({ where: { id }, data: parsed.data });
  return Response.json({ sub });
}
