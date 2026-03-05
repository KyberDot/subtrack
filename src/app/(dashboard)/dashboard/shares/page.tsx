"use client";
import { useState, useEffect } from "react";

export default function SharesPage() {
  const [links, setLinks] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState("");

  const load = async () => {
    const res = await fetch("/api/shares");
    const data = await res.json();
    setLinks(Array.isArray(data) ? data : []);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!label.trim()) return;
    setCreating(true);
    const res = await fetch("/api/shares", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label }) });
    const data = await res.json();
    setLinks(prev => [data, ...prev]);
    setLabel("");
    setCreating(false);
  };

  const deactivate = async (id: number) => {
    await fetch(`/api/shares/${id}`, { method: "DELETE" });
    setLinks(prev => prev.filter(l => l.id !== id));
  };

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="fade-in">
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Shared Links</h1>
      <p style={{ color: "var(--muted)", fontSize: 14 }}>Share a read-only view of your subscriptions with family members.</p>

      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Create New Link</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input className="input" placeholder="Label (e.g. Partner, Family)" value={label} onChange={e => setLabel(e.target.value)} onKeyDown={e => e.key === "Enter" && create()} />
          <button className="btn-primary" onClick={create} disabled={creating || !label.trim()}>Create</button>
        </div>
      </div>

      {links.length > 0 && (
        <div className="card" style={{ padding: 0 }}>
          {links.map((l, i) => (
            <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: i < links.length - 1 ? "1px solid var(--border-color)" : "none" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{l.label}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2, fontFamily: "monospace" }}>{baseUrl}/shared/{l.token}</div>
              </div>
              <button className="btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => navigator.clipboard.writeText(`${baseUrl}/shared/${l.token}`)}>Copy</button>
              <button style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: 13 }} onClick={() => deactivate(l.id)}>Remove</button>
            </div>
          ))}
        </div>
      )}

      {links.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: 40, color: "var(--muted)", fontSize: 14 }}>
          No shared links yet. Create one above.
        </div>
      )}
    </div>
  );
}
