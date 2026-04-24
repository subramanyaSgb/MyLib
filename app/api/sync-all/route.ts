import { prisma } from "@/lib/db";
import { syncAccount } from "@/lib/sync";

export async function POST() {
  const accounts = await prisma.account.findMany({ select: { id: true, label: true, storeId: true } });

  const results = await Promise.allSettled(
    accounts.map(async (a) => {
      const r = await syncAccount(a.id);
      return { ...a, ...r };
    }),
  );

  const summary = results.map((r, i) => {
    const acc = accounts[i];
    if (r.status === "fulfilled") {
      return { ...r.value, ok: true };
    }
    return { ...acc, ok: false, error: r.reason instanceof Error ? r.reason.message : String(r.reason) };
  });

  return Response.json({ results: summary });
}
