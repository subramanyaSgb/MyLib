/**
 * GOG connector — uses GOG Galaxy OAuth client.
 *
 * No public dev API. We piggyback on GOG Galaxy's client_id/secret (same approach
 * as heroic-games-launcher / minigalaxy / gogdl). Since GOG registered redirect
 * is `embed.gog.com/on_login_success`, we cannot host our own callback; user must
 * paste the redirected URL back into the app.
 *
 * Docs reverse-engineered from: https://gogapidocs.readthedocs.io/en/latest/
 */

const GALAXY_CLIENT_ID = "46899977096215655";
const GALAXY_CLIENT_SECRET = "9d85c43b1482497dbbce61f6e4aa173a433796eeae2ca8c5f6129f2dc4de46d9";
const REDIRECT_URI = "https://embed.gog.com/on_login_success?origin=client";

export type GogCreds = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // epoch ms
  userId: string;
};

export function getGogAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: GALAXY_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    layout: "client2",
  });
  return `https://auth.gog.com/auth?${params}`;
}

/** Accepts raw code OR the full redirect URL — extracts code. */
export function extractGogCode(input: string): string {
  const trimmed = input.trim();
  if (!trimmed.includes("://")) return trimmed;
  try {
    const url = new URL(trimmed);
    const code = url.searchParams.get("code");
    if (!code) throw new Error("No 'code' query param in URL");
    return code;
  } catch {
    throw new Error("Could not parse GOG redirect URL");
  }
}

async function exchangeToken(params: Record<string, string>): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user_id: string;
}> {
  const body = new URLSearchParams({
    client_id: GALAXY_CLIENT_ID,
    client_secret: GALAXY_CLIENT_SECRET,
    ...params,
  });
  const res = await fetch("https://auth.gog.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`GOG token exchange failed (${res.status}): ${t.slice(0, 200)}`);
  }
  return res.json();
}

export async function exchangeCodeForTokens(code: string): Promise<GogCreds> {
  const r = await exchangeToken({
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI,
  });
  return {
    accessToken: r.access_token,
    refreshToken: r.refresh_token,
    expiresAt: Date.now() + r.expires_in * 1000,
    userId: String(r.user_id),
  };
}

export async function refreshGogToken(creds: GogCreds): Promise<GogCreds> {
  const r = await exchangeToken({
    grant_type: "refresh_token",
    refresh_token: creds.refreshToken,
  });
  return {
    accessToken: r.access_token,
    refreshToken: r.refresh_token,
    expiresAt: Date.now() + r.expires_in * 1000,
    userId: creds.userId,
  };
}

/** Ensures creds have a valid access token; returns possibly-refreshed creds. */
export async function ensureFreshGog(creds: GogCreds): Promise<GogCreds> {
  // Refresh ~5 minutes before expiry
  if (Date.now() > creds.expiresAt - 5 * 60_000) {
    return refreshGogToken(creds);
  }
  return creds;
}

function authHeaders(creds: GogCreds): HeadersInit {
  return { Authorization: `Bearer ${creds.accessToken}` };
}

export async function getGogUserData(creds: GogCreds): Promise<{
  username: string;
  avatarUrl: string | null;
  userId: string;
}> {
  const res = await fetch("https://embed.gog.com/userData.json", { headers: authHeaders(creds) });
  if (!res.ok) throw new Error(`GOG userData.json HTTP ${res.status}`);
  const j = (await res.json()) as {
    username?: string;
    userId?: string;
    avatar?: string;
    galaxyUserId?: string;
  };
  return {
    username: j.username ?? "GOG user",
    avatarUrl: j.avatar ?? null,
    userId: j.galaxyUserId ?? j.userId ?? creds.userId,
  };
}

export type GogGame = {
  productId: number;
  title: string;
  coverUrl: string | null;
  storeUrl: string;
  dev: string | null;
  genre: string | null;
  year: number | null;
  tags: string[];
};

/**
 * Fetch all owned game IDs, then enrich with product metadata (title, cover).
 * embed.gog.com/user/data/games returns: { owned: [id1, id2, ...] }
 * api.gog.com/products supports batch via ?ids=a,b,c&expand=title,images
 */
export async function getOwnedGogGames(creds: GogCreds): Promise<GogGame[]> {
  const idRes = await fetch("https://embed.gog.com/user/data/games", { headers: authHeaders(creds) });
  if (!idRes.ok) throw new Error(`GOG /user/data/games HTTP ${idRes.status}`);
  const { owned } = (await idRes.json()) as { owned: number[] };
  if (!owned?.length) return [];

  const games: GogGame[] = [];
  // Step 1: batch /products for fast title + cover.
  const baseById: Record<number, { title: string; coverUrl: string | null; storeUrl: string }> = {};
  for (let i = 0; i < owned.length; i += 50) {
    const chunk = owned.slice(i, i + 50);
    const url = `https://api.gog.com/products?ids=${chunk.join(",")}&expand=title,images`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`GOG products batch HTTP ${res.status}`);
    const items = (await res.json()) as Array<{
      id: number;
      title: string;
      images?: { logo2x?: string; logo?: string; background?: string };
      links?: { product_card?: string };
    }>;
    for (const it of items) {
      const raw = it.images?.logo2x ?? it.images?.logo ?? it.images?.background ?? null;
      baseById[it.id] = {
        title: it.title,
        coverUrl: raw ? (raw.startsWith("//") ? `https:${raw}` : raw) : null,
        storeUrl: it.links?.product_card ?? `https://www.gog.com/game/${it.id}`,
      };
    }
  }

  // Step 2: per-game v2 fetch for dev/genre/tags/year (rich data not available in batch).
  // Throttled at 100ms; ~5-10s for typical libraries.
  for (const id of owned) {
    const base = baseById[id];
    if (!base) continue;
    const v2 = await fetchGogV2(id);
    games.push({
      productId: id,
      title: base.title,
      coverUrl: base.coverUrl,
      storeUrl: base.storeUrl,
      dev: v2?.dev ?? null,
      genre: v2?.genre ?? null,
      year: v2?.year ?? null,
      tags: v2?.tags ?? [],
    });
    await new Promise((r) => setTimeout(r, 100));
  }

  return games;
}

type GogV2 = { dev: string | null; genre: string | null; year: number | null; tags: string[] };

async function fetchGogV2(id: number): Promise<GogV2 | null> {
  try {
    const res = await fetch(`https://api.gog.com/v2/games/${id}?locale=en-US`);
    if (!res.ok) return null;
    const j = (await res.json()) as {
      _embedded?: {
        developers?: Array<{ name: string }>;
        publisher?: { name: string };
        tags?: Array<{ name: string; level: number }>;
        product?: { globalReleaseDate?: string; gogReleaseDate?: string };
      };
    };
    const e = j._embedded ?? {};
    const dev = e.developers?.[0]?.name ?? e.publisher?.name ?? null;
    // Level-1 tag is the broadest genre bucket.
    const level1 = e.tags?.find((t) => t.level === 1);
    const genre = level1?.name ?? null;
    const dateStr = e.product?.globalReleaseDate ?? e.product?.gogReleaseDate ?? "";
    const yearMatch = dateStr.match(/(19|20)\d{2}/);
    return {
      dev,
      genre,
      year: yearMatch ? Number(yearMatch[0]) : null,
      tags: e.tags?.map((t) => t.name).slice(0, 8) ?? [],
    };
  } catch {
    return null;
  }
}
