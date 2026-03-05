"use client";
import { useState, useEffect } from "react";
import { Subscription, CATEGORIES, CYCLES } from "@/types";

const MEMBERS = ["Me", "Partner", "Family", "Child 1", "Child 2"];
const PAYMENTS = ["Visa •••• 4242", "Mastercard •••• 8821", "PayPal", "Apple Pay"];

interface Props {
  sub?: Subscription | null;
  onSave: (data: Partial<Subscription>) => void;
  onClose: () => void;
}

const today = new Date().toISOString().split("T")[0];

export default function SubModal({ sub, onSave, onClose }: Props) {
  const [form, setForm] = useState<any>(sub || {
    name: "", amount: "", currency: "USD", cycle: "monthly", category: "Entertainment",
    icon: "", color: "#6366F1", next_date: today, member: "Me", notes: "", trial: false, payment_method: "Visa •••• 4242"
  });
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (form.name && !form.icon) {
      const domain = form.name.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "") + ".com";
      set("icon", `https://www.google.com/s2/favicons?sz=64&domain=${domain}`);
    }
  }, [form.name]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave({ ...form, amount: Number(form.amount) });
    setSaving(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border-color)", borderRadius: 16, padding: 24, width: 480, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>{sub ? "Edit Subscription" : "Add Subscription"}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4, display: "block" }}>Service Name *</label>
              <input className="input" placeholder="Netflix" value={form.name} onChange={e => set("name", e.target.value)} required />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4, display: "block" }}>Amount *</label>
              <input className="input" type="number" step="0.01" placeholder="9.99" value={form.amount} onChange={e => set("amount", e.target.value)} required min="0" />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4, display: "block" }}>Billing Cycle</label>
              <select className="select" style={{ width: "100%" }} value={form.cycle} onChange={e => set("cycle", e.target.value)}>
                {CYCLES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4, display: "block" }}>Currency</label>
              <select className="select" style={{ width: "100%" }} value={form.currency} onChange={e => set("currency", e.target.value)}>
                {["USD", "EUR", "GBP", "CAD", "AUD", "EGP"].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4, display: "block" }}>Category</label>
              <select className="select" style={{ width: "100%" }} value={form.category} onChange={e => set("category", e.target.value)}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4, display: "block" }}>Family Member</label>
              <select className="select" style={{ width: "100%" }} value={form.member} onChange={e => set("member", e.target.value)}>
                {MEMBERS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4, display: "block" }}>Next Renewal</label>
              <input className="input" type="date" value={form.next_date || today} onChange={e => set("next_date", e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4, display: "block" }}>Payment Method</label>
              <select className="select" style={{ width: "100%" }} value={form.payment_method} onChange={e => set("payment_method", e.target.value)}>
                {PAYMENTS.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4, display: "block" }}>Icon URL (auto-filled)</label>
            <input className="input" value={form.icon || ""} onChange={e => set("icon", e.target.value)} placeholder="https://..." />
          </div>

          <div>
            <label style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4, display: "block" }}>Notes</label>
            <input className="input" placeholder="Optional notes..." value={form.notes || ""} onChange={e => set("notes", e.target.value)} />
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}>
            <input type="checkbox" checked={!!form.trial} onChange={e => set("trial", e.target.checked)} style={{ accentColor: "#6366F1" }} />
            This is a free trial
          </label>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Saving..." : sub ? "Save Changes" : "Add Subscription"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
