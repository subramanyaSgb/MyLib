import { getEpicAuthUrl } from "@/lib/connectors/epic";

export async function GET() {
  return Response.json({ url: getEpicAuthUrl() });
}
