import Link from "next/link";
import { prisma } from "@/lib/db";
import { Cover } from "@/lib/design/cover";
import { Chip, CloudBadge, PageHeader } from "@/lib/design/primitives";
import { CloudRefreshButton } from "./refresh-button";

export const dynamic = "force-dynamic";

type ServiceFilter = "all" | "gfn" | "xcloud" | "both";

export default async function CloudPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: ServiceFilter }>;
}) {
  const sp = await searchParams;
  const service: ServiceFilter = sp.service ?? "all";

  const whereCloud =
    service === "gfn" ? { cloudGfn: true }
    : service === "xcloud" ? { cloudXcloud: true }
    : service === "both" ? { AND: [{ cloudGfn: true }, { cloudXcloud: true }] }
    : { OR: [{ cloudGfn: true }, { cloudXcloud: true }] };

  const games = await prisma.game.findMany({
    where: {
      isHidden: false,
      copies: { some: { owned: { some: {} } } },
      ...whereCloud,
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

  // Totals per service for chip counts
  const totalGfn = await prisma.game.count({
    where: { isHidden: false, copies: { some: { owned: { some: {} } } }, cloudGfn: true },
  });
  const totalXcloud = await prisma.game.count({
    where: { isHidden: false, copies: { some: { owned: { some: {} } } }, cloudXcloud: true },
  });
  const totalBoth = await prisma.game.count({
    where: {
      isHidden: false,
      copies: { some: { owned: { some: {} } } },
      AND: [{ cloudGfn: true }, { cloudXcloud: true }],
    },
  });
  const totalAny = await prisma.game.count({
    where: {
      isHidden: false,
      copies: { some: { owned: { some: {} } } },
      OR: [{ cloudGfn: true }, { cloudXcloud: true }],
    },
  });

  const lastCheck = await prisma.game.findFirst({
    where: { lastCloudCheckAt: { not: null } },
    orderBy: { lastCloudCheckAt: "desc" },
    select: { lastCloudCheckAt: true },
  });

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
          totalAny === 0
            ? "Run a refresh to cross-reference your library against GeForce Now + Xbox Cloud."
            : `${totalGfn} on GeForce Now · ${totalXcloud} on Xbox Cloud · ${totalBoth} on both. ${lastCheck?.lastCloudCheckAt ? `Last checked ${new Date(lastCheck.lastCloudCheckAt).toLocaleString()}.` : ""}`
        }
        right={<CloudRefreshButton />}
      />

      {/* Service filter chips */}
      <div
        style={{
          padding: "14px 40px",
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center",
          borderBottom: "1px solid var(--border-soft)",
        }}
      >
        <ServiceChip href="/cloud" active={service === "all"} count={totalAny}>
          Any cloud
        </ServiceChip>
        <ServiceChip href="/cloud?service=gfn" active={service === "gfn"} count={totalGfn}>
          <CloudBadge service="gfn" size={12} /> GeForce Now
        </ServiceChip>
        <ServiceChip href="/cloud?service=xcloud" active={service === "xcloud"} count={totalXcloud}>
          <CloudBadge service="xcloud" size={12} /> Xbox Cloud
        </ServiceChip>
        <ServiceChip href="/cloud?service=both" active={service === "both"} count={totalBoth}>
          On both
        </ServiceChip>
      </div>

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
          No matches for this filter.
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
                <div style={{ position: "absolute", bottom: 8, left: 8, display: "flex", gap: 6, alignItems: "center" }}>
                  {g.cloudGfn && <CloudBadge service="gfn" size={16} />}
                  {g.cloudXcloud && <CloudBadge service="xcloud" size={16} />}
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

function ServiceChip({
  href,
  active,
  count,
  children,
}: {
  href: string;
  active: boolean;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <Chip active={active}>
        {children}{" "}
        <span style={{ opacity: 0.6, marginLeft: 2 }} className="tnum">
          {count}
        </span>
      </Chip>
    </Link>
  );
}
