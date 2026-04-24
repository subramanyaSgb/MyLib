import { syncWishlistDeals, ItadMissingKeyError } from "@/lib/itad";

export async function POST() {
  try {
    const res = await syncWishlistDeals();
    return Response.json(res);
  } catch (e) {
    if (e instanceof ItadMissingKeyError) {
      return Response.json({ error: e.message }, { status: 412 });
    }
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
