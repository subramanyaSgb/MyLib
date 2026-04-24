import { syncAccount } from "@/lib/sync";

export async function POST(_req: Request, ctx: RouteContext<"/api/accounts/[id]/sync">) {
  const { id } = await ctx.params;
  try {
    const result = await syncAccount(id);
    return Response.json({ ok: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ ok: false, error: msg }, { status: 400 });
  }
}
