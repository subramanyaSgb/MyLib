import { STORE_PALETTE } from "@/lib/store-meta";
import type { CSSProperties } from "react";

// ── Icons ──────────────────────────────────────────────────────────────────
export type IconName =
  | "home" | "library" | "dupe" | "wish" | "ach" | "cloud" | "spend" | "family"
  | "acc" | "set" | "search" | "grid" | "list" | "play" | "plus" | "chev"
  | "chevR" | "back" | "close" | "check" | "sparkle" | "trend" | "link";

export function Icon({ name, size = 16, opacity = 1, className }: { name: IconName; size?: number; opacity?: number; className?: string }) {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    style: { opacity, flexShrink: 0 },
    className,
  };
  switch (name) {
    case "home":    return <svg {...props}><path d="M2 7l6-5 6 5v7H2z"/><path d="M6 14v-4h4v4"/></svg>;
    case "library": return <svg {...props}><rect x="2" y="3" width="3" height="10"/><rect x="6" y="3" width="3" height="10"/><path d="M10 4.5l2.5-.8 1.5 9.5-2.5.8z"/></svg>;
    case "dupe":    return <svg {...props}><rect x="2.5" y="2.5" width="8" height="8"/><rect x="5.5" y="5.5" width="8" height="8"/></svg>;
    case "wish":    return <svg {...props}><path d="M8 13.5s-5-3-5-7a2.8 2.8 0 0 1 5-1.5 2.8 2.8 0 0 1 5 1.5c0 4-5 7-5 7z"/></svg>;
    case "ach":     return <svg {...props}><path d="M8 2l1.8 3.8 4.2.6-3 3 .7 4.2L8 11.6 4.3 13.6 5 9.4 2 6.4l4.2-.6z"/></svg>;
    case "cloud":   return <svg {...props}><path d="M4 11.5a3 3 0 0 1 .3-5.9 3.5 3.5 0 0 1 6.7-1 3 3 0 0 1 1 5.9"/><path d="M4 11.5h8"/></svg>;
    case "spend":   return <svg {...props}><circle cx="8" cy="8" r="6"/><path d="M8 4.5v7M6 6.5c0-1 1-1.5 2-1.5s2 .5 2 1.5-1 1-2 1-2 0-2 1 1 1.5 2 1.5 2-.5 2-1.5"/></svg>;
    case "family":  return <svg {...props}><circle cx="5" cy="6" r="2"/><circle cx="11" cy="6" r="2"/><path d="M2 13a3 3 0 0 1 6 0M8 13a3 3 0 0 1 6 0"/></svg>;
    case "acc":     return <svg {...props}><circle cx="8" cy="6" r="2.5"/><path d="M3 13a5 5 0 0 1 10 0"/></svg>;
    case "set":     return <svg {...props}><circle cx="8" cy="8" r="2"/><path d="M8 1.5v1.7M8 12.8v1.7M1.5 8h1.7M12.8 8h1.7M3.3 3.3l1.2 1.2M11.5 11.5l1.2 1.2M3.3 12.7l1.2-1.2M11.5 4.5l1.2-1.2"/></svg>;
    case "search":  return <svg {...props}><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5l3 3"/></svg>;
    case "grid":    return <svg {...props}><rect x="2.5" y="2.5" width="4.5" height="4.5"/><rect x="9" y="2.5" width="4.5" height="4.5"/><rect x="2.5" y="9" width="4.5" height="4.5"/><rect x="9" y="9" width="4.5" height="4.5"/></svg>;
    case "list":    return <svg {...props}><path d="M2 4h12M2 8h12M2 12h12"/></svg>;
    case "play":    return <svg {...props} fill="currentColor" stroke="none"><path d="M4 2.5v11L13 8z"/></svg>;
    case "plus":    return <svg {...props}><path d="M8 3v10M3 8h10"/></svg>;
    case "chev":    return <svg {...props}><path d="M4 6l4 4 4-4"/></svg>;
    case "chevR":   return <svg {...props}><path d="M6 4l4 4-4 4"/></svg>;
    case "back":    return <svg {...props}><path d="M10 4L6 8l4 4"/></svg>;
    case "close":   return <svg {...props}><path d="M3 3l10 10M13 3L3 13"/></svg>;
    case "check":   return <svg {...props}><path d="M3 8l3.5 3.5L13 5"/></svg>;
    case "sparkle": return <svg {...props}><path d="M8 2v12M4 8h8M5.5 5.5l5 5M10.5 5.5l-5 5"/></svg>;
    case "trend":   return <svg {...props}><path d="M2 12l4-4 3 3 5-6"/><path d="M10 5h4v4"/></svg>;
    case "link":    return <svg {...props}><path d="M7 9a2.5 2.5 0 0 0 3.5 0l2-2a2.5 2.5 0 0 0-3.5-3.5l-1 1"/><path d="M9 7a2.5 2.5 0 0 0-3.5 0l-2 2a2.5 2.5 0 0 0 3.5 3.5l1-1"/></svg>;
  }
}

// ── StoreDot ───────────────────────────────────────────────────────────────
export function StoreDot({ id, size = 16, ring = false, title }: { id: string; size?: number; ring?: boolean; title?: string }) {
  const s = STORE_PALETTE[id];
  if (!s) {
    // unknown store fallback: neutral dot with first letter
    return (
      <span
        title={title ?? id}
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: size, height: size, borderRadius: size / 2,
          background: "#666", color: "#000", fontSize: size * 0.46, fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {id[0]?.toUpperCase()}
      </span>
    );
  }
  return (
    <span
      title={title ?? s.name}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: size, height: size, borderRadius: size / 2,
        background: s.color, color: s.dark,
        fontSize: size * 0.46, fontWeight: 700,
        fontFamily: "var(--font-sans)",
        flexShrink: 0, letterSpacing: -0.3,
        boxShadow: ring ? `0 0 0 2px var(--bg), 0 0 0 3px ${s.color}` : "none",
      }}
    >
      {s.letter}
    </span>
  );
}

// ── Avatar ─────────────────────────────────────────────────────────────────
export function avatarHueFor(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(hash) % 360;
}

export function Avatar({ hue, size = 24, label = "" }: { hue: number; size?: number; label?: string }) {
  return (
    <div
      style={{
        width: size, height: size, borderRadius: size / 2,
        background: `oklch(0.58 0.13 ${hue})`,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        color: "#fff", fontSize: size * 0.42, fontWeight: 600,
        fontFamily: "var(--font-sans)", flexShrink: 0, letterSpacing: 0.2,
      }}
    >
      {(label || "?").toUpperCase()}
    </div>
  );
}

// ── Chip ───────────────────────────────────────────────────────────────────
export function Chip({
  children, onClick, onClose, active, style, asButton = true,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  onClose?: () => void;
  active?: boolean;
  style?: CSSProperties;
  asButton?: boolean;
}) {
  const baseStyle: CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "5px 10px",
    border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
    borderRadius: 99,
    fontSize: 11.5, fontFamily: "var(--font-sans)",
    color: active ? "var(--accent)" : "var(--text-soft)",
    cursor: onClick ? "pointer" : "default",
    background: active ? "var(--accent-soft)" : "transparent",
    ...style,
  };
  const inner = (
    <>
      {children}
      {onClose && (
        <span
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          style={{ opacity: 0.6, display: "flex", alignItems: "center", marginLeft: 2 }}
        >
          <Icon name="close" size={10} />
        </span>
      )}
    </>
  );
  return asButton && onClick ? (
    <button type="button" onClick={onClick} style={{ ...baseStyle, border: baseStyle.border }}>
      {inner}
    </button>
  ) : (
    <span style={baseStyle} onClick={onClick}>{inner}</span>
  );
}

// ── Btn ────────────────────────────────────────────────────────────────────
export function Btn({
  children, onClick, primary, ghost, sm, icon, disabled, type = "button", style, title,
}: {
  children?: React.ReactNode;
  onClick?: () => void;
  primary?: boolean;
  ghost?: boolean;
  sm?: boolean;
  icon?: IconName;
  disabled?: boolean;
  type?: "button" | "submit";
  style?: CSSProperties;
  title?: string;
}) {
  const pad = sm ? "5px 10px" : "8px 14px";
  const fs = sm ? 11.5 : 12.5;
  const bg = primary ? "var(--accent)" : ghost ? "transparent" : "rgba(255,255,255,0.04)";
  const bd = primary ? "none" : ghost ? "1px solid transparent" : "1px solid var(--border)";
  const col = primary ? "var(--accent-ink)" : "var(--text)";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: pad, background: bg, color: col,
        border: bd, borderRadius: 6,
        fontSize: fs, fontFamily: "var(--font-sans)",
        fontWeight: primary ? 600 : 500,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background .12s, border-color .12s",
        ...style,
      }}
    >
      {icon && <Icon name={icon} size={sm ? 11 : 13} />}
      {children}
    </button>
  );
}

// ── Toggle ─────────────────────────────────────────────────────────────────
export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      style={{
        position: "relative",
        width: 34, height: 18, borderRadius: 99,
        background: on ? "var(--accent)" : "var(--bg-3)",
        border: `1px solid ${on ? "var(--accent)" : "var(--border)"}`,
        transition: "background .15s",
        padding: 0,
      }}
    >
      <span
        style={{
          position: "absolute", top: 1, left: on ? 17 : 1,
          width: 14, height: 14, borderRadius: 99,
          background: on ? "var(--accent-ink)" : "var(--text-soft)",
          transition: "left .15s",
        }}
      />
    </button>
  );
}

// ── PageHeader ─────────────────────────────────────────────────────────────
export function PageHeader({
  eyebrow, title, subtitle, right,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div style={{
      padding: "26px 40px 22px",
      borderBottom: "1px solid var(--border)",
      display: "flex", alignItems: "flex-end", gap: 20,
    }}>
      <div style={{ flex: 1 }}>
        {eyebrow && (
          <div className="eyebrow" style={{ marginBottom: 6 }}>{eyebrow}</div>
        )}
        <div style={{
          fontSize: 30, fontWeight: 500, letterSpacing: -0.8,
          fontFamily: "var(--font-serif)", color: "var(--text)", lineHeight: 1.1,
        }}>
          {title}
        </div>
        {subtitle && (
          <div style={{
            fontSize: 13, color: "var(--text-soft)",
            marginTop: 6, fontFamily: "var(--font-sans)",
            maxWidth: 560, lineHeight: 1.5,
          }}>
            {subtitle}
          </div>
        )}
      </div>
      {right}
    </div>
  );
}

// ── SectionHead ────────────────────────────────────────────────────────────
export function SectionHead({ title, subtitle, right }: { title: React.ReactNode; subtitle?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div style={{
      display: "flex", alignItems: "baseline", gap: 16,
      borderBottom: "1px solid var(--border-soft)", paddingBottom: 8,
    }}>
      <div>
        <span style={{
          fontSize: 15, fontFamily: "var(--font-serif)",
          fontWeight: 500, color: "var(--text)", letterSpacing: -0.2,
        }}>{title}</span>
        {subtitle && (
          <span style={{
            fontSize: 12, color: "var(--text-faint)",
            fontFamily: "var(--font-sans)", marginLeft: 12,
          }}>{subtitle}</span>
        )}
      </div>
      <div style={{ flex: 1 }} />
      {right}
    </div>
  );
}
