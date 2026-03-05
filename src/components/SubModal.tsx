"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Subscription, CYCLES, CURRENCIES } from "@/types";
import { useSettings } from "@/lib/SettingsContext";

const today = new Date().toISOString().split("T")[0];

const POPULAR_SERVICES = [
  { name: "Netflix", icon: "https://logo.clearbit.com/netflix.com", category: "Entertainment" },
  { name: "Spotify", icon: "https://logo.clearbit.com/spotify.com", category: "Music" },
  { name: "Apple Music", icon: "https://logo.clearbit.com/apple.com", category: "Music" },
  { name: "YouTube Premium", icon: "https://logo.clearbit.com/youtube.com", category: "Entertainment" },
  { name: "Disney+", icon: "https://logo.clearbit.com/disneyplus.com", category: "Entertainment" },
  { name: "Amazon Prime", icon: "https://logo.clearbit.com/amazon.com", category: "Entertainment" },
  { name: "Hulu", icon: "https://logo.clearbit.com/hulu.com", category: "Entertainment" },
  { name: "HBO Max", icon: "https://logo.clearbit.com/max.com", category: "Entertainment" },
  { name: "Adobe CC", icon: "https://logo.clearbit.com/adobe.com", category: "Software" },
  { name: "Microsoft 365", icon: "https://logo.clearbit.com/microsoft.com", category: "Productivity" },
  { name: "Google One", icon: "https://logo.clearbit.com/google.com", category: "Cloud Storage" },
  { name: "iCloud+", icon: "https://logo.clearbit.com/apple.com", category: "Cloud Storage" },
  { name: "Dropbox", icon: "https://logo.clearbit.com/dropbox.com", category: "Cloud Storage" },
  { name: "Slack", icon: "https://logo.clearbit.com/slack.com", category: "Productivity" },
  { name: "GitHub", icon: "https://logo.clearbit.com/github.com", category: "Developer Tools" },
  { name: "Notion", icon: "https://logo.clearbit.com/notion.so", category: "Productivity" },
  { name: "Figma", icon: "https://logo.clearbit.com/figma.com", category: "Software" },
  { name: "Linear", icon: "https://logo.clearbit.com/linear.app", category: "Productivity" },
  { name: "Vercel", icon: "https://logo.clearbit.com/vercel.com", category: "Developer Tools" },
  { name: "AWS", icon: "https://logo.clearbit.com/aws.amazon.com", category: "Developer Tools" },
  { name: "Gym", icon: "https://logo.clearbit.com/gymshark.com", category: "Health" },
  { name: "Headspace", icon: "https://logo.clearbit.com/headspace.com", category: "Health" },
  { name: "NYT", icon: "https://logo.clearbit.com/nytimes.com", category: "News" },
  { name: "Duolingo", icon: "https://logo.clearbit.com/duolingo.com", category: "Education" },
  { name: "ChatGPT Plus", icon: "https://logo.clearbit.com/openai.com", category: "Software" },
];

const STEPS = [
  { id: "service", label: "Service" },
  { id: "pricing", label: "Pricing" },
  { id: "schedule", label: "Schedule" },
  { id: "details", label: "Details", optional: true },
  { id: "reminders", label: "Reminders", optional: true },
];

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
  const isEditing = !!sub;

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [quickSearch, setQuickSearch] = useState("");
  const [iconMode, setIconMode] = useState<"upload" | "website" | "url">("website");
  const [iconLoading, setIconLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const nameTimeout = useRef<any>(null);

  const [form, setForm] = useState<any>(() => sub ? {
    ...sub, trial: !!sub.trial, active: sub.active !== false,
    remind_days: sub.notes?.match(/remind:(\d+)d/)?.[1] || "",
  } : {
    type: defaultType, name: "", amount: "", currency: settings.currency,
    cycle: "monthly", category: defaultType === "bill" ? "Utilities" : "Entertainment",
    icon: "", website: "", next_date: today,
    member_id: null, notes: "", trial: false, active: true, payment_method_id: null,
    remind_days: "",
  });

  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  // Auto-fetch icon from name
  const fetchIcon = useCallback((name: string) => {
    if (!name || iconMode !== "website") return;
    clearTimeout(nameTimeout.current);
    nameTimeout.current = setTimeout(async () => {
      setIconLoading(true);
      const clean = name.toLowerCase().replace(/[^a-z0-9]/g, "");
      const domain = form.website
        ? new URL(form.website.startsWith("http") ? form.website : "https://" + form.website).hostname.replace("www.", "")
        : `${clean}.com`;
      const url = `https://logo.clearbit.com/${domain}`;
      const img = new Image();
      img.onload = () => { set("icon", url); setIconLoading(false); };
      img.onerror = () => {
        set("icon", `https://www.google.com/s2/favicons?sz=128&domain=${domain}`);
        setIconLoading(false);
      };
      img.src = url;
    }, 700);
  }, [iconMode, form.website]);

  useEffect(() => { if (form.name) fetchIcon(form.name); return () => clearTimeout(nameTimeout.current); }, [form.name, form.website]);

  const selectPopular = (svc: typeof POPULAR_SERVICES[0]) => {
    setForm((p: any) => ({ ...p, name: svc.name, icon: svc.icon, category: svc.category }));
    setQuickSearch("");
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = e => set("icon", e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const filteredPopular = POPULAR_SERVICES.filter(s =>
    !quickSearch || s.name.toLowerCase().includes(quickSearch.toLowerCase())
  ).slice(0, quickSearch ? 12 : 8);

  const canGoNext = () => {
    if (step === 0) return !!form.name && !!form.category;
    if (step === 1) return !!form.amount && Number(form.amount) > 0;
    if (step === 2) return true;
    return true;
  };

  const handleSubmit = async () => {
    setSaving(true);
    const data: any = { ...form, amount: Number(form.amount) };
    delete data.website; delete data.remind_days;
    await onSave(data);
    setSaving(false);
  };

  // --- STEP CONTENT ---

  const StepService = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Type toggle */}
      <div>
        <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>Type</div>
        <div style={{ display: "flex", gap: 6 }}>
          {(["subscription", "bill"] as const).map(t => (
            <button key={t} type="button" onClick={() => set("type", t)} style={{ flex: 1, padding: "9px", borderRadius: 8, border: `1.5px solid ${form.type === t ? "var(--accent)" : "var(--border-color)"}`, background: form.type === t ? "rgba(var(--accent-rgb),0.08)" : "var(--surface2)", color: form.type === t ? "var(--accent)" : "var(--muted)", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all 0.15s" }}>
              {t === "subscription" ? "📋" : "🧾"} {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Quick select */}
      {form.type === "subscription" && (
        <div>
          <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>Quick Select</div>
          <div style={{ position: "relative", marginBottom: 10 }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14 }}>✨</span>
            <input
              className="input"
              style={{ paddingLeft: 36, paddingRight: 36 }}
              placeholder="Pick a popular service..."
              value={quickSearch}
              onChange={e => setQuickSearch(e.target.value)}
            />
            {quickSearch && <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", cursor: "pointer", color: "var(--muted)", fontSize: 13 }} onClick={() => setQuickSearch("")}>✕</span>}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
            {filteredPopular.map(svc => (
              <button key={svc.name} type="button" onClick={() => selectPopular(svc)} style={{ padding: "8px 6px", borderRadius: 8, border: `1.5px solid ${form.name === svc.name ? "var(--accent)" : "var(--border-color)"}`, background: form.name === svc.name ? "rgba(var(--accent-rgb),0.08)" : "var(--surface2)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, transition: "all 0.15s" }}
                onMouseEnter={e => { if (form.name !== svc.name) (e.currentTarget as HTMLElement).style.borderColor = "var(--muted)"; }}
                onMouseLeave={e => { if (form.name !== svc.name) (e.currentTarget as HTMLElement).style.borderColor = "var(--border-color)"; }}>
                <img src={svc.icon} width={24} height={24} style={{ borderRadius: 5, objectFit: "contain" }} alt={svc.name} onError={e => { (e.currentTarget as HTMLImageElement).src = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><text y='18' font-size='18'>📦</text></svg>"; }} />
                <span style={{ fontSize: 10, color: "var(--muted)", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>{svc.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Service name + category */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label className="form-label">Service Name *</label>
          <input className="input" placeholder={form.type === "bill" ? "e.g. Electricity" : "e.g. Netflix, Spotify"} value={form.name} onChange={e => set("name", e.target.value)} required autoFocus={!form.name} />
        </div>
        <div>
          <label className="form-label">Category *</label>
          <select className="select" style={{ width: "100%" }} value={form.category} onChange={e => set("category", e.target.value)}>
            {categories.map(c => <option key={c.name} value={c.name}>{c.icon} {c.name}</option>)}
          </select>
        </div>
      </div>

      {/* Website URL */}
      <div>
        <label className="form-label">Website URL</label>
        <input className="input" placeholder="https://example.com" value={form.website || ""} onChange={e => set("website", e.target.value)} type="url" />
        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>Official website of the service — used to fetch the logo automatically</div>
      </div>

      {/* Logo */}
      <div>
        <label className="form-label">Logo</label>
        <div style={{ display: "flex", borderRadius: 8, border: "1px solid var(--border-color)", overflow: "hidden", marginBottom: 10 }}>
          {(["upload", "website", "url"] as const).map((m, i) => (
            <button key={m} type="button" onClick={() => setIconMode(m)} style={{ flex: 1, padding: "9px", background: iconMode === m ? "var(--surface)" : "var(--surface2)", border: "none", borderRight: i < 2 ? "1px solid var(--border-color)" : "none", color: iconMode === m ? "var(--text)" : "var(--muted)", fontSize: 12, fontWeight: iconMode === m ? 600 : 400, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, transition: "all 0.15s" }}>
              {m === "upload" ? "⬆ Upload" : m === "website" ? "🌐 Website" : "🔗 URL"}
            </button>
          ))}
        </div>

        {iconMode === "upload" && (
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            style={{ border: `2px dashed ${dragOver ? "var(--accent)" : "var(--border-color)"}`, borderRadius: 10, padding: "28px 20px", textAlign: "center", cursor: "pointer", background: dragOver ? "rgba(var(--accent-rgb),0.04)" : "transparent", transition: "all 0.15s" }}>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            {form.icon && form.icon.startsWith("data:") ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <img src={form.icon} style={{ width: 52, height: 52, objectFit: "contain", borderRadius: 10 }} alt="preview" />
                <span style={{ fontSize: 12, color: "var(--muted)" }}>Click to change</span>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.5 }}>⬆</div>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3 }}>Click to upload or drag and drop</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>PNG, JPG, SVG up to 5MB</div>
              </>
            )}
          </div>
        )}

        {iconMode === "website" && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: "var(--surface2)", border: "1px solid var(--border-color)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
              {iconLoading
                ? <div style={{ width: 18, height: 18, border: "2px solid var(--accent)", borderTopColor: "transparent", borderRadius: "50%" }} className="spin" />
                : form.icon
                  ? <img src={form.icon} width={34} height={34} style={{ objectFit: "contain" }} alt="" onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                  : <span style={{ fontSize: 20, opacity: 0.3 }}>🌐</span>}
            </div>
            <div style={{ flex: 1, fontSize: 13, color: "var(--muted)" }}>
              {form.icon && !iconLoading
                ? <span style={{ color: "#10B981", fontSize: 12 }}>✓ Logo fetched automatically from the website</span>
                : form.name
                  ? <span>Fetching logo for <strong style={{ color: "var(--text)" }}>{form.name}</strong>...</span>
                  : "Enter a service name above to auto-fetch the logo"}
              {form.icon && !iconLoading && <button type="button" onClick={() => set("icon", "")} style={{ display: "block", marginTop: 4, fontSize: 11, background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 0 }}>× Clear logo</button>}
            </div>
          </div>
        )}

        {iconMode === "url" && (
          <input className="input" placeholder="https://example.com/logo.png" value={form.icon || ""} onChange={e => set("icon", e.target.value)} />
        )}
      </div>
    </div>
  );

  const StepPricing = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label className="form-label">Amount *</label>
          <div style={{ position: "relative" }}>
            <input className="input" type="number" step="0.01" min="0" placeholder="0.00" value={form.amount} onChange={e => set("amount", e.target.value)} required style={{ paddingLeft: 32 }} />
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", fontSize: 13, pointerEvents: "none" }}>
              {CURRENCIES.find(c => c.code === form.currency)?.code.slice(0, 1) || "$"}
            </span>
          </div>
        </div>
        <div>
          <label className="form-label">Currency</label>
          <select className="select" style={{ width: "100%" }} value={form.currency} onChange={e => set("currency", e.target.value)}>
            {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code} — {c.name}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="form-label">Billing Cycle</label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
          {CYCLES.map(c => (
            <button key={c} type="button" onClick={() => set("cycle", c)} style={{ padding: "9px 6px", borderRadius: 8, border: `1.5px solid ${form.cycle === c ? "var(--accent)" : "var(--border-color)"}`, background: form.cycle === c ? "rgba(var(--accent-rgb),0.08)" : "var(--surface2)", color: form.cycle === c ? "var(--accent)" : "var(--muted)", fontSize: 12, fontWeight: 500, cursor: "pointer", textAlign: "center", transition: "all 0.15s" }}>
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      {form.amount && Number(form.amount) > 0 && (
        <div style={{ padding: "14px 16px", background: "rgba(var(--accent-rgb),0.06)", border: "1px solid rgba(var(--accent-rgb),0.15)", borderRadius: 10 }}>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6, fontWeight: 600 }}>Cost Preview</div>
          <div style={{ display: "flex", gap: 20 }}>
            {[
              ["Monthly", form.cycle === "monthly" ? form.amount : form.cycle === "yearly" ? (form.amount / 12).toFixed(2) : form.cycle === "weekly" ? (form.amount * 4.33).toFixed(2) : form.cycle === "quarterly" ? (form.amount / 3).toFixed(2) : form.amount],
              ["Yearly", form.cycle === "yearly" ? form.amount : form.cycle === "monthly" ? (form.amount * 12).toFixed(2) : form.cycle === "weekly" ? (form.amount * 52).toFixed(2) : form.cycle === "quarterly" ? (form.amount * 4).toFixed(2) : form.amount],
            ].map(([label, val]) => (
              <div key={label}>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>{label}</div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{CURRENCIES.find(c => c.code === form.currency)?.code} {Number(val).toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {form.type === "subscription" && (
        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "12px 14px", borderRadius: 8, border: "1px solid var(--border-color)", transition: "border-color 0.15s" }}>
          <input type="checkbox" checked={!!form.trial} onChange={e => set("trial", e.target.checked)} style={{ accentColor: "var(--accent)", width: 15, height: 15, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>This is a free trial</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>Will be flagged as trial and remind you before it ends</div>
          </div>
        </label>
      )}
    </div>
  );

  const StepSchedule = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <label className="form-label">Next {form.type === "bill" ? "Due Date" : "Renewal Date"}</label>
        <input className="input" type="date" value={form.next_date || today} onChange={e => set("next_date", e.target.value)} />
        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>When is the next payment due?</div>
      </div>

      <div>
        <label className="form-label">Payment Method</label>
        <select className="select" style={{ width: "100%" }} value={form.payment_method_id || ""} onChange={e => set("payment_method_id", e.target.value ? Number(e.target.value) : null)}>
          <option value="">None / Not set</option>
          {paymentMethods.map((p: any) => <option key={p.id} value={p.id}>{p.label}{p.last4 ? ` •••• ${p.last4}` : ""}</option>)}
        </select>
        {paymentMethods.length === 0 && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>Add payment methods in the Payment Methods section</div>}
      </div>

      <div>
        <label className="form-label">Assigned Family Member</label>
        <select className="select" style={{ width: "100%" }} value={form.member_id || ""} onChange={e => set("member_id", e.target.value ? Number(e.target.value) : null)}>
          <option value="">None</option>
          {familyMembers.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>

      <div>
        <label className="form-label">Status</label>
        <div style={{ display: "flex", gap: 8 }}>
          {[["true","Active"],["false","Paused"]].map(([v, l]) => (
            <button key={v} type="button" onClick={() => set("active", v === "true")} style={{ flex: 1, padding: "9px", borderRadius: 8, border: `1.5px solid ${String(form.active) === v ? "var(--accent)" : "var(--border-color)"}`, background: String(form.active) === v ? "rgba(var(--accent-rgb),0.08)" : "var(--surface2)", color: String(form.active) === v ? "var(--accent)" : "var(--muted)", fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "all 0.15s" }}>{l}</button>
          ))}
        </div>
      </div>
    </div>
  );

  const StepDetails = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <label className="form-label">Notes</label>
        <textarea className="input" placeholder="Account details, login info, or any notes..." value={form.notes || ""} onChange={e => set("notes", e.target.value)} style={{ resize: "vertical", minHeight: 88 }} />
      </div>
      <div style={{ padding: "14px 16px", background: "var(--surface2)", borderRadius: 10 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>Summary</div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {form.icon && <img src={form.icon} width={36} height={36} style={{ borderRadius: 8, objectFit: "contain" }} alt="" onError={e => (e.currentTarget.style.display = "none")} />}
          <div>
            <div style={{ fontWeight: 600 }}>{form.name || "—"}</div>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>{form.category} · {form.cycle} · {form.currency} {form.amount || "0"}</div>
          </div>
        </div>
      </div>
    </div>
  );

  const StepReminders = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ fontSize: 13, color: "var(--muted)" }}>Set reminder notifications specific to this subscription. Global reminders can be changed in Settings.</div>
      {[["1","1 day before renewal"],["3","3 days before renewal"],["7","7 days before renewal"],["14","14 days before renewal"]].map(([days, label]) => (
        <label key={days} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 8, border: `1px solid ${form[`remind_${days}d`] ? "var(--accent)" : "var(--border-color)"}`, cursor: "pointer", transition: "border-color 0.15s" }}>
          <input type="checkbox" checked={!!form[`remind_${days}d`]} onChange={e => set(`remind_${days}d`, e.target.checked)} style={{ accentColor: "var(--accent)", width: 15, height: 15, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{label}</div>
          </div>
        </label>
      ))}
    </div>
  );

  const stepComponents = [<StepService key="s"/>, <StepPricing key="p"/>, <StepSchedule key="sc"/>, <StepDetails key="d"/>, <StepReminders key="r"/>];
  const currentStep = STEPS[step];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "var(--surface)", borderRadius: 16, width: "100%", maxWidth: 680, maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden", border: "1px solid var(--border-color)" }}>
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--border-color)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 2 }}>{isEditing ? `Edit ${form.type === "bill" ? "Bill" : "Subscription"}` : `Add New ${form.type === "bill" ? "Bill" : "Subscription"}`}</h2>
              <p style={{ fontSize: 13, color: "var(--muted)" }}>
                {isEditing ? "Update your subscription details" : `Add a new ${form.type} to track your recurring payments`}
              </p>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "1px solid var(--border-color)", width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--muted)", fontSize: 16, flexShrink: 0, marginLeft: 12 }}>✕</button>
          </div>
        </div>

        {/* Body: sidebar + content */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Step sidebar */}
          <div style={{ width: 160, borderRight: "1px solid var(--border-color)", padding: "16px 10px", display: "flex", flexDirection: "column", gap: 2, flexShrink: 0, background: "var(--surface)" }}>
            {STEPS.map((s, i) => {
              const active = i === step;
              const done = i < step;
              return (
                <button key={s.id} type="button" onClick={() => (done || i === step) && setStep(i)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 10px", borderRadius: 7, border: "none", background: active ? "rgba(var(--accent-rgb),0.1)" : "transparent", color: active ? "var(--accent)" : done ? "var(--text)" : "var(--muted)", cursor: done ? "pointer" : "default", textAlign: "left", width: "100%", transition: "all 0.15s" }}>
                  <div style={{ width: 20, height: 20, borderRadius: 99, background: active ? "var(--accent)" : done ? "#10B981" : "var(--surface2)", border: `1.5px solid ${active ? "var(--accent)" : done ? "#10B981" : "var(--border-color)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: active || done ? "white" : "var(--muted)", fontWeight: 700, flexShrink: 0 }}>
                    {done ? "✓" : i + 1}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: active ? 700 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.label}</div>
                    {s.optional && <div style={{ fontSize: 10, opacity: 0.6 }}>Optional</div>}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Step content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
            {stepComponents[step]}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, background: "var(--surface)" }}>
          <button type="button" className="btn-ghost" onClick={step === 0 ? onClose : () => setStep(s => s - 1)}>
            {step === 0 ? "Cancel" : "← Back"}
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Dot indicators */}
            <div style={{ display: "flex", gap: 4 }}>
              {STEPS.map((_, i) => (
                <div key={i} style={{ width: i === step ? 16 : 6, height: 6, borderRadius: 3, background: i === step ? "var(--accent)" : i < step ? "#10B981" : "var(--border-color)", transition: "all 0.2s" }} />
              ))}
            </div>
            {step < STEPS.length - 1 ? (
              <button className="btn-primary" onClick={() => setStep(s => s + 1)} disabled={!canGoNext()}>
                Continue →
              </button>
            ) : (
              <button className="btn-primary" onClick={handleSubmit} disabled={saving || !form.name || !form.amount}>
                {saving ? "Saving..." : isEditing ? "Save Changes" : `Add ${form.type === "bill" ? "Bill" : "Subscription"}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
