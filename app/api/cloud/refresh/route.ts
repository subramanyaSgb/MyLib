import { prisma } from "@/lib/db";
import { fetchGfnCatalog } from "@/lib/cloud/geforce-now";
import { fetchXcloudCatalog } from "@/lib/cloud/xbox-cloud";

function normalizeTitle(t: string): string {
  return t
    .toLowerCase()
    .replace(/[™®©]/g, "")
    .replace(/[:\-–—_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Cross-references owned games against GFN + xCloud catalogs.
 * Marks Game.cloudGfn / Game.cloudXcloud and bumps lastCloudCheckAt.
 *
 * POST /api/cloud/refresh
 */
export async function POST() {
  const summary: Record<string, unknown> = {};

  // ── GeForce Now ──────────────────────────────────────────────────
  let gfn: Awaited<ReturnType<typeof fetchGfnCatalog>> = [];
  try {
    gfn = await fetchGfnCatalog();
    summary.gfnCatalogCount = gfn.length;
  } catch (e) {
    summary.gfnError = e instanceof Error ? e.message : String(e);
  }

  // ── Xbox Cloud ───────────────────────────────────────────────────
  let xcloud: Awaited<ReturnType<typeof fetchXcloudCatalog>> = [];
  try {
    xcloud = await fetchXcloudCatalog();
    summary.xcloudCatalogCount = xcloud.length;
  } catch (e) {
    summary.xcloudError = e instanceof Error ? e.message : String(e);
  }

  // ── Build title lookups (normalized) ─────────────────────────────
  const gfnByTitle = new Map<string, true>();
  for (const g of gfn) gfnByTitle.set(normalizeTitle(g.title), true);
  const xcloudByTitle = new Map<string, true>();
  for (const x of xcloud) xcloudByTitle.set(normalizeTitle(x.title), true);

  // ── Stamp owned games ────────────────────────────────────────────
  const games = await prisma.game.findMany({
    where: { copies: { some: { owned: { some: {} } } } },
    select: { id: true, normTitle: true, cloudGfn: true, cloudXcloud: true, lastCloudCheckAt: true },
  });

  let gfnHits = 0;
  let xcloudHits = 0;
  let updated = 0;
  for (const g of games) {
    const norm = g.normTitle;
    const onGfn = gfnByTitle.has(norm);
    const onXcloud = xcloudByTitle.has(norm);

    if (g.cloudGfn !== onGfn || g.cloudXcloud !== onXcloud || !g.lastCloudCheckAt) {
      await prisma.game.update({
        where: { id: g.id },
        data: { cloudGfn: onGfn, cloudXcloud: onXcloud, lastCloudCheckAt: new Date() },
      });
      updated++;
    }
    if (onGfn) gfnHits++;
    if (onXcloud) xcloudHits++;
  }

  return Response.json({
    ok: true,
    ...summary,
    gamesChecked: games.length,
    gfnHits,
    xcloudHits,
    updated,
  });
}
