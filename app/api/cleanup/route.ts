import { prisma } from "@/lib/db";

/**
 * Cleanup tasks:
 *  1. Drop GameOnStore rows with zero OwnedCopy.
 *  2. Drop Game rows with zero GameOnStore.
 *  3. Auto-hide obvious junk: TEST DEVELOPER 2 entries, internal Epic
 *     placeholder offers (e.g. "New Finisher Animations"), Witcher-style
 *     DLC/quest packs whose title starts with "New Quest -".
 *
 * POST /api/cleanup[?onlyOrphans=1|onlyHide=1]
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const onlyOrphans = url.searchParams.get("onlyOrphans") === "1";
  const onlyHide = url.searchParams.get("onlyHide") === "1";

  let removedGameOnStore = 0;
  let removedGames = 0;
  let hidden = 0;

  if (!onlyHide) {
    const a = await prisma.gameOnStore.deleteMany({ where: { owned: { none: {} } } });
    removedGameOnStore = a.count;
    const b = await prisma.game.deleteMany({ where: { copies: { none: {} } } });
    removedGames = b.count;
  }

  if (!onlyOrphans) {
    // Heuristics for junk titles. Conservative — only auto-hide; user can
    // toggle "Show hidden" to reverse.
    const junkDevs = ["TEST DEVELOPER 2", "Test Developer 2"];
    const titlePatterns = [
      /\[A\]$/i,                    // GOG DLC marker
      /^New Quest - /i,             // Witcher 3 DLC quests
      /^New Finisher Animations$/i,
      /^New Game \+$/i,
      /^Alternative Look for /i,    // CDPR cosmetic DLC
      /^Beard and Hairstyle/i,
      /^Nilfgaardian Armor/i,
      /^Temerian Armor/i,
      /^Skellige Armor/i,
      /^Skellige's Most Wanted/i,
      /\bArmor set$/i,
      /\bWolf School Gear$/i,
      /^Where the Cat and Wolf Play/i,
      /^Fool['']s Gold$/i,
      /^Contract: /i,
      /^Scavenger Hunt: /i,
      /^Missing Miners/i,
      / Soundtrack$/i,             // OSTs
      / OST$/i,
      / Original Soundtrack/i,
      / Demo$/i,                    // Demos
      / - Demo$/i,
      /\bArtbook\b/i,
      /\bDigital Comic\b/i,
      /\bDigital Manual\b/i,
      /\bWallpapers?\b/i,
      /^Game overlay$/i,           // GOG Galaxy in-game overlay utility
      /\bGalaxy\b.*overlay/i,
    ];

    // Hide by dev
    const r1 = await prisma.game.updateMany({
      where: { dev: { in: junkDevs }, isHidden: false },
      data: { isHidden: true },
    });
    hidden += r1.count;

    // Hide anything explicitly tagged non-game kind (DLC/pack/music/movie/book/extras/demo/dlc).
    const nonGameKinds = ["dlc", "pack", "music", "movie", "book", "extras", "demo", "addon"];
    const r1b = await prisma.game.updateMany({
      where: { kind: { in: nonGameKinds }, isHidden: false },
      data: { isHidden: true },
    });
    hidden += r1b.count;

    // Hide by title patterns
    const candidates = await prisma.game.findMany({
      where: { isHidden: false },
      select: { id: true, title: true },
    });
    const matchIds = candidates
      .filter((g) => titlePatterns.some((re) => re.test(g.title)))
      .map((g) => g.id);
    if (matchIds.length) {
      const r2 = await prisma.game.updateMany({
        where: { id: { in: matchIds } },
        data: { isHidden: true },
      });
      hidden += r2.count;
    }
  }

  return Response.json({ ok: true, removedGameOnStore, removedGames, hidden });
}
