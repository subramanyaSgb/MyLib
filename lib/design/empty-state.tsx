import Link from "next/link";

export function EmptyState() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "var(--bg)",
      }}
    >
      <div style={{ maxWidth: 520, textAlign: "center" }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 12,
            background: "var(--accent)",
            color: "var(--accent-ink)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontWeight: 800,
            fontSize: 38,
            marginBottom: 28,
          }}
        >
          M
        </div>
        <div
          style={{
            fontSize: 38,
            fontFamily: "var(--font-serif)",
            fontWeight: 500,
            letterSpacing: -0.8,
            lineHeight: 1.1,
            marginBottom: 14,
          }}
        >
          Your library is{" "}
          <span style={{ fontStyle: "italic", color: "var(--accent)" }}>empty</span>.
        </div>
        <div
          style={{
            fontSize: 14,
            color: "var(--text-soft)",
            lineHeight: 1.6,
            marginBottom: 28,
            maxWidth: 420,
            marginInline: "auto",
          }}
        >
          Connect your store accounts — Steam, Epic, GOG, and more — and Mylibrary
          will pull every game you own into one shelf. Multiple accounts per store welcome.
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <Link
            href="/onboarding"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 18px",
              background: "var(--accent)",
              color: "var(--accent-ink)",
              borderRadius: 6,
              fontSize: 13,
              fontFamily: "var(--font-sans)",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Start the tour →
          </Link>
          <Link
            href="/accounts"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 18px",
              background: "transparent",
              color: "var(--text)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              fontSize: 13,
              fontFamily: "var(--font-sans)",
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            Skip — link an account
          </Link>
        </div>
      </div>
    </div>
  );
}
