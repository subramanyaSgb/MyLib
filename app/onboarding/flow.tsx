"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Cover, deriveArt } from "@/lib/design/cover";
import { Btn, Icon, StoreDot } from "@/lib/design/primitives";
import { STORE_PALETTE } from "@/lib/store-meta";

const SUPPORTED = ["steam", "gog", "epic"]; // ones we have real connectors for
const TEASE = ["xbox", "psn", "ubi", "ea", "bnet", "stove"]; // visible but disabled

type Step = 0 | 1 | 2 | 3 | 4;

export function OnboardingFlow({
  accountCount,
  gameCount,
  dupCount,
}: {
  accountCount: number;
  gameCount: number;
  dupCount: number;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);
  const [picked, setPicked] = useState<Set<string>>(new Set(["steam"]));
  const [scanPct, setScanPct] = useState(0);

  // Scattered-cover backdrop — derive art from a stable list of words.
  const tiles = [
    "Verdant Hollow", "Sable Reach", "Ironveil Protocol", "Polaris Drift",
    "Orbital Forge", "Midnight Atlas", "Kingdom of Glass", "Static Cathedral",
    "Cinderwake",
  ].map((title) => ({ title, art: deriveArt(title), coverUrl: null as string | null }));
  const positions: Array<[number, number, number]> = [
    [8, 35, -8], [55, 25, 6], [20, 62, -4], [68, 60, 8],
    [35, 82, -3], [80, 80, -6], [10, 18, 4], [48, 48, -2], [72, 12, 5],
  ];

  // Animate scan
  useEffect(() => {
    if (step !== 3) return;
    setScanPct(0);
    const id = setInterval(() => {
      setScanPct((p) => {
        if (p >= 100) {
          clearInterval(id);
          setTimeout(() => setStep(4), 500);
          return 100;
        }
        return Math.min(100, p + 2);
      });
    }, 40);
    return () => clearInterval(id);
  }, [step]);

  function pick(id: string) {
    setPicked((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--bg)",
        zIndex: 100,
        display: "flex",
        fontFamily: "var(--font-sans)",
        overflow: "hidden",
      }}
    >
      {/* Left art panel */}
      <div
        style={{
          width: "42%",
          position: "relative",
          background: "linear-gradient(160deg, var(--accent-soft), transparent 60%), var(--bg-2)",
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          padding: 40,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative", zIndex: 1 }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              background: "var(--accent)",
              color: "var(--accent-ink)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 14,
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
            }}
          >
            M
          </div>
          <div
            style={{
              fontSize: 17,
              fontFamily: "var(--font-serif)",
              fontWeight: 500,
              letterSpacing: -0.2,
            }}
          >
            Mylibrary
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            inset: 0,
            overflow: "hidden",
            pointerEvents: "none",
            opacity: step >= 2 ? 1 : 0.4,
            transition: "opacity .5s",
          }}
        >
          {tiles.map((g, i) => {
            const [x, y, r] = positions[i];
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: `rotate(${r}deg) scale(${step >= 3 ? 1 : 0.9})`,
                  transition: "transform .6s",
                  boxShadow: "0 10px 30px -6px rgba(0,0,0,0.6)",
                  opacity: 0.7,
                }}
              >
                <Cover game={g} w={100} h={134} showTitle={false} radius={4} />
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: "auto", display: "flex", gap: 6, position: "relative", zIndex: 1 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 2,
                borderRadius: 1,
                background: i <= step ? "var(--accent)" : "var(--border)",
                transition: "background .3s",
              }}
            />
          ))}
        </div>
      </div>

      {/* Right content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "auto" }}>
        <div
          style={{
            flex: 1,
            padding: "70px 70px 40px",
            maxWidth: 640,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          {step === 0 && <StepWelcome onNext={() => setStep(1)} onSkip={() => router.push("/")} />}
          {step === 1 && (
            <StepPickStores
              picked={picked}
              onTogglePicked={pick}
              onNext={() => setStep(2)}
              onSkip={() => setStep(3)}
            />
          )}
          {step === 2 && (
            <StepSecondAccount
              hasAccounts={accountCount > 0}
              onNext={() => setStep(3)}
              onLink={() => router.push("/accounts")}
            />
          )}
          {step === 3 && <StepScanning pct={scanPct} libraries={picked.size + 1} />}
          {step === 4 && (
            <StepDone
              gameCount={gameCount}
              dupCount={dupCount}
              onEnter={() => router.push("/")}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        letterSpacing: 3,
        textTransform: "uppercase",
        color: "var(--accent)",
        fontWeight: 700,
        marginBottom: 14,
      }}
    >
      {children}
    </div>
  );
}

function StepWelcome({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  return (
    <div style={{ animation: "riseIn .4s cubic-bezier(.2,.8,.2,1)" }}>
      <Eyebrow>Step 1 of 4 · Welcome</Eyebrow>
      <div
        style={{
          fontSize: 42,
          fontFamily: "var(--font-serif)",
          fontWeight: 500,
          letterSpacing: -1,
          lineHeight: 1.05,
          marginBottom: 20,
        }}
      >
        One library across <span style={{ fontStyle: "italic", color: "var(--accent)" }}>every</span> store you've ever used.
      </div>
      <div style={{ fontSize: 15, color: "var(--text-soft)", lineHeight: 1.6, marginBottom: 36 }}>
        We'll scan your accounts, find every game you own — including the{" "}
        <b style={{ color: "var(--text)" }}>ones you bought twice</b> — and give you a single shelf to browse.
      </div>
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <Btn primary onClick={onNext} style={{ padding: "10px 18px", fontSize: 13 }}>
          Get started →
        </Btn>
        <button
          type="button"
          onClick={onSkip}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-faint)",
            fontSize: 12,
            cursor: "pointer",
            fontFamily: "var(--font-sans)",
          }}
        >
          Skip intro
        </button>
      </div>
    </div>
  );
}

function StepPickStores({
  picked,
  onTogglePicked,
  onNext,
  onSkip,
}: {
  picked: Set<string>;
  onTogglePicked: (id: string) => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  return (
    <div style={{ animation: "riseIn .4s cubic-bezier(.2,.8,.2,1)" }}>
      <Eyebrow>Step 2 of 4 · Connect your stores</Eyebrow>
      <div
        style={{
          fontSize: 32,
          fontFamily: "var(--font-serif)",
          fontWeight: 500,
          letterSpacing: -0.8,
          lineHeight: 1.15,
          marginBottom: 10,
        }}
      >
        Which stores do you buy games from?
      </div>
      <div style={{ fontSize: 13, color: "var(--text-soft)", marginBottom: 28, lineHeight: 1.55 }}>
        Tap any to flag your interest. We'll walk you through linking each one in the Accounts page.{" "}
        Greyed-out stores are coming soon.
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 10,
          marginBottom: 28,
        }}
      >
        {[...SUPPORTED, ...TEASE].map((sid) => {
          const s = STORE_PALETTE[sid];
          const supported = SUPPORTED.includes(sid);
          const on = picked.has(sid);
          return (
            <button
              key={sid}
              type="button"
              onClick={() => supported && onTogglePicked(sid)}
              disabled={!supported}
              style={{
                padding: 14,
                border: `1px solid ${on ? "var(--accent)" : "var(--border)"}`,
                borderRadius: 6,
                background: on ? "var(--accent-soft)" : "transparent",
                cursor: supported ? "pointer" : "not-allowed",
                opacity: supported ? 1 : 0.4,
                display: "flex",
                alignItems: "center",
                gap: 10,
                position: "relative",
                transition: "all .15s",
                color: "var(--text)",
                fontFamily: "var(--font-sans)",
                textAlign: "left",
              }}
            >
              <StoreDot id={sid} size={22} />
              <span style={{ fontSize: 12.5 }}>{s.name}</span>
              {!supported && (
                <span
                  style={{
                    fontSize: 8,
                    marginLeft: "auto",
                    color: "var(--text-faint)",
                    letterSpacing: 1,
                  }}
                >
                  SOON
                </span>
              )}
              {on && (
                <span
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    color: "var(--accent)",
                    display: "flex",
                  }}
                >
                  <Icon name="check" size={12} />
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <Btn primary disabled={picked.size === 0} onClick={onNext}>
          Continue with {picked.size} store{picked.size === 1 ? "" : "s"} →
        </Btn>
        <button
          type="button"
          onClick={onSkip}
          style={{
            background: "none",
            border: "none",
            fontSize: 11.5,
            color: "var(--text-faint)",
            cursor: "pointer",
            fontFamily: "var(--font-sans)",
          }}
        >
          or skip for now
        </button>
      </div>
    </div>
  );
}

function StepSecondAccount({
  hasAccounts,
  onNext,
  onLink,
}: {
  hasAccounts: boolean;
  onNext: () => void;
  onLink: () => void;
}) {
  const [imagined, setImagined] = useState(false);
  return (
    <div style={{ animation: "riseIn .4s cubic-bezier(.2,.8,.2,1)" }}>
      <Eyebrow>Step 3 of 4 · The trick question</Eyebrow>
      <div
        style={{
          fontSize: 34,
          fontFamily: "var(--font-serif)",
          fontWeight: 500,
          letterSpacing: -0.8,
          lineHeight: 1.1,
          marginBottom: 16,
        }}
      >
        Do you have a <span style={{ fontStyle: "italic", color: "var(--accent)" }}>second Steam account</span>?
      </div>
      <div
        style={{
          fontSize: 14,
          color: "var(--text-soft)",
          lineHeight: 1.55,
          marginBottom: 28,
          maxWidth: 520,
        }}
      >
        An old one from college. A second login for Family Sharing. A backup with the indie-bundle haul.{" "}
        <b style={{ color: "var(--text)" }}>This is the reason Mylibrary exists</b> — link both and we'll stitch the libraries into one.
      </div>

      <div
        style={{
          padding: 18,
          border: `1px solid ${hasAccounts ? "var(--accent)" : "var(--border)"}`,
          borderRadius: 8,
          background: hasAccounts ? "var(--accent-soft)" : "var(--bg-2)",
          marginBottom: 14,
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <StoreDot id="steam" size={28} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13 }}>Steam</div>
          <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>
            {hasAccounts ? "Linked from previous setup" : "Link this on the Accounts page"}
          </div>
        </div>
        {hasAccounts && (
          <span
            style={{
              fontSize: 9,
              padding: "2px 6px",
              background: "var(--accent)",
              color: "var(--accent-ink)",
              borderRadius: 2,
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            PRIMARY
          </span>
        )}
      </div>

      {!imagined ? (
        <button
          type="button"
          onClick={() => setImagined(true)}
          style={{
            width: "100%",
            padding: 18,
            border: "1.5px dashed var(--accent)",
            borderRadius: 8,
            background: "transparent",
            display: "flex",
            alignItems: "center",
            gap: 14,
            cursor: "pointer",
            color: "var(--accent)",
            textAlign: "left",
            fontFamily: "var(--font-sans)",
          }}
          className="hover-lift"
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              border: "1.5px dashed var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="plus" size={14} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>Imagine: a second Steam account</div>
            <div style={{ fontSize: 11.5, color: "var(--text-soft)", marginTop: 2 }}>
              Most people have one — and forget about it.
            </div>
          </div>
          <span style={{ fontSize: 11.5 }}>→</span>
        </button>
      ) : (
        <div
          style={{
            padding: 18,
            border: "1px solid var(--accent)",
            borderRadius: 8,
            background: "var(--accent-soft)",
            display: "flex",
            alignItems: "center",
            gap: 14,
            animation: "riseIn .3s",
          }}
        >
          <StoreDot id="steam" size={28} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13 }}>Steam · @backup.library</div>
            <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>
              Linked · 412 games detected ·{" "}
              <b style={{ color: "var(--accent)" }}>47 overlap with primary</b>
            </div>
          </div>
          <span
            style={{
              fontSize: 9,
              padding: "2px 6px",
              background: "rgba(255,255,255,0.05)",
              color: "var(--text-soft)",
              borderRadius: 2,
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            BACKUP
          </span>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 20, alignItems: "center" }}>
        <Btn primary onClick={onLink}>
          Link accounts now →
        </Btn>
        <button
          type="button"
          onClick={onNext}
          style={{
            background: "none",
            border: "none",
            fontSize: 11.5,
            color: "var(--accent)",
            cursor: "pointer",
            fontFamily: "var(--font-sans)",
          }}
        >
          {imagined ? "Continue intro →" : "only one, thanks"}
        </button>
      </div>
    </div>
  );
}

function StepScanning({ pct, libraries }: { pct: number; libraries: number }) {
  return (
    <div style={{ animation: "fadeIn .3s" }}>
      <Eyebrow>Scanning…</Eyebrow>
      <div
        style={{
          fontSize: 30,
          fontFamily: "var(--font-serif)",
          fontWeight: 500,
          letterSpacing: -0.7,
          lineHeight: 1.15,
          marginBottom: 32,
        }}
      >
        Reading {libraries} {libraries === 1 ? "library" : "libraries"}, cross-referencing…
      </div>
      <div
        style={{
          position: "relative",
          height: 4,
          background: "var(--border)",
          borderRadius: 2,
          overflow: "hidden",
          marginBottom: 10,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            height: "100%",
            width: `${pct}%`,
            background: "var(--accent)",
            transition: "width .2s",
          }}
        />
      </div>
      <div style={{ fontSize: 11.5, color: "var(--text-faint)" }} className="tnum">
        {pct}% · Hashing cover art fingerprints…
      </div>
      <div style={{ marginTop: 36, display: "flex", flexDirection: "column", gap: 8 }}>
        {[
          { t: "Reading library indices", d: pct > 20 ? "done" : "…", done: pct > 20 },
          { t: "Fetching cover art", d: pct > 45 ? "done" : "…", done: pct > 45 },
          { t: "Detecting duplicates", d: pct > 75 ? "done" : "…", done: pct > 75 },
          { t: "Aggregating playtime", d: pct > 90 ? "done" : "…", done: pct > 90 },
        ].map((row, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 12,
              color: "var(--text-soft)",
            }}
          >
            <span style={{ color: row.done ? "var(--accent)" : "var(--text-faint)", display: "flex" }}>
              {row.done ? <Icon name="check" size={12} /> : (
                <span style={{
                  width: 8, height: 8, borderRadius: 4,
                  border: "1.5px solid var(--text-faint)",
                  display: "inline-block",
                }} />
              )}
            </span>
            <span style={{ flex: 1 }}>{row.t}</span>
            <span style={{ fontSize: 11, color: "var(--text-faint)" }}>{row.d}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepDone({
  gameCount,
  dupCount,
  onEnter,
}: {
  gameCount: number;
  dupCount: number;
  onEnter: () => void;
}) {
  return (
    <div style={{ animation: "riseIn .4s cubic-bezier(.2,.8,.2,1)" }}>
      <Eyebrow>Done · Step 4 of 4</Eyebrow>
      <div
        style={{
          fontSize: 38,
          fontFamily: "var(--font-serif)",
          fontWeight: 500,
          letterSpacing: -0.9,
          lineHeight: 1.05,
          marginBottom: 18,
        }}
      >
        You own{" "}
        <span style={{ color: "var(--accent)", fontStyle: "italic" }} className="tnum">
          {gameCount} games
        </span>
        {dupCount > 0 ? (
          <>
            . And{" "}
            <span style={{ color: "var(--accent)", fontStyle: "italic" }} className="tnum">
              {dupCount}
            </span>{" "}
            of them, more than once.
          </>
        ) : (
          " across your linked stores."
        )}
      </div>
      <div style={{ fontSize: 14, color: "var(--text-soft)", lineHeight: 1.6, marginBottom: 28 }}>
        {dupCount > 0
          ? `Estimated redundant spend: $${dupCount * 20}. We've flagged them in the Duplicates view — review or merge as you like.`
          : "Add another account on a store you already use to find overlaps. The duplicates view will surface them automatically."}
      </div>
      <Btn primary onClick={onEnter} style={{ padding: "10px 18px", fontSize: 13 }}>
        Enter Mylibrary →
      </Btn>
    </div>
  );
}
