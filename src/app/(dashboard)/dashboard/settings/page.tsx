"use client";
import { useState, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";

export default function SettingsPage() {
  const { data: session } = useSession();
  const [settings, setSettings] = useState({ currency: "USD", theme: "dark", remind_3d: false, remind_7d: true, remind_14d: false });
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(data => {
      if (data && !data.error) setSettings({ ...data, remind_3d: !!data.remind_3d, remind_7d: !!data.remind_7d, remind_14d: !!data.remind_14d });
      setLoading(false);
    });
  }, []);

  const save = async () => {
    await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    // Apply theme
    document.documentElement.className = settings.theme === "light" ? "light" : "dark";
  };

  const set = (k: string, v: any) => setSettings(p => ({ ...p, [k]: v }));

  if (loading) return <div style={{ color: "var(--muted)" }}>Loading...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 540 }} className="fade-in">
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Settings</h1>

      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Account</div>
          <div style={{ fontSize: 14, color: "var(--muted)" }}>{session?.user?.name} · {session?.user?.email}</div>
        </div>

        <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 20 }}>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Appearance</div>
          <div style={{ display: "flex", gap: 8 }}>
            {[["dark", "🌙 Dark"], ["light", "☀️ Light"]].map(([t, label]) => (
              <button key={t} onClick={() => set("theme", t)} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${settings.theme === t ? "#6366F1" : "var(--border-color)"}`, background: settings.theme === t ? "rgba(99,102,241,0.12)" : "transparent", color: settings.theme === t ? "#6366F1" : "var(--muted)", fontWeight: 500, fontSize: 14, cursor: "pointer" }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 20 }}>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Default Currency</div>
          <select className="select" value={settings.currency} onChange={e => set("currency", e.target.value)}>
            {["USD", "EUR", "GBP", "CAD", "AUD", "EGP"].map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 20 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Renewal Reminders</div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>Get notified before subscriptions renew</div>
          {[["remind_3d", "3 days before"], ["remind_7d", "7 days before"], ["remind_14d", "14 days before"]].map(([key, label]) => (
            <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, cursor: "pointer", fontSize: 14 }}>
              <input type="checkbox" checked={!!(settings as any)[key]} onChange={e => set(key, e.target.checked)} style={{ accentColor: "#6366F1", width: 16, height: 16 }} />
              {label}
            </label>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="btn-primary" onClick={save}>{saved ? "✓ Saved" : "Save Settings"}</button>
          <button className="btn-ghost" onClick={() => signOut({ callbackUrl: "/login" })}>Sign out</button>
        </div>
      </div>
    </div>
  );
}
