/**
 * Xbox Cloud Gaming (xCloud) catalog via Smart Game Pass APIs.
 * Two-step:
 *   1. SIGL list returns big-IDs of cloud-streamable console games.
 *   2. displaycatalog resolves each bigId to title/publisher/coverUrl.
 */

const SIGL_ALL_CONSOLE = "f6f1f99f-9b49-4ccd-b3bf-4d9767a77f5e";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type XcloudEntry = {
  bigId: string;
  title: string;
  publisher: string | null;
  coverUrl: string | null;
};

export async function fetchXcloudCatalog(): Promise<XcloudEntry[]> {
  const siglRes = await fetch(
    `https://catalog.gamepass.com/sigls/v2?id=${SIGL_ALL_CONSOLE}&language=en-us&market=US`,
    { headers: { "user-agent": "Playdex/0.4" }, cache: "no-store" },
  );
  if (!siglRes.ok) throw new Error(`xCloud SIGL HTTP ${siglRes.status}`);
  const sigl = (await siglRes.json()) as Array<{ id?: string; siglId?: string; title?: string }>;
  const bigIds = sigl.filter((x) => x.id && !x.siglId).map((x) => x.id as string);
  if (bigIds.length === 0) return [];

  const out: XcloudEntry[] = [];
  // displaycatalog supports comma-separated bigIds; chunk to stay under URL limits.
  for (let i = 0; i < bigIds.length; i += 25) {
    const chunk = bigIds.slice(i, i + 25);
    const url = `https://displaycatalog.mp.microsoft.com/v7.0/products?bigIds=${chunk.join(",")}&market=US&languages=en-US`;
    const res = await fetch(url, { headers: { "user-agent": "Playdex/0.4" }, cache: "no-store" });
    if (!res.ok) continue;
    const j = (await res.json()) as {
      Products?: Array<{
        ProductId?: string;
        LocalizedProperties?: Array<{
          ProductTitle?: string;
          PublisherName?: string;
          Images?: Array<{ ImagePurpose?: string; Uri?: string }>;
        }>;
      }>;
    };
    for (const p of j.Products ?? []) {
      const lp = p.LocalizedProperties?.[0];
      if (!lp?.ProductTitle) continue;
      const cover =
        lp.Images?.find((i) => i.ImagePurpose === "Poster" || i.ImagePurpose === "BoxArt")?.Uri ??
        lp.Images?.[0]?.Uri ??
        null;
      out.push({
        bigId: p.ProductId ?? chunk[0],
        title: lp.ProductTitle,
        publisher: lp.PublisherName ?? null,
        coverUrl: cover ? (cover.startsWith("//") ? `https:${cover}` : cover) : null,
      });
    }
    await sleep(80);
  }
  return out;
}
