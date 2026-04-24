import Link from "next/link";
import { prisma } from "@/lib/db";
import { Cover } from "@/lib/design/cover";
import { PageHeader } from "@/lib/design/primitives";
import { CloudRefreshButton } from "./refresh-button";

export const dynamic = "force-dynamic";

export default async function CloudPage() {
  const games = await prisma.game.findMany({
    where: {
      isHidden: false,
      copies: { some: { owned: { some: {} } } },
      OR: [{ cloudGfn: true }, { cloudXcloud: true }],
    },
    orderBy: { title: "asc" },
    select: {
      id: true,
      title: true,
      dev: true,
      coverUrl: true,
      cloudGfn: true,
      cloudXcloud: true,
    },
  });

  const lastCheck = await prisma.game.findFirst({
    where: { lastCloudCheckAt: { not: null } },
    orderBy: { lastCloudCheckAt: "desc" },
    select: { lastCloudCheckAt: true },
  });

  const gfnCount = games.filter((g) => g.cloudGfn).length;
  const xcloudCount = games.filter((g) => g.cloudXcloud).length;

  return (
    <div>
      <PageHeader
        eyebrow="Stream from anywhere"
        title={
          <>
            Cloud-playable —{" "}
            <span style={{ color: "var(--accent)", fontStyle: "italic" }} className="tnum">
              {games.length} games
            </span>
          </>
        }
        subtitle={
          games.length === 0
            ? "Run a refresh to cross-reference your library against GeForce Now + Xbox Cloud."
            : `${gfnCount} on GeForce Now · ${xcloudCount} on Xbox Cloud Gaming. ${lastCheck?.lastCloudCheckAt ? `Last checked ${new Date(lastCheck.lastCloudCheckAt).toLocaleString()}.` : ""}`
        }
        right={<CloudRefreshButton />}
      />

      {games.length === 0 ? (
        <div
          style={{
            margin: "40px 40px 60px",
            padding: 24,
            border: "1px dashed var(--border)",
            borderRadius: 8,
            color: "var(--text-faint)",
          }}
        >
          No matches yet. Click <strong>Refresh cloud catalogs</strong> above to scan. NVIDIA&apos;s
          public catalog endpoint may be empty in some regions.
        </div>
      ) : (
        <div
          style={{
            padding: "24px 40px 60px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 18,
          }}
        >
          {games.map((g) => (
            <Link
              key={g.id}
              href={`/library?game=${g.id}`}
              className="hover-lift"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div style={{ position: "relative" }}>
                <Cover game={{ title: g.title, dev: g.dev, coverUrl: g.coverUrl }} w="100%" h={240} radius={5} />
                <div style={{ position: "absolute", bottom: 8, left: 8, display: "flex", gap: 4 }}>
                  {g.cloudGfn && (
                    <span
                      style={{
                        padding: "2px 6px",
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: 0.5,
                        background: "#76b900",
                        color: "#0d1700",
                        borderRadius: 3,
                        fontFamily: "var(--font-sans)",
                      }}
                    >
                      GFN
                    </span>
                  )}
                  {g.cloudXcloud && (
                    <span
                      style={{
                        padding: "2px 6px",
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: 0.5,
                        background: "#107c10",
                        color: "#fff",
                        borderRadius: 3,
                        fontFamily: "var(--font-sans)",
                      }}
                    >
                      xCloud
                    </span>
                  )}
                </div>
              </div>
              <div
                style={{
                  marginTop: 10,
                  fontSize: 13,
                  fontFamily: "var(--font-serif)",
                  letterSpacing: -0.2,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={g.title}
              >
                {g.title}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
