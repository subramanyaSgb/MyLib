/**
 * Procedural cover art system. Five layered-gradient styles, deterministic per
 * game (h/c/l/style derived from the title). Real cover URL — when present —
 * overrides the procedural background entirely.
 *
 * Critical: cover sizing contract requires title font scales with width:
 *   titleSize = clamp(11, w*0.075, 15)
 *   devSize   = clamp(9,  w*0.048, 11)
 */

export type ArtTokens = { h: number; c: number; l: number; style: 0 | 1 | 2 | 3 | 4 | 5 };

export function deriveArt(title: string): ArtTokens {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash * 31 + title.charCodeAt(i)) | 0;
  }
  const u = Math.abs(hash);
  const h = u % 360;
  const c = 0.07 + ((u >> 8) % 11) / 100; // 0.07 .. 0.17
  const l = 0.28 + ((u >> 16) % 30) / 100; // 0.28 .. 0.57
  const style = ((u >> 4) % 6) as ArtTokens["style"];
  return { h, c, l, style };
}

const GRAIN_URL =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.95' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

export function artStyles(art: ArtTokens) {
  const { h, c, l, style } = art;
  const base = `oklch(${l} ${c} ${h})`;
  const dark = `oklch(${Math.max(0.10, l - 0.20)} ${c * 0.9} ${h + 6})`;
  const accent = `oklch(${Math.min(0.85, l + 0.22)} ${Math.min(0.20, c * 1.3)} ${(h + 40) % 360})`;
  const soft = `oklch(${Math.min(0.9, l + 0.15)} ${c * 0.7} ${(h + 20) % 360})`;
  switch (style) {
    case 0:
      return {
        background: `linear-gradient(130deg, ${dark} 0%, ${base} 45%, ${accent} 100%)`,
        overlay: `linear-gradient(130deg, transparent 48%, ${soft}55 48%, ${soft}55 52%, transparent 52%)`,
        blend: "screen" as const,
      };
    case 1:
      return {
        background: `radial-gradient(circle at 30% 35%, ${accent} 0%, ${base} 35%, ${dark} 90%)`,
        overlay: `radial-gradient(circle at 70% 85%, ${soft}40 0%, transparent 45%)`,
        blend: "overlay" as const,
      };
    case 2:
      return {
        background: `linear-gradient(180deg, ${dark} 0%, ${base} 50%, ${soft} 100%)`,
        overlay: `linear-gradient(180deg, transparent 46%, ${accent}33 50%, transparent 54%)`,
        blend: "soft-light" as const,
      };
    case 3:
      return {
        background: `linear-gradient(155deg, ${base} 0%, ${dark} 100%)`,
        overlay: `linear-gradient(45deg,  transparent 62%, ${accent}28 62%, ${accent}28 64%, transparent 64%),
                  linear-gradient(135deg, transparent 58%, ${soft}22 58%, ${soft}22 60%, transparent 60%),
                  linear-gradient(225deg, transparent 72%, ${accent}22 72%, ${accent}22 74%, transparent 74%)`,
        blend: "screen" as const,
      };
    case 4:
      return {
        background: `linear-gradient(160deg, ${base} 0%, ${dark} 100%)`,
        overlay: `radial-gradient(circle at 72% 28%, ${accent} 0%, ${accent} 4%, transparent 4.2%),
                  radial-gradient(circle at 72% 28%, transparent 18%, ${soft}33 18.2%, transparent 22%),
                  radial-gradient(circle at 72% 28%, transparent 32%, ${soft}22 32.2%, transparent 36%)`,
        blend: "screen" as const,
      };
    default:
      return {
        background: `linear-gradient(170deg, ${dark} 0%, ${base} 100%)`,
        overlay: `repeating-linear-gradient(90deg, transparent 0 14px, ${soft}14 14px 15px)`,
        blend: "overlay" as const,
      };
  }
}

export type CoverGame = {
  title: string;
  dev?: string | null;
  coverUrl?: string | null;
  art?: ArtTokens;
};

export function Cover({
  game,
  w = 240,
  h = 320,
  showTitle = true,
  radius = 4,
  children,
  className = "",
}: {
  game: CoverGame;
  w?: number | string;
  h?: number | string;
  showTitle?: boolean;
  radius?: number;
  children?: React.ReactNode;
  className?: string;
}) {
  const art = game.art ?? deriveArt(game.title);
  const s = artStyles(art);
  const nw = typeof w === "number" ? w : 240;
  const titleSize = Math.max(11, Math.min(15, nw * 0.075));
  const devSize = Math.max(9, Math.min(11, nw * 0.048));

  const realCover = game.coverUrl
    ? `/api/img?u=${encodeURIComponent(game.coverUrl)}`
    : null;

  return (
    <div
      className={className}
      style={{
        position: "relative",
        overflow: "hidden",
        width: w,
        height: h,
        borderRadius: radius,
        background: realCover ? "var(--bg-3)" : s.background,
        boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.08)",
      }}
    >
      {realCover ? (
        // Two-layer poster fill: blurred copy fills the card (matches palette,
        // hides letterboxing artifacts), foreground copy is `contain` so wide
        // header art (Steam header.jpg fallback) shows whole — never stretched.
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={realCover}
            alt=""
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "blur(18px) brightness(0.7) saturate(1.1)",
              transform: "scale(1.15)",
            }}
            loading="lazy"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={realCover}
            alt=""
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "contain",
            }}
            loading="lazy"
          />
        </>
      ) : (
        <>
          <div style={{ position: "absolute", inset: 0, background: s.overlay, mixBlendMode: s.blend }} />
          <div style={{ position: "absolute", inset: 0, background: GRAIN_URL, mixBlendMode: "overlay", opacity: 0.6 }} />
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 120%, rgba(0,0,0,0.6), transparent 65%)" }} />
          {showTitle && (
            <div style={{ position: "absolute", left: 12, right: 12, bottom: 12, color: "#fff" }}>
              <div
                style={{
                  fontSize: titleSize,
                  fontWeight: 600,
                  letterSpacing: -0.2,
                  textShadow: "0 1px 10px rgba(0,0,0,.6)",
                  lineHeight: 1.15,
                  fontFamily: "var(--font-serif)",
                }}
              >
                {game.title}
              </div>
              {game.dev && (
                <div
                  style={{
                    fontSize: devSize,
                    opacity: 0.72,
                    marginTop: 3,
                    textShadow: "0 1px 5px rgba(0,0,0,.5)",
                    fontFamily: "var(--font-sans)",
                    letterSpacing: 0.1,
                  }}
                >
                  {game.dev}
                </div>
              )}
            </div>
          )}
        </>
      )}
      {children}
    </div>
  );
}
