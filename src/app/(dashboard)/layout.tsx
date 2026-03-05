"use client";
import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useSettings } from "@/lib/SettingsContext";

const NAV = [
  { section: "Main", items: [
    { label: "Dashboard", href: "/dashboard", icon: "🏠" },
    { label: "AI Agent", href: "/dashboard/ai", icon: "🤖" },
  ]},
  { section: "Subscriptions", items: [
    { label: "My Subscriptions", href: "/dashboard/subscriptions", icon: "📋" },
    { label: "My Bills", href: "/dashboard/bills", icon: "🧾" },
    { label: "Analytics", href: "/dashboard/analytics", icon: "📊" },
    { label: "Categories", href: "/dashboard/categories", icon: "🏷️" },
    { label: "Family", href: "/dashboard/family", icon: "👨‍👩‍👧" },
    { label: "Payment Methods", href: "/dashboard/payments", icon: "💳" },
    { label: "Notifications", href: "/dashboard/notifications", icon: "🔔" },
    { label: "Shared Links", href: "/dashboard/shares", icon: "🔗" },
  ]},
  { section: "Account", items: [
    { label: "Profile", href: "/dashboard/profile", icon: "👤" },
    { label: "Settings", href: "/dashboard/settings", icon: "⚙️" },
  ]},
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { platform, userAvatar, userName, userRole, reloadProfile } = useSettings();
  const [notifCount, setNotifCount] = useState(0);
  const [search, setSearch] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status]);
  useEffect(() => { reloadProfile(); }, [pathname]);

  useEffect(() => {
    fetch("/api/notifications").then(r => r.json()).then(data => {
      if (Array.isArray(data)) setNotifCount(data.filter((n: any) => !n.read).length);
    }).catch(() => {});
  }, [pathname]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setShowUserMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (status === "loading") return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
      <div style={{ color: "var(--muted)", fontSize: 14 }}>Loading...</div>
    </div>
  );
  if (!session) return null;

  const accentColor = platform?.primary_color || "#6366F1";
  const appName = platform?.app_name || "Nexyo";
  const displayAvatar = userAvatar;
  const displayName = userName || session.user?.name || "User";
  const initials = displayName[0]?.toUpperCase() || "U";

  const AvatarEl = ({ size = 32 }: { size?: number }) => (
    <div style={{ width: size, height: size, borderRadius: 99, background: accentColor, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "white", fontSize: size * 0.4, flexShrink: 0, overflow: "hidden" }}>
      {displayAvatar
        ? <img src={displayAvatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" onError={e => { (e.currentTarget.parentElement as HTMLElement).innerHTML = initials; }} />
        : initials}
    </div>
  );

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--bg)" }}>
      {/* Sidebar */}
      <div style={{ width: 220, background: "var(--surface)", borderRight: "1px solid var(--border-color)", height: "100%", display: "flex", flexDirection: "column", padding: "14px 10px", gap: 1, flexShrink: 0, overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 6px", marginBottom: 14 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: accentColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, overflow: "hidden", flexShrink: 0 }}>
            {platform?.logo ? <img src={platform.logo} style={{ width: "100%", height: "100%", objectFit: "contain" }} alt="logo" /> : "💰"}
          </div>
          <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: "-0.4px" }}>{appName}</span>
        </div>

        {NAV.map(section => (
          <div key={section.section}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase", padding: "8px 10px 3px" }}>{section.section}</div>
            {section.items.map(item => {
              const active = pathname === item.href;
              return (
                <Link key={item.href} href={item.href} className={`nav-item ${active ? "active" : ""}`} style={{ textDecoration: "none" }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.label === "Notifications" && notifCount > 0 && (
                    <span style={{ background: "#EF4444", color: "white", borderRadius: 99, fontSize: 10, fontWeight: 700, padding: "1px 6px", flexShrink: 0 }}>{notifCount}</span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}

        {userRole === "admin" && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase", padding: "8px 10px 3px" }}>Admin</div>
            <Link href="/admin" className={`nav-item ${pathname === "/admin" ? "active" : ""}`} style={{ textDecoration: "none" }}>
              <span style={{ fontSize: 14 }}>🛡️</span><span>Admin Portal</span>
            </Link>
          </div>
        )}

        {/* User section */}
        <div style={{ marginTop: "auto", paddingTop: 10, borderTop: "1px solid var(--border-color)" }}>
          <div ref={userMenuRef} style={{ position: "relative" }}>
            <div onClick={() => setShowUserMenu(p => !p)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px", borderRadius: 8, cursor: "pointer", transition: "background 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--surface2)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <AvatarEl size={30} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text)" }}>{displayName}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session.user?.email}</div>
              </div>
              <span style={{ color: "var(--muted)", fontSize: 12 }}>⌄</span>
            </div>
            {showUserMenu && (
              <div style={{ position: "absolute", bottom: "100%", left: 0, right: 0, background: "var(--surface)", border: "1px solid var(--border-color)", borderRadius: 10, overflow: "hidden", marginBottom: 4, zIndex: 50 }}>
                <Link href="/dashboard/profile" onClick={() => setShowUserMenu(false)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", textDecoration: "none", color: "var(--text)", fontSize: 13, transition: "background 0.12s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--surface2)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <span>👤</span> Profile
                </Link>
                <Link href="/dashboard/settings" onClick={() => setShowUserMenu(false)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", textDecoration: "none", color: "var(--text)", fontSize: 13, transition: "background 0.12s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--surface2)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <span>⚙️</span> Settings
                </Link>
                <div style={{ borderTop: "1px solid var(--border-color)" }} />
                <button onClick={() => signOut({ callbackUrl: "/login" })} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", width: "100%", background: "none", border: "none", color: "#EF4444", fontSize: 13, cursor: "pointer", textAlign: "left", transition: "background 0.12s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(239,68,68,0.08)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <span>↩</span> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
        {/* Top bar */}
        <div style={{ height: 54, borderBottom: "1px solid var(--border-color)", display: "flex", alignItems: "center", padding: "0 16px", background: "var(--surface)", flexShrink: 0, gap: 10 }}>
          {/* Search */}
          <div style={{ flex: 1, maxWidth: 400, position: "relative" }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", fontSize: 14 }}>🔍</span>
            <input
              className="input"
              placeholder="Search subscriptions..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 32, height: 36, fontSize: 13 }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Link href="/dashboard/notifications" style={{ position: "relative", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, color: "var(--muted)", textDecoration: "none", fontSize: 16, transition: "background 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--surface2)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              🔔
              {notifCount > 0 && <span style={{ position: "absolute", top: 6, right: 6, width: 7, height: 7, borderRadius: 99, background: "#EF4444", display: "block" }} />}
            </Link>
            <Link href="/dashboard/settings" style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, color: "var(--muted)", textDecoration: "none", fontSize: 16, transition: "background 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--surface2)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>⚙️</Link>
            
            {/* Logout button */}
            <button onClick={() => signOut({ callbackUrl: "/login" })} title="Sign out" style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, background: "none", border: "1px solid var(--border-color)", color: "var(--muted)", cursor: "pointer", fontSize: 14, transition: "all 0.15s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.08)"; (e.currentTarget as HTMLElement).style.color = "#EF4444"; (e.currentTarget as HTMLElement).style.borderColor = "#EF444440"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "none"; (e.currentTarget as HTMLElement).style.color = "var(--muted)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--border-color)"; }}>
              ↩
            </button>

            <Link href="/dashboard/profile">
              <AvatarEl size={32} />
            </Link>
          </div>
        </div>

        {/* Page */}
        <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: 24 }}>
          {children}
        </div>
      </div>
    </div>
  );
}
