import { syncFreeOffers } from "@/lib/free-offers";

export async function POST() {
  const res = await syncFreeOffers();
  return Response.json(res);
}
