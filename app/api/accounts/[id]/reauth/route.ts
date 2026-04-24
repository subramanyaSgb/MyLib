import { z } from "zod";
import { prisma } from "@/lib/db";
import { encryptJSON } from "@/lib/crypto";
import { exchangeCodeForTokens, extractGogCode } from "@/lib/connectors/gog";
import { exchangeEpicCode, extractEpicCode } from "@/lib/connectors/epic";

const Body = z.object({
  gogCodeOrUrl: z.string().optional(),
  epicCodeOrJson: z.string().optional(),
});

export async function POST(req: Request, ctx: RouteContext<"/api/accounts/[id]/reauth">) {
  const { id } = await ctx.params;
  const account = await prisma.account.findUnique({ where: { id } });
  if (!account) return Response.json({ error: "Account not found" }, { status: 404 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: parsed.error.issues }, { status: 400 });

  try {
    let credsEnc: string;
    if (account.storeId === "gog") {
      if (!parsed.data.gogCodeOrUrl) return Response.json({ error: "gogCodeOrUrl required" }, { status: 400 });
      const code = extractGogCode(parsed.data.gogCodeOrUrl);
      const creds = await exchangeCodeForTokens(code);
      credsEnc = encryptJSON(creds);
    } else if (account.storeId === "epic") {
      if (!parsed.data.epicCodeOrJson) return Response.json({ error: "epicCodeOrJson required" }, { status: 400 });
      const code = extractEpicCode(parsed.data.epicCodeOrJson);
      const creds = await exchangeEpicCode(code);
      credsEnc = encryptJSON(creds);
    } else {
      return Response.json({ error: `Re-auth not supported for store ${account.storeId}` }, { status: 400 });
    }

    await prisma.account.update({
      where: { id },
      data: { credsEnc, lastError: null, lastSyncOk: true },
    });
    return Response.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 400 });
  }
}
