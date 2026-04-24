import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Unified library grouped by canonical Game.
 * Returns one row per distinct Game with:
 *  - stores[]: which stores it's on (with store-specific cover/url)
 *  - accounts[]: which of YOUR accounts own a copy (with playtime + last played)
 */
export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get("q")?.trim().toLowerCase();

  const games = await prisma.game.findMany({
    where: search ? { normTitle: { contains: search } } : undefined,
    orderBy: { title: "asc" },
    include: {
      copies: {
        include: {
          owned: {
            include: {
              account: { select: { id: true, storeId: true, label: true, displayName: true } },
            },
          },
        },
      },
    },
  });

  // Filter to games actually owned by at least one account (not orphaned).
  const owned = games.filter((g) => g.copies.some((c) => c.owned.length > 0));

  const result = owned.map((g) => {
    const accountOwners = g.copies.flatMap((c) =>
      c.owned.map((o) => ({
        accountId: o.account.id,
        storeId: o.account.storeId,
        accountLabel: o.account.label,
        displayName: o.account.displayName,
        playtimeMin: o.playtimeMin,
        lastPlayedAt: o.lastPlayedAt,
        storeGameId: c.storeGameId,
        storeUrl: c.storeUrl,
      })),
    );
    const storeIds = [...new Set(g.copies.map((c) => c.storeId))];
    return {
      id: g.id,
      title: g.title,
      coverUrl: g.coverUrl,
      storeIds,
      ownerCount: accountOwners.length,
      owners: accountOwners,
    };
  });

  return Response.json({
    games: result,
    total: result.length,
  });
}
