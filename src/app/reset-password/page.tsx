"use client";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function ResetForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState({ type: "", msg: "" });
  const [loading, setLoading] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setStatus({ type: "error", msg: "Password must be at least 8 characters." });
      return;
    }
    
    setLoading(true);
    setStatus({ type: "", msg: "" });

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        setStatus({ type: "success", msg: "Password updated! Redirecting to login..." });
        setTimeout(() => router.push("/login"), 2000);
      } else {
        const data = await res.json();
        setStatus({ type: "error", msg: data.error || "Reset failed. Link may be expired." });
      }
    } catch (err) {
      setStatus({ type: "error", msg: "A network error occurred." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 450, margin: "120px auto", padding: "40px", background: "#1A1D27", borderRadius: 16, border: "1px solid #2A2D3A", boxShadow: "0 20px 50px rgba(0,0,0,0.3)", color: "white", fontFamily: "sans-serif" }}>
      <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, textAlign: "center" }}>Reset Password 🔐</h2>
      <p style={{ fontSize: 14, color: "#9ca3af", marginBottom: 32, textAlign: "center" }}>Enter your new password below to regain access.</p>
      
      <form onSubmit={handleReset} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#9ca3af", marginBottom: 8, display: "block", textTransform: "uppercase" }}>New Password</label>
          <input 
            type="password" 
            placeholder="••••••••" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            required 
            style={{ width: "100%", padding: "12px 16px", borderRadius: 8, background: "#0F1117", border: "1px solid #2A2D3A", color: "white", fontSize: 16, outline: "none" }}
            autoFocus
          />
        </div>
        
        <button 
          type="submit" 
          disabled={loading}
          style={{ width: "100%", padding: "14px", borderRadius: 8, background: "#6366F1", color: "white", border: "none", fontSize: 16, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, transition: "all 0.2s" }}
        >
          {loading ? "Updating..." : "Update Password"}
        </button>
      </form>

      {status.msg && (
        <div style={{ 
          marginTop: 24, 
          padding: 14, 
          borderRadius: 8, 
          fontSize: 14,
          textAlign: "center",
          background: status.type === "success" ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
          color: status.type === "success" ? "#10B981" : "#EF4444",
          border: `1px solid ${status.type === "success" ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)"}`
        }}>
          {status.msg}
        </div>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#0F1117", overflow: "hidden" }}>
      <Suspense fallback={<div style={{ color: "white", textAlign: "center", marginTop: 100 }}>Loading...</div>}>
        <ResetForm />
      </Suspense>
    </div>
  );
}