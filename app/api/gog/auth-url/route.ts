import { getGogAuthUrl } from "@/lib/connectors/gog";

export async function GET() {
  return Response.json({ url: getGogAuthUrl() });
}
