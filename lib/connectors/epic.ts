/**
 * Epic Games connector — uses Epic Games Launcher OAuth client.
 *
 * Reverse-engineered from legendary / rare / heroic-games-launcher. No public
 * dev API. Epic's login redirect page just prints JSON with an
 * `authorizationCode` — user copies it and pastes into our app.
 *
 * Endpoints:
 *   auth:   https://account-public-service-prod.ol.epicgames.com/account/api/oauth/token
 *   lib:    https://library-service.live.use1a.on.epicgames.com/library/api/public/items
 *   catalog:https://catalog-public-service-prod06.ol.epicgames.com/catalog/api/shared/namespace/:ns/bulk/items
 */

// EGL "fortniteNewSwitchGameClient" / Launcher credentials (public).
const EGL_CLIENT_ID = "34a02cf8f4414e29b15921876da36f9a";
const EGL_CLIENT_SECRET = "daafbccc737745039dffe53d94fc76cf";

const AUTH_URL = "https://account-public-service-prod.ol.epicgames.com/account/api/oauth/token";
const LIB_URL = "https://library-service.live.use1a.on.epicgames.com/library/api/public/items";
const CATALOG_URL = "https://catalog-public-service-prod06.ol.epicgames.com/catalog/api/shared/namespace";

export type EpicCreds = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // epoch ms
  accountId: string;
  displayName: string;
};

/** URL the user opens to log in. After login, Epic shows a JSON page with authorizationCode. */
export function getEpicAuthUrl(): string {
  const redirect = `https://www.epicgames.com/id/api/redirect?clientId=${EGL_CLIENT_ID}&responseType=code`;
  return `https://www.epicgames.com/id/login?redirectUrl=${encodeURIComponent(redirect)}`;
}

/** Accepts raw code, JSON blob, or full URL — returns just the code. */
export function extractEpicCode(input: string): string {
  const trimmed = input.trim();
  // 32-char hex code?
  if (/^[a-f0-9]{32}$/i.test(trimmed)) return trimmed;
  // JSON with authorizationCode field
  try {
    const obj = JSON.parse(trimmed);
    if (typeof obj === "object" && obj && typeof obj.authorizationCode === "string") {
      return obj.authorizationCode;
    }
  } catch {
    /* not JSON */
  }
  // URL with ?code=...
  try {
    const url = new URL(trimmed);
    const code = url.searchParams.get("code") ?? url.searchParams.get("authorizationCode");
    if (code) return code;
  } catch {
    /* not URL */
  }
  // Extract any 32-hex substring as last resort
  const m = trimmed.match(/[a-f0-9]{32}/i);
  if (m) return m[0];
  throw new Error("Could not find Epic authorization code in input");
}

function basicAuth(): string {
  return "Basic " + Buffer.from(`${EGL_CLIENT_ID}:${EGL_CLIENT_SECRET}`).toString("base64");
}

async function tokenRequest(body: URLSearchParams): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  account_id: string;
  displayName?: string;
}> {
  const res = await fetch(AUTH_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuth(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Epic OAuth failed (${res.status}): ${t.slice(0, 300)}`);
  }
  return res.json();
}

export async function exchangeEpicCode(code: string): Promise<EpicCreds> {
  const r = await tokenRequest(
    new URLSearchParams({ grant_type: "authorization_code", code }),
  );
  return {
    accessToken: r.access_token,
    refreshToken: r.refresh_token,
    expiresAt: Date.now() + r.expires_in * 1000,
    accountId: r.account_id,
    displayName: r.displayName ?? "Epic user",
  };
}

export async function refreshEpicToken(creds: EpicCreds): Promise<EpicCreds> {
  const r = await tokenRequest(
    new URLSearchParams({ grant_type: "refresh_token", refresh_token: creds.refreshToken }),
  );
  return {
    accessToken: r.access_token,
    refreshToken: r.refresh_token,
    expiresAt: Date.now() + r.expires_in * 1000,
    accountId: r.account_id,
    displayName: r.displayName ?? creds.displayName,
  };
}

export async function ensureFreshEpic(creds: EpicCreds): Promise<EpicCreds> {
  if (Date.now() > creds.expiresAt - 5 * 60_000) return refreshEpicToken(creds);
  return creds;
}

function authHeaders(creds: EpicCreds): HeadersInit {
  return { Authorization: `Bearer ${creds.accessToken}` };
}

type LibraryRecord = {
  namespace: string;
  catalogItemId: string;
  appName: string;
  productId?: string;
  sandboxName?: string;
  recordType?: string;
};

async function getLibraryRecords(creds: EpicCreds): Promise<LibraryRecord[]> {
  const records: LibraryRecord[] = [];
  let cursor: string | undefined;
  // Paginate. Epic caps limit around 100-200.
  do {
    const params = new URLSearchParams({ includeMetadata: "true", limit: "100" });
    if (cursor) params.set("cursor", cursor);
    const res = await fetch(`${LIB_URL}?${params}`, { headers: authHeaders(creds) });
    if (!res.ok) throw new Error(`Epic library HTTP ${res.status}`);
    const j = (await res.json()) as {
      records?: LibraryRecord[];
      responseMetadata?: { nextCursor?: string };
    };
    for (const r of j.records ?? []) records.push(r);
    cursor = j.responseMetadata?.nextCursor;
  } while (cursor);
  return records;
}

type CatalogItem = {
  title: string;
  keyImages?: Array<{ type: string; url: string }>;
  categories?: Array<{ path: string }>;
  mainGameItem?: { id: string } | null;
  developer?: string;
  productSlug?: string;
  releaseInfo?: Array<{ dateAdded?: string }>;
  creationDate?: string;
};

async function getCatalogBulk(
  creds: EpicCreds,
  namespace: string,
  ids: string[],
): Promise<Record<string, CatalogItem>> {
  const out: Record<string, CatalogItem> = {};
  // Catalog endpoint takes ?id= repeated; chunk to stay under URL limits.
  for (let i = 0; i < ids.length; i += 20) {
    const chunk = ids.slice(i, i + 20);
    const params = new URLSearchParams();
    for (const id of chunk) params.append("id", id);
    params.set("country", "US");
    params.set("locale", "en-US");
    const res = await fetch(
      `${CATALOG_URL}/${encodeURIComponent(namespace)}/bulk/items?${params}`,
      { headers: authHeaders(creds) },
    );
    if (!res.ok) continue; // silently skip broken namespace
    const j = (await res.json()) as Record<string, CatalogItem>;
    Object.assign(out, j);
  }
  return out;
}

export type EpicGame = {
  catalogItemId: string;
  title: string;
  coverUrl: string | null;
  storeUrl: string;
  dev: string | null;
  genre: string | null;
  year: number | null;
  tags: string[];
  kind: string | null;
};

/** Returns BASE GAMES only (filters DLC, addons, plugins, Unreal Engine assets). */
export async function getOwnedEpicGames(creds: EpicCreds): Promise<EpicGame[]> {
  const records = await getLibraryRecords(creds);
  if (records.length === 0) return [];

  // Group record catalogIds by namespace for batched catalog lookup.
  const byNs = records.reduce<Record<string, string[]>>((acc, r) => {
    (acc[r.namespace] ??= []).push(r.catalogItemId);
    return acc;
  }, {});

  const catalog: Record<string, { item: CatalogItem; namespace: string }> = {};
  for (const [ns, ids] of Object.entries(byNs)) {
    const items = await getCatalogBulk(creds, ns, ids);
    for (const [id, item] of Object.entries(items)) catalog[id] = { item, namespace: ns };
  }

  const games: EpicGame[] = [];
  for (const r of records) {
    const entry = catalog[r.catalogItemId];
    if (!entry) continue;
    const { item } = entry;

    const isGameCategory = item.categories?.some(
      (c) => c.path === "games" || c.path.startsWith("games/"),
    );
    const isAddon = item.categories?.some((c) => c.path.startsWith("addons"));
    if (!isGameCategory) continue;
    if (isAddon) continue;
    if (item.mainGameItem) continue; // DLC/bundle child

    const coverUrl =
      item.keyImages?.find((i) => i.type === "DieselGameBoxTall")?.url ??
      item.keyImages?.find((i) => i.type === "OfferImageTall")?.url ??
      item.keyImages?.find((i) => i.type === "Thumbnail")?.url ??
      item.keyImages?.[0]?.url ??
      null;

    const slug = item.productSlug ?? r.sandboxName ?? "";
    const storeUrl = slug
      ? `https://store.epicgames.com/en-US/p/${slug.replace(/\/home$/, "")}`
      : `https://store.epicgames.com/en-US/browse?q=${encodeURIComponent(item.title)}`;

    // Genre = the most specific category path beyond "games/"
    const genrePaths = (item.categories ?? [])
      .map((c) => c.path)
      .filter((p) => p.startsWith("games/") && p !== "games")
      .map((p) => p.split("/").slice(-1)[0]);
    const genre = genrePaths[0]?.replace(/_/g, " ") ?? null;
    const releaseStr = item.releaseInfo?.[0]?.dateAdded ?? item.creationDate ?? "";
    const yearMatch = releaseStr.match(/(19|20)\d{2}/);

    // Kind: base game vs anything else.
    const isBase = item.categories?.some((c) => c.path === "games/edition/base");
    const isEdition = item.categories?.some((c) => c.path === "games/edition");
    const kind = isBase ? "game" : isEdition ? "dlc" : "game";

    games.push({
      catalogItemId: r.catalogItemId,
      title: item.title,
      coverUrl,
      storeUrl,
      dev: item.developer ?? null,
      genre: genre ? capitalize(genre) : null,
      year: yearMatch ? Number(yearMatch[0]) : null,
      tags: genrePaths.map((p) => capitalize(p.replace(/_/g, " "))).slice(0, 6),
      kind,
    });
  }

  // Dedupe by catalogItemId
  const seen = new Set<string>();
  return games.filter((g) => {
    if (seen.has(g.catalogItemId)) return false;
    seen.add(g.catalogItemId);
    return true;
  });
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Enrich missing fields by hitting the public Epic Store GraphQL search.
 * Cloudflare-protected — needs a browser UA. Returns null on miss.
 */
export async function enrichEpicViaStore(title: string): Promise<{
  dev: string | null;
  genre: string | null;
  year: number | null;
  tags: string[];
  coverUrl: string | null;
} | null> {
  const body = {
    query: `query($k:String!,$c:String!,$l:String!){Catalog{searchStore(keywords:$k,country:$c,locale:$l,count:5){elements{id title developerDisplayName publisherDisplayName categories{path} releaseDate keyImages{type url}}}}}`,
    variables: { k: title, c: "US", l: "en-US" },
  };
  let res: Response;
  try {
    res = await fetch("https://store.epicgames.com/graphql", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Mylibrary/0.4",
      },
      body: JSON.stringify(body),
    });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const j = (await res.json()) as {
    data?: {
      Catalog?: {
        searchStore?: {
          elements?: Array<{
            title: string;
            developerDisplayName?: string | null;
            publisherDisplayName?: string | null;
            categories?: Array<{ path: string }>;
            releaseDate?: string | null;
          }>;
        };
      };
    };
  };
  const elements = (j.data?.Catalog?.searchStore?.elements ?? []) as Array<{
    title: string;
    developerDisplayName?: string | null;
    publisherDisplayName?: string | null;
    categories?: Array<{ path: string }>;
    releaseDate?: string | null;
    keyImages?: Array<{ type: string; url: string }>;
  }>;
  // Match by exact title (case-insensitive). Fall back to first base-game.
  const norm = (s: string) => s.toLowerCase().replace(/[™®©]/g, "").trim();
  const exact = elements.find((e) => norm(e.title) === norm(title));
  const baseGame = elements.find((e) =>
    e.categories?.some((c) => c.path === "games/edition/base"),
  );
  const pick = exact ?? baseGame ?? elements[0];
  if (!pick) return null;

  const dev = pick.developerDisplayName ?? pick.publisherDisplayName ?? null;
  const genrePaths = (pick.categories ?? [])
    .map((c) => c.path)
    .filter((p) => p.startsWith("games/") && p !== "games" && !p.startsWith("games/edition"))
    .map((p) => p.split("/").slice(-1)[0]);
  const genre = genrePaths[0] ? capitalize(genrePaths[0].replace(/_/g, " ")) : null;
  const yearMatch = pick.releaseDate?.match(/(19|20)\d{2}/);
  const coverUrl =
    pick.keyImages?.find((i) => i.type === "DieselGameBoxTall")?.url ??
    pick.keyImages?.find((i) => i.type === "OfferImageTall")?.url ??
    pick.keyImages?.find((i) => i.type === "DieselStoreFrontTall")?.url ??
    pick.keyImages?.find((i) => i.type === "Thumbnail")?.url ??
    pick.keyImages?.[0]?.url ??
    null;
  return {
    dev,
    genre,
    year: yearMatch ? Number(yearMatch[0]) : null,
    tags: genrePaths.map((p) => capitalize(p.replace(/_/g, " "))).slice(0, 6),
    coverUrl,
  };
}
