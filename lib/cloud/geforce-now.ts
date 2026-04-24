/**
 * NVIDIA GeForce Now public catalog via GraphQL.
 *  POST https://api-prod.nvidia.com/services/gfngames/v1/gameList
 *  Body = raw GraphQL (no JSON wrapper).
 *
 * Region defaults to GFN_REGION env (IN/US/EU). Paginated via endCursor.
 */

const ENDPOINT = "https://api-prod.nvidia.com/services/gfngames/v1/gameList";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type GfnEntry = {
  title: string;
  store: string | null;
  publisher: string | null;
};

function gfnQuery(country: string, language: string, after: string): string {
  return `{
    apps(country:"${country}" language:"${language}" orderBy:"sortName:ASC" after:"${after}") {
      numberReturned
      pageInfo { endCursor hasNextPage }
      items {
        title
        variants {
          appStore
          publisherName
        }
      }
    }
  }`;
}

export async function fetchGfnCatalog(): Promise<GfnEntry[]> {
  const country = process.env.GFN_REGION ?? "IN";
  const language =
    country === "IN" ? "en_IN"
    : country === "US" ? "en_US"
    : country === "GB" ? "en_GB"
    : country === "EU" ? "en_US"
    : "en_US";

  const out: GfnEntry[] = [];
  let after = "";
  let pages = 0;
  while (true) {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Playdex/0.4",
        origin: "https://www.nvidia.com",
        referer: `https://www.nvidia.com/en-${country.toLowerCase()}/geforce-now/games/`,
      },
      body: gfnQuery(country, language, after),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`GFN HTTP ${res.status}`);
    const j = (await res.json()) as {
      data?: {
        apps?: {
          pageInfo?: { endCursor?: string; hasNextPage?: boolean };
          items?: Array<{
            title: string;
            variants?: Array<{ appStore?: string; publisherName?: string }>;
          }>;
        };
      };
    };
    const apps = j.data?.apps;
    for (const it of apps?.items ?? []) {
      out.push({
        title: it.title,
        store: it.variants?.[0]?.appStore ?? null,
        publisher: it.variants?.[0]?.publisherName ?? null,
      });
    }
    pages++;
    if (!apps?.pageInfo?.hasNextPage || !apps.pageInfo.endCursor) break;
    after = apps.pageInfo.endCursor;
    await sleep(150);
    if (pages > 50) break; // safety
  }
  return out;
}
