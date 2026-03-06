"use client";
import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function RegisterContent() {
  const router = useRouter();
  const params = useSearchParams();
  const inviteToken = params.get("invite") || "";
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [platform, setPlatform] = useState({ app_name: "Vexyo", logo: "" as string | undefined, primary_color: "#6366F1", allow_registration: true });
  const [checking, setChecking] = useState(!!inviteToken);

  useEffect(() => {
    fetch("/api/platform").then(r => r.json()).then(d => {
      if (d && !d.error) setPlatform({ ...platform, ...d, allow_registration: !!d.allow_registration });
    });
    if (inviteToken) {
      fetch(`/api/auth/register?invite=${inviteToken}`).then(r => r.json()).then(d => {
        if (d.email) setForm(p => ({ ...p, email: d.email }));
        setChecking(false);
      }).catch(() => setChecking(false));
    }
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) { setError("Passwords don't match"); return; }
    if (form.password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true); setError("");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, email: form.email, password: form.password, invite_token: inviteToken || undefined }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Registration failed"); setLoading(false); return; }
    await signIn("credentials", { email: form.email, password: form.password, redirect: false });
    router.push("/dashboard");
  };

  const acc = platform.primary_color;

  if (checking) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
      <div style={{ color: "var(--muted)" }}>Validating invite...</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 54, height: 54, borderRadius: 14, background: acc, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, margin: "0 auto 12px", overflow: "hidden" }}>
            {platform.logo ? <img src={platform.logo} style={{ width: "100%", height: "100%", objectFit: "contain" }} alt="logo" /> : "💰"}
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.5px" }}>{platform.app_name}</h1>
          <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 4 }}>
            {inviteToken ? "You've been invited! Create your account." : "Create your account"}
          </p>
        </div>
        <div className="card" style={{ padding: 28 }}>
          {error && <div style={{ marginBottom: 14, padding: "10px 12px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, fontSize: 13, color: "#EF4444" }}>{error}</div>}
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[["Name", "name", "text", "Your name"], ["Email", "email", "email", "you@example.com"], ["Password", "password", "password", "••••••••"], ["Confirm Password", "confirm", "password", "••••••••"]].map(([label, field, type, ph]) => (
              <div key={field}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>
                <input className="input" type={type} placeholder={ph} value={(form as any)[field]} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} required disabled={field === "email" && !!inviteToken} />
              </div>
            ))}
            <button className="btn-primary" type="submit" disabled={loading} style={{ width: "100%", justifyContent: "center", marginTop: 4, background: acc }}>
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>
          <p style={{ textAlign: "center", fontSize: 13, color: "var(--muted)", marginTop: 18 }}>
            Already have an account? <Link href="/login" style={{ color: acc, fontWeight: 600, textDecoration: "none" }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return <Suspense fallback={<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}><div style={{ color: "var(--muted)" }}>Loading...</div></div>}><RegisterContent /></Suspense>;
}
