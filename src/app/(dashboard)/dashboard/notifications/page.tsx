"use client";
import { useState, useEffect } from "react";

interface Notif {
  id: number;
  message: string;
  read: boolean;
  sub_name?: string;
  sub_icon?: string;
  created_at: string;
}

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const res = await fetch("/api/notifications");
    const data = await res.json();
    setNotifs(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id?: number) => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(id ? { id, read: true } : { readAll: true }),
    });
    setNotifs(prev => id ? prev.map(n => n.id === id ? { ...n, read: true } : n) : prev.map(n => ({ ...n, read: true })));
  };

  if (loading) return <div style={{ color: "var(--muted)" }}>Loading...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="fade-in">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Notifications</h1>
        {notifs.some(n => !n.read) && (
          <button className="btn-ghost" onClick={() => markRead()}>Mark all read</button>
        )}
      </div>
      <div className="card" style={{ padding: 0 }}>
        {notifs.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
            🎉 No notifications
          </div>
        ) : notifs.map((n, i) => (
          <div key={n.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: i < notifs.length - 1 ? "1px solid var(--border-color)" : "none", background: n.read ? "transparent" : "rgba(99,102,241,0.06)", transition: "background 0.15s" }}>
            {n.sub_icon && <img src={n.sub_icon} width={32} height={32} style={{ borderRadius: 8, background: "#fff", padding: 2 }} alt="" onError={e => (e.currentTarget.style.display = "none")} />}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: n.read ? 400 : 600 }}>{n.message}</div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{new Date(n.created_at).toLocaleDateString()}</div>
            </div>
            {!n.read && <div style={{ width: 8, height: 8, borderRadius: 99, background: "#6366F1", flexShrink: 0 }} />}
            {!n.read && (
              <button className="btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => markRead(n.id)}>Dismiss</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
