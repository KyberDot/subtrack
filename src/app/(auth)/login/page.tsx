"use client";
import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [platform, setPlatform] = useState({ app_name: "Nexyo", logo: "", primary_color: "#6366F1", allow_registration: true });

  useEffect(() => {
    fetch("/api/platform").then(r => r.json()).then(d => {
      if (d && !d.error) setPlatform({ ...platform, ...d, allow_registration: !!d.allow_registration });
    }).catch(() => {});
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    const res = await signIn("credentials", { email: form.email, password: form.password, redirect: false });
    if (res?.ok) { router.push("/dashboard"); }
    else { setError("Invalid email or password"); setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Brand */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: platform.primary_color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 12px", overflow: "hidden" }}>
            {platform.logo ? <img src={platform.logo} style={{ width: "100%", height: "100%", objectFit: "contain" }} alt="logo" /> : "💰"}
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px" }}>{platform.app_name}</h1>
          <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 4 }}>Sign in to your account</p>
        </div>

        <div className="card" style={{ padding: 28 }}>
          {params.get("registered") && <div style={{ marginBottom: 14, padding: "10px 12px", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 8, fontSize: 13, color: "#10B981" }}>Account created! Sign in below.</div>}
          {error && <div style={{ marginBottom: 14, padding: "10px 12px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, fontSize: 13, color: "#EF4444" }}>{error}</div>}
          
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: "0.05em" }}>Email</label>
              <input className="input" type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: "0.05em" }}>Password</label>
              <input className="input" type="password" placeholder="••••••••" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required />
            </div>
            <button className="btn-primary" type="submit" disabled={loading} style={{ width: "100%", justifyContent: "center", marginTop: 4, background: platform.primary_color }}>
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {platform.allow_registration && (
            <p style={{ marginTop: 20, textAlign: "center", fontSize: 13, color: "var(--muted)" }}>
              Don't have an account?{" "}
              <Link href="/register" style={{ color: platform.primary_color, fontWeight: 600, textDecoration: "none" }}>Create one</Link>
            </p>
          )}
          {!platform.allow_registration && (
            <p style={{ marginTop: 20, textAlign: "center", fontSize: 12, color: "var(--muted)" }}>Registration is by invitation only. Contact your admin.</p>
          )}
        </div>
      </div>
    </div>
  );
}
