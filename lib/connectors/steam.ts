/**
 * Steam connector.
 *
 * Uses Steam Web API: https://steamcommunity.com/dev
 * Key endpoints:
 *  - ISteamUser/ResolveVanityURL/v0001/
 *  - ISteamUser/GetPlayerSummaries/v0002/
 *  - IPlayerService/GetOwnedGames/v0001/
 *
 * Privacy: GetOwnedGames returns data ONLY if the target profile's "Game details"
 * privacy is set to Public (or Friends-only + key owner is friend). Otherwise the
 * response is empty — we surface that as an error so the UI can nudge the user.
 */

const API = "https://api.steampowered.com";

export type SteamCreds = {
  steamId64: string;
};

export type SteamGame = {
  appid: number;
  title: string;
  coverUrl: string | null;
  playtimeMin: number;
  lastPlayedAt: Date | null;
  storeUrl: string;
};

function apiKey(): string {
  const k = process.env.STEAM_API_KEY;
  if (!k) throw new Error("STEAM_API_KEY missing");
  return k;
}

/** Convert Steam login name OR steamID64 OR profile URL → steamID64. */
export async function resolveSteamId(input: string): Promise<{ steamId64: string; vanity: string | null }> {
  const trimmed = input.trim();
  // Already a 17-digit steamID64?
  if (/^\d{17}$/.test(trimmed)) return { steamId64: trimmed, vanity: null };

  // Extract vanity from profile URL or take raw string.
  const match = trimmed.match(/steamcommunity\.com\/id\/([^\/?#]+)/i);
  const vanity = match ? match[1] : trimmed;

  const url = `${API}/ISteamUser/ResolveVanityURL/v0001/?key=${apiKey()}&vanityurl=${encodeURIComponent(vanity)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ResolveVanityURL HTTP ${res.status}`);
  const json = (await res.json()) as { response: { success: number; steamid?: string; message?: string } };
  if (json.response.success !== 1 || !json.response.steamid) {
    throw new Error(`Could not resolve Steam username "${vanity}": ${json.response.message ?? "not found"}`);
  }
  return { steamId64: json.response.steamid, vanity };
}

export async function getSteamProfile(steamId64: string): Promise<{
  personaName: string;
  avatarUrl: string;
  profileUrl: string;
}> {
  const url = `${API}/ISteamUser/GetPlayerSummaries/v0002/?key=${apiKey()}&steamids=${steamId64}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GetPlayerSummaries HTTP ${res.status}`);
  const json = (await res.json()) as {
    response: { players: Array<{ personaname: string; avatarfull: string; profileurl: string }> };
  };
  const p = json.response.players[0];
  if (!p) throw new Error(`No Steam profile for ${steamId64}`);
  return { personaName: p.personaname, avatarUrl: p.avatarfull, profileUrl: p.profileurl };
}

export async function getOwnedGames(steamId64: string): Promise<SteamGame[]> {
  const params = new URLSearchParams({
    key: apiKey(),
    steamid: steamId64,
    include_appinfo: "1",
    include_played_free_games: "1",
    format: "json",
  });
  const res = await fetch(`${API}/IPlayerService/GetOwnedGames/v0001/?${params}`);
  if (!res.ok) throw new Error(`GetOwnedGames HTTP ${res.status}`);
  const json = (await res.json()) as {
    response: {
      game_count?: number;
      games?: Array<{
        appid: number;
        name: string;
        playtime_forever: number;
        img_icon_url?: string;
        rtime_last_played?: number;
      }>;
    };
  };
  if (!json.response.games) {
    throw new Error(
      `No games returned for ${steamId64}. Profile "Game details" privacy must be Public.`,
    );
  }
  return json.response.games.map((g) => ({
    appid: g.appid,
    title: g.name,
    coverUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appid}/library_600x900.jpg`,
    playtimeMin: g.playtime_forever ?? 0,
    lastPlayedAt: g.rtime_last_played ? new Date(g.rtime_last_played * 1000) : null,
    storeUrl: `https://store.steampowered.com/app/${g.appid}`,
  }));
}

export type SteamAppMeta = {
  dev: string | null;
  genre: string | null;
  year: number | null;
  tags: string[];
};

/**
 * Steam Store appdetails — public, no key needed. Rate-limited (~200/5min/IP).
 * Endpoint quirk: passing multiple appids returns only the first key reliably,
 * so caller must fetch one appid at a time.
 */
export async function getSteamAppMeta(appid: number): Promise<SteamAppMeta | null> {
  const url = `https://store.steampowered.com/api/appdetails?appids=${appid}&l=english`;
  let res: Response;
  try {
    res = await fetch(url, { headers: { "user-agent": "Mylibrary/0.4 (+local)" } });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const json = (await res.json()) as Record<
    string,
    { success?: boolean; data?: {
      developers?: string[];
      genres?: Array<{ description: string }>;
      categories?: Array<{ description: string }>;
      release_date?: { date?: string };
    } }
  >;
  const item = json[String(appid)];
  if (!item?.success || !item.data) return null;
  const d = item.data;
  const yearMatch = d.release_date?.date?.match(/(19|20)\d{2}/);
  return {
    dev: d.developers?.[0] ?? null,
    genre: d.genres?.[0]?.description ?? null,
    year: yearMatch ? Number(yearMatch[0]) : null,
    tags: (d.genres ?? []).map((g) => g.description).slice(0, 6),
  };
}

export type SteamAchievementCount = { unlocked: number; total: number };

/**
 * Per-app achievements for a player. Returns null when game has no achievements
 * or profile privacy denies the call.
 */
export async function getSteamPlayerAchievements(
  steamId64: string,
  appid: number,
): Promise<SteamAchievementCount | null> {
  const url = `${API}/ISteamUserStats/GetPlayerAchievements/v0001/?key=${apiKey()}&steamid=${steamId64}&appid=${appid}`;
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const json = (await res.json()) as {
    playerstats?: { success?: boolean; achievements?: Array<{ achieved: number }> };
  };
  const list = json.playerstats?.achievements;
  if (!json.playerstats?.success || !list) return null;
  const total = list.length;
  const unlocked = list.filter((a) => a.achieved === 1).length;
  return { unlocked, total };
}
