"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Cover } from "@/lib/design/cover";
import { Btn, Icon, StoreDot } from "@/lib/design/primitives";
import type { DerivedAccount, DerivedGame, DerivedTotals } from "@/lib/design/derived";
import { STORE_PALETTE } from "@/lib/store-meta";

type RecentCard = {
  id: string;
  title: string;
  dev: string | null;
  coverUrl: string | null;
  ownedStoreIds: string[];
  topHours: number;
  topLastPlayed: string;
};

type DupeHero = {
  id: string;
  title: string;
  dev: string | null;
  coverUrl: string | null;
  copies: Array<{ acc: string; storeId: string; hours: number }>;
};

type PriceAlert = {
  id: string;
  kind: string;
  priceCents: number;
  targetCents: number | null;
  prevLowCents: number | null;
  currency: string | null;
  item: {
    id: string;
    storeId: string;
    title: string;
    coverUrl: string | null;
    storeUrl: string | null;
    fullPriceCents: number | null;
    targetPriceCents: number | null;
    currency: string | null;
  };
};

export function HomeView({
  accounts,
  games,
  totals,
  onSaleCount,
  biggestSale,
  recent,
  topDupe,
  priceAlerts,
}: {
  accounts: DerivedAccount[];
  games: DerivedGame[];
  totals: DerivedTotals;
  onSaleCount: number;
  biggestSale: { title: string; discountPct: number } | null;
  recent: RecentCard[];
  topDupe: DupeHero | null;
  priceAlerts: PriceAlert[];
}) {
  const router = useRouter();
  const greetingTime = greeting();
  const dateLine = formatDateLine();

  const primaryAccount = accounts.find((a) => a.primary) ?? accounts[0];
  const userName = primaryAccount?.handle ?? "friend";

  return (
    <div style={{ padding: "28px 40px 60px", display: "flex", flexDirection: "column", gap: 32 }}>
      {/* Greeting */}
      <div>
        <div className="eyebrow" style={{ marginBottom: 6 }}>{dateLine}</div>
        <div
          style={{
            fontSize: 34,
            fontWeight: 500,
            letterSpacing: -0.8,
            fontFamily: "var(--font-serif)",
            lineHeight: 1.1,
            maxWidth: 720,
          }}
        >
          {greetingTime}, <span style={{ fontStyle: "italic", color: "var(--accent)" }}>{userName}</span> — you own{" "}
          <span className="tnum">{totals.totalCopies}</span> copies of{" "}
          <span className="tnum">{totals.totalGames}</span> games across{" "}
          <span className="tnum">{accounts.length}</span> accounts.
        </div>
      </div>

      {/* HERO: Duplicate alert */}
      {topDupe && totals.duplicates.length > 0 ? (
        <div
          style={{
            position: "relative",
            border: "1px solid var(--accent)",
            borderRadius: 10,
            padding: 28,
            background:
              "linear-gradient(135deg, var(--accent-soft), transparent 70%), var(--bg-2)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -40,
              right: -40,
              width: 240,
              height: 240,
              borderRadius: "50%",
              background: "var(--accent-soft)",
              filter: "blur(40px)",
              pointerEvents: "none",
            }}
          />
          <div style={{ display: "flex", gap: 28, alignItems: "center", position: "relative" }}>
            <div style={{ position: "relative", width: 190, height: 170, flexShrink: 0 }}>
              {topDupe.copies.slice(0, 3).map((o, i) => (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: i * 28,
                    top: i * 18,
                    transform: `rotate(${(i - 1) * 4}deg)`,
                    transformOrigin: "center",
                    boxShadow: "0 12px 30px -10px rgba(0,0,0,0.8)",
                  }}
                >
                  <Cover
                    game={{ title: topDupe.title, dev: topDupe.dev, coverUrl: topDupe.coverUrl }}
                    w={120}
                    h={160}
                    showTitle={false}
                  />
                  <div style={{ position: "absolute", top: 8, left: 8 }}>
                    <StoreDot id={o.storeId} size={18} ring />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <Icon name="sparkle" size={13} />
                <span
                  style={{
                    fontSize: 10,
                    letterSpacing: 3,
                    textTransform: "uppercase",
                    color: "var(--accent)",
                    fontFamily: "var(--font-sans)",
                    fontWeight: 700,
                  }}
                >
                  Duplicate detected
                </span>
              </div>
              <div
                style={{
                  fontSize: 24,
                  fontFamily: "var(--font-serif)",
                  fontWeight: 500,
                  letterSpacing: -0.4,
                  marginBottom: 8,
                  lineHeight: 1.2,
                }}
              >
                You own <span style={{ fontStyle: "italic" }}>{topDupe.title}</span>{" "}
                {numberWord(topDupe.copies.length)} times.
              </div>
              <div
                style={{
                  fontSize: 13.5,
                  color: "var(--text-soft)",
                  fontFamily: "var(--font-sans)",
                  lineHeight: 1.55,
                  marginBottom: 16,
                  maxWidth: 540,
                }}
              >
                Across {storeList(topDupe.copies.map((c) => c.storeId))}. Combined idle playtime:{" "}
                <b style={{ color: "var(--text)" }}>
                  {sumHours(topDupe.copies)
                    .toFixed(1)
                    .replace(/\.0$/, "")}
                  h
                </b>
                .
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Btn primary icon="check" onClick={() => router.push(`/library?merge=${topDupe.id}`)}>
                  Merge into primary
                </Btn>
                <Btn onClick={() => router.push(`/library?game=${topDupe.id}`)}>Review all {topDupe.copies.length} copies</Btn>
                <Btn ghost onClick={() => router.push("/duplicates")}>
                  See all {totals.duplicates.length} duplicates →
                </Btn>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: 28,
            background: "var(--bg-2)",
            color: "var(--text-soft)",
          }}
        >
          <div className="eyebrow" style={{ marginBottom: 8 }}>No duplicates detected — yet</div>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: 22, color: "var(--text)", letterSpacing: -0.3 }}>
            Add another account on a store you already use to find overlaps.
          </div>
        </div>
      )}

      {/* Price alerts */}
      {priceAlerts.length > 0 && (
        <section>
          <SectionHead
            title="Price alerts"
            subtitle={`${priceAlerts.length} wishlist ${priceAlerts.length === 1 ? "item" : "items"} moved`}
            right={
              <Link
                href="/wishlist"
                style={{
                  color: "var(--text-faint)",
                  fontSize: 11,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  fontFamily: "var(--font-sans)",
                  textDecoration: "none",
                }}
              >
                Open wishlist →
              </Link>
            }
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
            {priceAlerts.map((a) => (
              <PriceAlertRow key={a.id} alert={a} onDismiss={() => router.refresh()} />
            ))}
          </div>
        </section>
      )}

      {/* Stat tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        <StatTile
          label="Spent on duplicates"
          value={`$${totals.dupeSavings.toFixed(0)}`}
          caption={`${totals.duplicates.length} games owned more than once`}
          onClick={() => router.push("/duplicates")}
        />
        <StatTile
          label="Never played"
          value={String(totals.unplayed.length)}
          caption="Across your libraries, yet untouched"
          onClick={() => router.push("/library?played=unplayed")}
        />
        <StatTile
          label="On sale from wishlist"
          value={String(onSaleCount)}
          caption={
            biggestSale
              ? `Biggest: ${biggestSale.title}, −${biggestSale.discountPct}%`
              : onSaleCount === 0
              ? "Sync wishlist to start tracking"
              : "Open Wishlist to see all"
          }
          onClick={() => router.push("/wishlist")}
        />
      </div>

      {/* Continue playing */}
      <section>
        <SectionHead
          title="Continue playing"
          right={
            <Link
              href="/library"
              style={{
                color: "var(--text-faint)",
                fontSize: 11,
                letterSpacing: 2,
                textTransform: "uppercase",
                fontFamily: "var(--font-sans)",
                textDecoration: "none",
              }}
            >
              All library →
            </Link>
          }
        />
        {recent.length === 0 ? (
          <div
            style={{
              marginTop: 16,
              padding: 20,
              border: "1px dashed var(--border)",
              borderRadius: 8,
              color: "var(--text-faint)",
              fontSize: 13,
            }}
          >
            No games with playtime yet. Sync an account to populate.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginTop: 16 }}>
            {recent.map((g) => (
              <Link
                key={g.id}
                href={`/library?game=${g.id}`}
                className="hover-lift"
                style={{ cursor: "pointer", textDecoration: "none", color: "inherit" }}
              >
                <div style={{ position: "relative" }}>
                  <Cover game={{ title: g.title, dev: g.dev, coverUrl: g.coverUrl }} w="100%" h={200} radius={5} />
                  <div style={{ position: "absolute", top: 8, left: 8, display: "flex", gap: 4 }}>
                    {g.ownedStoreIds.slice(0, 4).map((sid, i) => (
                      <StoreDot key={i} id={sid} size={18} ring />
                    ))}
                  </div>
                </div>
                <div
                  style={{
                    marginTop: 10,
                    fontSize: 12.5,
                    fontFamily: "var(--font-sans)",
                    color: "var(--text-soft)",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span style={{ color: "var(--accent)" }} className="tnum">
                    {g.topHours.toFixed(1)}h
                  </span>
                  <span style={{ opacity: 0.5 }}>·</span>
                  <span>{g.topLastPlayed}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatTile({
  label,
  value,
  caption,
  onClick,
}: {
  label: string;
  value: string;
  caption: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="hover-lift"
      style={{
        textAlign: "left",
        padding: 20,
        border: "1px solid var(--border)",
        borderRadius: 8,
        background: "var(--bg-2)",
        cursor: onClick ? "pointer" : "default",
        color: "var(--text)",
      }}
    >
      <div className="eyebrow" style={{ marginBottom: 10 }}>{label}</div>
      <div
        style={{
          fontSize: 32,
          fontFamily: "var(--font-serif)",
          fontWeight: 500,
          color: "var(--accent)",
          letterSpacing: -0.5,
          lineHeight: 1,
        }}
        className="tnum"
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 11.5,
          color: "var(--text-soft)",
          fontFamily: "var(--font-sans)",
          marginTop: 8,
          lineHeight: 1.45,
        }}
      >
        {caption}
      </div>
    </button>
  );
}

function PriceAlertRow({ alert, onDismiss }: { alert: PriceAlert; onDismiss: () => void }) {
  const { item } = alert;
  const kindLabel = alert.kind === "target_hit" ? "Target hit" : "New low";
  const kindColor = alert.kind === "target_hit" ? "var(--accent)" : "#64d38c";
  const now = fmtPrice(alert.priceCents, alert.currency);
  const was = fmtPrice(item.fullPriceCents ?? alert.prevLowCents, item.currency ?? alert.currency);
  const target = alert.targetCents != null ? fmtPrice(alert.targetCents, alert.currency) : null;

  async function dismiss() {
    await fetch(`/api/alerts/${alert.id}/dismiss`, { method: "POST" });
    onDismiss();
  }

  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        alignItems: "center",
        padding: 14,
        border: "1px solid var(--border)",
        borderLeft: `3px solid ${kindColor}`,
        borderRadius: 8,
        background: "var(--bg-2)",
      }}
    >
      <Cover
        game={{ title: item.title, dev: null, coverUrl: item.coverUrl }}
        w={48}
        h={64}
        radius={4}
        showTitle={false}
      />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <StoreDot id={item.storeId} size={14} />
          <span
            style={{
              fontSize: 10,
              letterSpacing: 2.5,
              textTransform: "uppercase",
              color: kindColor,
              fontFamily: "var(--font-sans)",
              fontWeight: 700,
            }}
          >
            {kindLabel}
          </span>
        </div>
        <div style={{ fontSize: 15, fontFamily: "var(--font-serif)", fontWeight: 500, letterSpacing: -0.2 }}>
          {item.title}
        </div>
        <div style={{ fontSize: 12, color: "var(--text-soft)", fontFamily: "var(--font-sans)" }}>
          <span style={{ textDecoration: "line-through", opacity: 0.55 }}>{was}</span>
          <span style={{ margin: "0 6px" }}>→</span>
          <span style={{ color: kindColor, fontWeight: 600 }} className="tnum">
            {now}
          </span>
          {target && (
            <>
              <span style={{ margin: "0 8px", opacity: 0.4 }}>·</span>
              <span>target {target}</span>
            </>
          )}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {item.storeUrl && (
          <Btn primary icon="link" onClick={() => window.open(item.storeUrl!, "_blank", "noopener")}>
            Open store
          </Btn>
        )}
        <Btn ghost onClick={dismiss}>
          Dismiss
        </Btn>
      </div>
    </div>
  );
}

function fmtPrice(cents: number | null, currency: string | null): string {
  if (cents == null) return "—";
  const amount = (cents / 100).toFixed(2).replace(/\.00$/, "");
  const sym =
    currency === "INR" ? "₹"
    : currency === "USD" ? "$"
    : currency === "EUR" ? "€"
    : currency === "GBP" ? "£"
    : currency === "JPY" ? "¥"
    : currency ? `${currency} ` : "$";
  return `${sym}${amount}`;
}

function SectionHead({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 16,
        borderBottom: "1px solid var(--border-soft)",
        paddingBottom: 8,
      }}
    >
      <div>
        <span
          style={{
            fontSize: 15,
            fontFamily: "var(--font-serif)",
            fontWeight: 500,
            letterSpacing: -0.2,
          }}
        >
          {title}
        </span>
        {subtitle && (
          <span style={{ fontSize: 12, color: "var(--text-faint)", marginLeft: 12 }}>{subtitle}</span>
        )}
      </div>
      <div style={{ flex: 1 }} />
      {right}
    </div>
  );
}

// ── helpers ────────────────────────────────────────────────────────────────
function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatDateLine(): string {
  const d = new Date();
  const day = d.toLocaleDateString(undefined, { weekday: "long" });
  const part = d.getHours() < 12 ? "morning" : d.getHours() < 17 ? "afternoon" : "evening";
  const month = d.toLocaleDateString(undefined, { month: "long" });
  return `${day} ${part} · ${month} ${d.getDate()}`;
}

function numberWord(n: number): string {
  return ["zero", "once", "twice", "three", "four", "five", "six", "seven"][n] ?? `${n}`;
}

function sumHours(copies: Array<{ hours: number }>): number {
  return copies.reduce((s, c) => s + c.hours, 0);
}

function storeList(ids: string[]): string {
  const names = [...new Set(ids)].map((id) => STORE_PALETTE[id]?.name ?? id);
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}
