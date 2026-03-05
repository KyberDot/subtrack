"use client";
import { useState, useEffect, useRef } from "react";
import { Subscription, CYCLES } from "@/types";
import { useSettings } from "@/lib/SettingsContext";

const today = new Date().toISOString().split("T")[0];

interface Props {
  sub?: Subscription | null;
  defaultType?: "subscription" | "bill";
  onSave: (data: Partial<Subscription>) => void;
  onClose: () => void;
  familyMembers?: any[];
  paymentMethods?: any[];
}

export default function SubModal({ sub, defaultType = "subscription", onSave, onClose, familyMembers = [], paymentMethods = [] }: Props) {
  const { settings, categories } = useSettings();
  const [form, setForm] = useState<any>(sub ? { ...sub, trial: !!sub.trial, active: sub.active !== false } : {
    type: defaultType, name: "", amount: "", currency: settings.currency, cycle: "monthly",
    category: defaultType === "bill" ? "Utilities" : "Entertainment",
    icon: "", next_date: today, member_id: null, notes: "", trial: false, active: true, payment_method_id: null
  });
  const [saving, setSaving] = useState(false);
  const [iconMode, setIconMode] = useState<"auto" | "url" | "upload">("auto");
  const [iconLoading, setIconLoading] = useState(false);
  const [iconError, setIconError] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const nameTimeout = useRef<any>(null);

  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  // Auto-fetch icon when name changes
  useEffect(() => {
    if (!form.name || iconMode !== "auto") return;
    clearTimeout(nameTimeout.current);
    nameTimeout.current = setTimeout(async () => {
      setIconLoading(true); setIconError(false);
      try {
        const res = await fetch(`/api/icon-search?name=${encodeURIComponent(form.name)}`);
        const data = await res.json();
        // Try clearbit first, fall back to google favicons
        const img = new Image();
        img.onload = () => { set("icon", data.primary); setIconLoading(false); };
        img.onerror = () => {
          const fallback = data.urls[1];
          set("icon", fallback); setIconLoading(false);
        };
        img.src = data.primary;
      } catch { setIconLoading(false); }
    }, 800);
    return () => clearTimeout(nameTimeout.current);
  }, [form.name, iconMode]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => set("icon", ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    await onSave({ ...form, amount: Number(form.amount) });
    setSaving(false);
  };

  const catOptions = categories;
  const isBill = form.type === "bill";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Type toggle */}
            <div style={{ display: "flex", background: "var(--surface2)", borderRadius: 8, padding: 3, gap: 2 }}>
              {(["subscription", "bill"] as const).map(t => (
                <button key={t} type="button" onClick={() => set("type", t)} style={{ padding: "4px 12px", borderRadius: 6, border: "none", background: form.type === t ? "var(--accent)" : "transparent", color: form.type === t ? "white" : "var(--muted)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  {t === "subscription" ? "📋 Subscription" : "🧾 Bill"}
                </button>
              ))}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 18, cursor: "pointer", lineHeight: 1, padding: 4 }}>✕</button>
        </div>

        <form onSubmit={submit} style={{ display: "contents" }}>
          <div className="modal-body">
            {/* Icon */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 52, height: 52, borderRadius: 12, background: "var(--surface2)", border: "1px solid var(--border-color)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0, position: "relative" }}>
                {iconLoading
                  ? <div style={{ width: 20, height: 20, border: "2px solid var(--accent)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  : form.icon
                    ? <img src={form.icon} width={40} height={40} style={{ objectFit: "contain" }} alt="icon" onError={() => { setIconError(true); set("icon", ""); }} />
                    : <span style={{ fontSize: 22 }}>{isBill ? "🧾" : "📦"}</span>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
                  {(["auto", "url", "upload"] as const).map(m => (
                    <button key={m} type="button" onClick={() => setIconMode(m)} style={{ padding: "3px 8px", borderRadius: 5, border: `1px solid ${iconMode === m ? "var(--accent)" : "var(--border-color)"}`, background: iconMode === m ? "rgba(var(--accent-rgb),0.12)" : "transparent", color: iconMode === m ? "var(--accent)" : "var(--muted)", fontSize: 11, cursor: "pointer", fontWeight: 500 }}>
                      {m === "auto" ? "✨ Auto" : m === "url" ? "🔗 URL" : "📁 Upload"}
                    </button>
                  ))}
                </div>
                {iconMode === "auto" && <div style={{ fontSize: 11, color: "var(--muted)" }}>{form.icon ? "Icon found automatically" : "Icon will be fetched when you type a name"}</div>}
                {iconMode === "url" && <input className="input" placeholder="https://example.com/icon.png" value={form.icon || ""} onChange={e => set("icon", e.target.value)} style={{ fontSize: 12, padding: "6px 10px" }} />}
                {iconMode === "upload" && <div>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileUpload} />
                  <button type="button" className="btn-ghost" style={{ fontSize: 12, padding: "5px 10px" }} onClick={() => fileRef.current?.click()}>Choose image</button>
                </div>}
              </div>
            </div>

            {/* Name + Amount */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4, display: "block", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Name *</label>
                <input className="input" placeholder={isBill ? "Electricity" : "Netflix"} value={form.name} onChange={e => set("name", e.target.value)} required />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4, display: "block", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Amount *</label>
                <input className="input" type="number" step="0.01" placeholder="9.99" value={form.amount} onChange={e => set("amount", e.target.value)} required min="0" />
              </div>
            </div>

            {/* Cycle + Currency */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4, display: "block", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Cycle</label>
                <select className="select" style={{ width: "100%" }} value={form.cycle} onChange={e => set("cycle", e.target.value)}>
                  {CYCLES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4, display: "block", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Currency</label>
                <select className="select" style={{ width: "100%" }} value={form.currency} onChange={e => set("currency", e.target.value)}>
                  {["USD","EUR","GBP","CAD","AUD","EGP","JPY","INR"].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Category + Next date */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4, display: "block", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Category</label>
                <select className="select" style={{ width: "100%" }} value={form.category} onChange={e => set("category", e.target.value)}>
                  {catOptions.map(c => <option key={c.name}>{c.icon} {c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4, display: "block", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Next {isBill ? "Due" : "Renewal"}</label>
                <input className="input" type="date" value={form.next_date || today} onChange={e => set("next_date", e.target.value)} />
              </div>
            </div>

            {/* Member + Payment */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4, display: "block", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Family Member</label>
                <select className="select" style={{ width: "100%" }} value={form.member_id || ""} onChange={e => set("member_id", e.target.value ? Number(e.target.value) : null)}>
                  <option value="">None</option>
                  {familyMembers.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4, display: "block", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Payment Method</label>
                <select className="select" style={{ width: "100%" }} value={form.payment_method_id || ""} onChange={e => set("payment_method_id", e.target.value ? Number(e.target.value) : null)}>
                  <option value="">None</option>
                  {paymentMethods.map((p: any) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4, display: "block", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Notes</label>
              <input className="input" placeholder="Optional notes..." value={form.notes || ""} onChange={e => set("notes", e.target.value)} />
            </div>

            {!isBill && (
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                <input type="checkbox" checked={!!form.trial} onChange={e => set("trial", e.target.checked)} style={{ accentColor: "var(--accent)", width: 14, height: 14 }} />
                This is a free trial
              </label>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Saving..." : sub ? "Save Changes" : `Add ${isBill ? "Bill" : "Subscription"}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
