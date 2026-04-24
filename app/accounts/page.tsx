"use client";

import { useEffect, useState } from "react";
import { Btn, PageHeader, StoreDot, Icon } from "@/lib/design/primitives";
import { STORE_PALETTE } from "@/lib/store-meta";

type Account = {
  id: string;
  storeId: string;
  label: string;
  externalId: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  lastSyncAt: string | null;
  lastSyncOk: boolean;
  lastError: string | null;
  _count: { owned: number };
};

type AddTarget = "steam" | "gog" | "epic" | null;

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = useState<AddTarget>(null);
  const [reauthOpen, setReauthOpen] = useState<{ accountId: string; storeId: string; label: string } | null>(null);
  const [reauthInput, setReauthInput] = useState("");
  const [reauthBusy, setReauthBusy] = useState(false);
  const [reauthErr, setReauthErr] = useState<string | null>(null);

  // Steam form state
  const [steamLabel, setSteamLabel] = useState("");
  const [steamIdentifier, setSteamIdentifier] = useState("");
  const [steamBusy, setSteamBusy] = useState(false);
  const [steamErr, setSteamErr] = useState<string | null>(null);

  // GOG form state
  const [gogLabel, setGogLabel] = useState("");
  const [gogCodeOrUrl, setGogCodeOrUrl] = useState("");
  const [gogBusy, setGogBusy] = useState(false);
  const [gogErr, setGogErr] = useState<string | null>(null);

  // Epic form state
  const [epicLabel, setEpicLabel] = useState("");
  const [epicCodeOrJson, setEpicCodeOrJson] = useState("");
  const [epicBusy, setEpicBusy] = useState(false);
  const [epicErr, setEpicErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/accounts");
    const json = await res.json();
    setAccounts(json.accounts);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function syncAccount(id: string) {
    setSyncingIds((s) => new Set(s).add(id));
    try {
      const res = await fetch(`/api/accounts/${id}/sync`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) alert(`Sync failed: ${json.error}`);
    } finally {
      setSyncingIds((s) => { const n = new Set(s); n.delete(id); return n; });
      await load();
    }
  }

  async function removeAccount(id: string) {
    if (!confirm("Remove this account and all its owned-copy data?")) return;
    await fetch(`/api/accounts/${id}`, { method: "DELETE" });
    await load();
  }

  async function openReauthAuth(storeId: string) {
    if (storeId === "gog") {
      const r = await fetch("/api/gog/auth-url");
      const { url } = await r.json();
      window.open(url, "_blank", "noopener,noreferrer");
    } else if (storeId === "epic") {
      const r = await fetch("/api/epic/auth-url");
      const { url } = await r.json();
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  async function submitReauth(e: React.FormEvent) {
    e.preventDefault();
    if (!reauthOpen) return;
    setReauthErr(null);
    setReauthBusy(true);
    const body =
      reauthOpen.storeId === "gog"
        ? { gogCodeOrUrl: reauthInput }
        : { epicCodeOrJson: reauthInput };
    const res = await fetch(`/api/accounts/${reauthOpen.accountId}/reauth`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    setReauthBusy(false);
    if (!res.ok) {
      setReauthErr(typeof json.error === "string" ? json.error : "Reauth failed");
      return;
    }
    setReauthOpen(null);
    setReauthInput("");
    await load();
    syncAccount(reauthOpen.accountId);
  }

  async function addSteam(e: React.FormEvent) {
    e.preventDefault(); setSteamErr(null); setSteamBusy(true);
    const res = await fetch("/api/accounts", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ storeId: "steam", label: steamLabel, steamIdentifier }),
    });
    const json = await res.json(); setSteamBusy(false);
    if (!res.ok) { setSteamErr(typeof json.error === "string" ? json.error : "Failed to add"); return; }
    setSteamLabel(""); setSteamIdentifier(""); setAddOpen(null); await load(); syncAccount(json.account.id);
  }

  async function openGogAuth() {
    const r = await fetch("/api/gog/auth-url");
    const { url } = await r.json();
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function addGog(e: React.FormEvent) {
    e.preventDefault(); setGogErr(null); setGogBusy(true);
    const res = await fetch("/api/accounts", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ storeId: "gog", label: gogLabel, gogCodeOrUrl }),
    });
    const json = await res.json(); setGogBusy(false);
    if (!res.ok) { setGogErr(typeof json.error === "string" ? json.error : "Failed to add"); return; }
    setGogLabel(""); setGogCodeOrUrl(""); setAddOpen(null); await load(); syncAccount(json.account.id);
  }

  async function openEpicAuth() {
    const r = await fetch("/api/epic/auth-url");
    const { url } = await r.json();
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function addEpic(e: React.FormEvent) {
    e.preventDefault(); setEpicErr(null); setEpicBusy(true);
    const res = await fetch("/api/accounts", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ storeId: "epic", label: epicLabel, epicCodeOrJson }),
    });
    const json = await res.json(); setEpicBusy(false);
    if (!res.ok) { setEpicErr(typeof json.error === "string" ? json.error : "Failed to add"); return; }
    setEpicLabel(""); setEpicCodeOrJson(""); setAddOpen(null); await load(); syncAccount(json.account.id);
  }

  // Group by store, mark first per store as primary.
  const grouped: Record<string, Account[]> = {};
  for (const a of accounts) (grouped[a.storeId] ??= []).push(a);

  return (
    <div>
      <PageHeader
        eyebrow="Connected accounts"
        title="Accounts"
        subtitle={`${accounts.length} linked across ${Object.keys(grouped).length} store${Object.keys(grouped).length === 1 ? "" : "s"}. Multi-account per store is the whole point — link as many as you have.`}
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <Btn icon="plus" onClick={() => setAddOpen("steam")}>Add Steam</Btn>
            <Btn icon="plus" onClick={() => setAddOpen("gog")}>Add GOG</Btn>
            <Btn icon="plus" primary onClick={() => setAddOpen("epic")}>Add Epic</Btn>
          </div>
        }
      />

      <div style={{ padding: "24px 40px 60px", display: "flex", flexDirection: "column", gap: 28 }}>
        {loading ? (
          <div style={{ color: "var(--text-faint)" }}>Loading…</div>
        ) : accounts.length === 0 ? (
          <div
            style={{
              padding: 40,
              border: "1px dashed var(--border)",
              borderRadius: 8,
              textAlign: "center",
              color: "var(--text-soft)",
            }}
          >
            No accounts yet. Click an Add button above.
          </div>
        ) : (
          Object.keys(STORE_PALETTE)
            .filter((sid) => grouped[sid]?.length)
            .map((sid) => {
              const list = grouped[sid];
              const meta = STORE_PALETTE[sid];
              return (
                <section key={sid}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <StoreDot id={sid} size={20} />
                    <h2
                      style={{
                        fontSize: 18,
                        fontFamily: "var(--font-serif)",
                        fontWeight: 500,
                        letterSpacing: -0.3,
                        margin: 0,
                      }}
                    >
                      {meta?.name ?? sid}
                    </h2>
                    {list.length > 1 && (
                      <span
                        style={{
                          fontSize: 9,
                          padding: "1px 5px",
                          background: "var(--accent-soft)",
                          color: "var(--accent)",
                          borderRadius: 3,
                          fontWeight: 700,
                          letterSpacing: 0.5,
                        }}
                      >
                        ×{list.length}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                      gap: 12,
                    }}
                  >
                    {list.map((a, i) => {
                      const isPrimary = i === 0;
                      const handle = a.displayName ?? a.label;
                      return (
                        <div
                          key={a.id}
                          style={{
                            padding: 16,
                            background: "var(--bg-2)",
                            border: "1px solid var(--border)",
                            borderRadius: 8,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                            <StoreDot id={a.storeId} size={32} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                style={{
                                  fontSize: 14,
                                  fontWeight: 500,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                }}
                              >
                                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  @{handle}
                                </span>
                                {isPrimary && (
                                  <span
                                    style={{
                                      fontSize: 8,
                                      padding: "1px 4px",
                                      background: "var(--accent)",
                                      color: "var(--accent-ink)",
                                      borderRadius: 2,
                                      fontWeight: 700,
                                      letterSpacing: 0.5,
                                    }}
                                  >
                                    PRI
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>
                                {a.label}
                              </div>
                            </div>
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: "var(--text-soft)",
                              display: "flex",
                              gap: 14,
                              marginBottom: 12,
                            }}
                          >
                            <span><span className="tnum">{a._count.owned}</span> games</span>
                            {a.lastSyncAt && (
                              <span>
                                {a.lastSyncOk ? "Synced" : "Failed"}:{" "}
                                {new Date(a.lastSyncAt).toLocaleString()}
                              </span>
                            )}
                          </div>
                          {a.lastError && (
                            <div
                              style={{
                                fontSize: 11,
                                color: "var(--danger)",
                                marginBottom: 12,
                                lineHeight: 1.4,
                              }}
                              title={a.lastError}
                            >
                              {a.lastError}
                            </div>
                          )}
                          <div style={{ display: "flex", gap: 6 }}>
                            <Btn sm onClick={() => syncAccount(a.id)} disabled={syncingIds.has(a.id)}>
                              {syncingIds.has(a.id) ? "Syncing…" : "Sync"}
                            </Btn>
                            {!a.lastSyncOk && a.lastSyncAt && (a.storeId === "gog" || a.storeId === "epic") && (
                              <Btn sm primary onClick={() => { setReauthOpen({ accountId: a.id, storeId: a.storeId, label: handle }); setReauthInput(""); setReauthErr(null); }}>
                                Re-link
                              </Btn>
                            )}
                            <div style={{ flex: 1 }} />
                            <Btn
                              sm
                              ghost
                              style={{ color: "var(--danger)" }}
                              onClick={() => removeAccount(a.id)}
                            >
                              Remove
                            </Btn>
                          </div>
                        </div>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setAddOpen(sid as AddTarget)}
                      style={{
                        padding: 16,
                        background: "transparent",
                        border: "1px dashed var(--border)",
                        borderRadius: 8,
                        color: "var(--accent)",
                        fontSize: 12.5,
                        fontWeight: 500,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        cursor: "pointer",
                        minHeight: 130,
                        fontFamily: "var(--font-sans)",
                      }}
                    >
                      <Icon name="plus" size={12} /> Add another {meta?.name ?? sid}
                    </button>
                  </div>
                </section>
              );
            })
        )}
      </div>

      {reauthOpen && (
        <div
          onClick={() => setReauthOpen(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 70,
            background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
            animation: "fadeIn 0.18s ease",
          }}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={submitReauth}
            style={{
              width: "min(520px, 100%)",
              background: "var(--bg-2)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: 22,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <StoreDot id={reauthOpen.storeId} size={22} />
              <div style={{ fontSize: 18, fontFamily: "var(--font-serif)", fontWeight: 500, letterSpacing: -0.3, flex: 1 }}>
                Re-link {STORE_PALETTE[reauthOpen.storeId]?.name} · {reauthOpen.label}
              </div>
              <button type="button" onClick={() => setReauthOpen(null)} aria-label="Close" style={{ background: "transparent", border: "none", color: "var(--text-faint)" }}>
                <Icon name="close" size={14} />
              </button>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-soft)", lineHeight: 1.5 }}>
              Token expired. Re-authorize without losing your library — owned games stay; only credentials refresh.
            </div>
            <div
              style={{
                fontSize: 11.5,
                color: "var(--accent)",
                background: "var(--accent-soft)",
                border: "1px solid var(--accent)",
                borderRadius: 6,
                padding: "8px 10px",
                lineHeight: 1.45,
              }}
            >
              <strong>Important — multi-account caveat:</strong> {STORE_PALETTE[reauthOpen.storeId]?.name} login uses your browser session. If you're logged into a <em>different</em> {STORE_PALETTE[reauthOpen.storeId]?.name} account in your normal browser, this re-link will return that account&apos;s tokens — and will be rejected. Open the login URL in an <strong>Incognito / Private window</strong>, sign in as <code>{reauthOpen.label}</code>, then paste the code here.
            </div>
            <ol style={olStyle}>
              <li>
                Open {STORE_PALETTE[reauthOpen.storeId]?.name} login.{" "}
                <button type="button" onClick={() => openReauthAuth(reauthOpen.storeId)} style={inlineLink}>
                  Open ↗
                </button>
              </li>
              <li>
                {reauthOpen.storeId === "gog"
                  ? "Copy URL from the embed.gog.com/on_login_success?…code=… page."
                  : "Copy the JSON shown after login (or just the 32-char code)."}
              </li>
            </ol>
            <input
              style={inputStyle}
              placeholder={reauthOpen.storeId === "gog" ? "https://embed.gog.com/on_login_success?…" : '{"authorizationCode":"…"}'}
              value={reauthInput}
              onChange={(e) => setReauthInput(e.target.value)}
              required
              autoFocus
            />
            {reauthErr && <div style={errStyle}>{reauthErr}</div>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Btn ghost onClick={() => setReauthOpen(null)}>Cancel</Btn>
              <Btn primary type="submit" disabled={reauthBusy}>{reauthBusy ? "Updating…" : "Update credentials →"}</Btn>
            </div>
          </form>
        </div>
      )}

      {addOpen && (
        <div
          onClick={() => setAddOpen(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 60,
            background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
            animation: "fadeIn 0.18s ease",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(560px, 100%)",
              background: "var(--bg-2)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: 24,
              maxHeight: "92vh",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <StoreDot id={addOpen} size={22} />
              <div style={{ fontSize: 18, fontFamily: "var(--font-serif)", fontWeight: 500, letterSpacing: -0.3, flex: 1 }}>
                Add {STORE_PALETTE[addOpen]?.name}
              </div>
              <button
                type="button"
                onClick={() => setAddOpen(null)}
                aria-label="Close"
                style={{ background: "transparent", border: "none", color: "var(--text-faint)", padding: 4 }}
              >
                <Icon name="close" size={14} />
              </button>
            </div>

            {addOpen === "steam" && (
              <form onSubmit={addSteam} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <Field label="Nickname">
                  <input
                    className="input"
                    style={inputStyle}
                    placeholder="Main, Alt, Kid's account…"
                    value={steamLabel}
                    onChange={(e) => setSteamLabel(e.target.value)}
                    required
                  />
                </Field>
                <Field
                  label="Steam vanity, profile URL, or SteamID64"
                  hint="Profile must have Game details: Public to fetch the library."
                >
                  <input
                    style={inputStyle}
                    placeholder="e.g. gabelogannewell  or  76561197960287930"
                    value={steamIdentifier}
                    onChange={(e) => setSteamIdentifier(e.target.value)}
                    required
                  />
                </Field>
                {steamErr && <div style={errStyle}>{steamErr}</div>}
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
                  <Btn ghost onClick={() => setAddOpen(null)}>Cancel</Btn>
                  <Btn primary type="submit" disabled={steamBusy}>{steamBusy ? "Adding…" : "Continue to Steam →"}</Btn>
                </div>
              </form>
            )}

            {addOpen === "gog" && (
              <form onSubmit={addGog} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {grouped.gog?.length > 0 && (
                  <div
                    style={{
                      fontSize: 11.5,
                      color: "var(--accent)",
                      background: "var(--accent-soft)",
                      border: "1px solid var(--accent)",
                      borderRadius: 6,
                      padding: "8px 10px",
                      lineHeight: 1.45,
                    }}
                  >
                    Adding a <strong>second</strong> GOG account? Open the login URL in an <strong>Incognito / Private window</strong> — otherwise you&apos;ll re-auth your existing GOG account.
                  </div>
                )}
                <ol style={olStyle}>
                  <li>
                    Open GOG login.{" "}
                    <button type="button" onClick={openGogAuth} style={inlineLink}>
                      Open ↗
                    </button>
                  </li>
                  <li>After login, copy the URL from the blank <code>embed.gog.com/on_login_success?…code=…</code> page.</li>
                </ol>
                <Field label="Nickname">
                  <input
                    style={inputStyle}
                    placeholder="Main, Alt…"
                    value={gogLabel}
                    onChange={(e) => setGogLabel(e.target.value)}
                    required
                  />
                </Field>
                <Field label="Pasted URL or code">
                  <input
                    style={inputStyle}
                    placeholder="https://embed.gog.com/on_login_success?…code=…"
                    value={gogCodeOrUrl}
                    onChange={(e) => setGogCodeOrUrl(e.target.value)}
                    required
                  />
                </Field>
                {gogErr && <div style={errStyle}>{gogErr}</div>}
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
                  <Btn ghost onClick={() => setAddOpen(null)}>Cancel</Btn>
                  <Btn primary type="submit" disabled={gogBusy}>{gogBusy ? "Adding…" : "Continue to GOG →"}</Btn>
                </div>
              </form>
            )}

            {addOpen === "epic" && (
              <form onSubmit={addEpic} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {grouped.epic?.length > 0 && (
                  <div
                    style={{
                      fontSize: 11.5,
                      color: "var(--accent)",
                      background: "var(--accent-soft)",
                      border: "1px solid var(--accent)",
                      borderRadius: 6,
                      padding: "8px 10px",
                      lineHeight: 1.45,
                    }}
                  >
                    Adding a <strong>second</strong> Epic account? Open the login URL in an <strong>Incognito / Private window</strong> — otherwise Epic re-auths your already-linked account and the add will be rejected as duplicate.
                  </div>
                )}
                <ol style={olStyle}>
                  <li>
                    Open Epic login.{" "}
                    <button type="button" onClick={openEpicAuth} style={inlineLink}>
                      Open ↗
                    </button>
                  </li>
                  <li>After login, copy the JSON shown (or just the 32-char code).</li>
                </ol>
                <Field label="Nickname">
                  <input
                    style={inputStyle}
                    placeholder="Main, Alt…"
                    value={epicLabel}
                    onChange={(e) => setEpicLabel(e.target.value)}
                    required
                  />
                </Field>
                <Field label="Auth code or JSON">
                  <input
                    style={inputStyle}
                    placeholder='{"authorizationCode":"…"} or a 32-char hex code'
                    value={epicCodeOrJson}
                    onChange={(e) => setEpicCodeOrJson(e.target.value)}
                    required
                  />
                </Field>
                {epicErr && <div style={errStyle}>{epicErr}</div>}
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
                  <Btn ghost onClick={() => setAddOpen(null)}>Cancel</Btn>
                  <Btn primary type="submit" disabled={epicBusy}>{epicBusy ? "Adding…" : "Continue to Epic →"}</Btn>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  background: "var(--bg-3)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  color: "var(--text)",
  fontSize: 13,
  fontFamily: "var(--font-sans)",
};

const errStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--danger)",
  padding: "6px 0",
};

const olStyle: React.CSSProperties = {
  paddingLeft: 18,
  margin: 0,
  fontSize: 12.5,
  color: "var(--text-soft)",
  lineHeight: 1.55,
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const inlineLink: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "var(--accent)",
  cursor: "pointer",
  padding: 0,
  fontSize: 12.5,
  fontFamily: "var(--font-sans)",
};

function Field({
  label, hint, children,
}: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11.5, color: "var(--text-faint)", marginBottom: 4, fontFamily: "var(--font-sans)" }}>
        {label}
      </label>
      {children}
      {hint && (
        <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 4 }}>{hint}</div>
      )}
    </div>
  );
}
