import { z } from "zod";
import { upsertCatalog } from "@/lib/subscriptions";

const Body = z.object({
  titles: z.array(z.string().min(1)),
});

export async function PUT(req: Request, ctx: RouteContext<"/api/subs/[id]/catalog">) {
  const { id } = await ctx.params;
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: parsed.error.issues }, { status: 400 });
  const res = await upsertCatalog(id, parsed.data.titles);
  return Response.json(res);
}
