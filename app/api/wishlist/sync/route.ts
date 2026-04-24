import { prisma } from "@/lib/db";
import { syncWishlistForAccount } from "@/lib/wishlist-sync";

/**
 * POST /api/wishlist/sync — sync wishlist for every account whose store
 * supports wishlist (steam + gog today). Reports per-account result.
 */
export async function POST() {
  const accounts = await prisma.account.findMany({
    where: { storeId: { in: ["steam", "gog"] } },
    select: { id: true, storeId: true, label: true },
  });
  const results = await Promise.allSettled(
    accounts.map(async (a) => ({ ...a, ...(await syncWishlistForAccount(a.id)) })),
  );
  const summary = results.map((r, i) =>
    r.status === "fulfilled"
      ? { ...r.value, ok: true }
      : { ...accounts[i], ok: false, error: r.reason instanceof Error ? r.reason.message : String(r.reason) },
  );
  return Response.json({ results: summary });
}
