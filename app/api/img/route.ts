import { NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import path from "node:path";

/**
 * Disk-cached image proxy.
 *  GET /api/img?u=<encoded-url>
 *
 * Caches images under .next/img-cache/<sha256>.<ext> so the browser hits a fast
 * local file after first fetch. Cache is keyed by URL and never invalidates
 * (covers don't change). Delete the dir to force refetch.
 */

const ALLOWED_HOSTS = new Set([
  "cdn.cloudflare.steamstatic.com",
  "avatars.steamstatic.com",
  "avatars.akamai.steamstatic.com",
  "steamcdn-a.akamaihd.net",
  "images.gog-statics.com",
  "images-1.gog-statics.com",
  "images-2.gog-statics.com",
  "images-3.gog-statics.com",
  "images-4.gog-statics.com",
  "cdn1.epicgames.com",
  "cdn2.unrealengine.com",
  "media.rawg.io",
]);

const CACHE_DIR = path.join(process.cwd(), ".next", "img-cache");

function sniffExt(url: string, contentType: string | null): string {
  if (contentType?.includes("png")) return "png";
  if (contentType?.includes("webp")) return "webp";
  if (contentType?.includes("gif")) return "gif";
  if (contentType?.includes("jpeg") || contentType?.includes("jpg")) return "jpg";
  const m = url.match(/\.(png|jpg|jpeg|webp|gif)(\?|$)/i);
  return m ? m[1].toLowerCase().replace("jpeg", "jpg") : "jpg";
}

function contentTypeFor(ext: string): string {
  return ext === "png" ? "image/png"
    : ext === "webp" ? "image/webp"
    : ext === "gif" ? "image/gif"
    : "image/jpeg";
}

export async function GET(req: NextRequest) {
  const u = req.nextUrl.searchParams.get("u");
  if (!u) return new Response("missing u", { status: 400 });

  let url: URL;
  try {
    url = new URL(u);
  } catch {
    return new Response("bad url", { status: 400 });
  }
  if (!ALLOWED_HOSTS.has(url.hostname)) return new Response("host not allowed", { status: 403 });

  await mkdir(CACHE_DIR, { recursive: true });
  const hash = createHash("sha256").update(u).digest("hex");

  // Try common extensions for cache hit
  for (const ext of ["jpg", "png", "webp", "gif"]) {
    const p = path.join(CACHE_DIR, `${hash}.${ext}`);
    try {
      await stat(p);
      const buf = await readFile(p);
      return new Response(new Uint8Array(buf), {
        headers: {
          "content-type": contentTypeFor(ext),
          "cache-control": "public, max-age=31536000, immutable",
        },
      });
    } catch {
      /* miss */
    }
  }

  // Fetch upstream
  const res = await fetch(u);
  if (!res.ok) return new Response(`upstream ${res.status}`, { status: 502 });
  const ext = sniffExt(u, res.headers.get("content-type"));
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(path.join(CACHE_DIR, `${hash}.${ext}`), buf);
  return new Response(new Uint8Array(buf), {
    headers: {
      "content-type": contentTypeFor(ext),
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
