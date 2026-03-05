"use client";
import { useState, useEffect } from "react";
import { useSubscriptions } from "@/lib/useSubscriptions";
import { useSettings } from "@/lib/SettingsContext";
import { toMonthly, fmt, daysUntil, Subscription } from "@/types";
import SubModal from "@/components/SubModal";

export default function SubscriptionsPage() {
  const { subs, loading, add, update, remove } = useSubscriptions();
  const { currencySymbol, convertToDisplay, categories } = useSettings();
  const [showModal, setShowModal] = useState(false);
  const [editSub, setEditSub] = useState<Subscription | null>(null);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("All");
  const [sortBy, setSortBy] = useState("name");
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/family-members").then(r => r.json()).then(d => setFamilyMembers(Array.isArray(d) ? d : []));
    fetch("/api/payment-methods").then(r => r.json()).then(d => setPaymentMethods(Array.isArray(d) ? d.map((m: any) => ({ ...m, is_default: !!m.is_default })) : []));
  }, []);

  const subSubs = subs.filter(s => s.type !== "bill");

  const filtered = subSubs.filter(s => {
    if (filterCat !== "All" && !s.category?.includes(filterCat) && s.category !== filterCat) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    const am = convertToDisplay(toMonthly(a.amount, a.cycle), a.currency);
    const bm = convertToDisplay(toMonthly(b.amount, b.cycle), b.currency);
    if (sortBy === "amount") return bm - am;
    if (sortBy === "date" && a.next_date && b.next_date) return new Date(a.next_date).getTime() - new Date(b.next_date).getTime();
    return a.name.localeCompare(b.name);
  });

  const active = filtered.filter(s => s.active);
  const monthly = active.reduce((a, s) => a + convertToDisplay(toMonthly(s.amount, s.cycle), s.currency), 0);
  const upcoming7 = active.filter(s => s.next_date && daysUntil(s.next_date) <= 7 && daysUntil(s.next_date) >= 0).length;

  const getCatInfo = (catName: string) => {
    return categories.find(c => c.name === catName || catName?.includes(c.name)) || { icon: "📦", color: "#94A3B8" };
  };

  if (loading) return <div style={{ color: "var(--muted)", padding: 24 }}>Loading...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="fade-in">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>My Subscriptions</h1>
          <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 2 }}>Manage and track all your recurring payments in one place</p>
        </div>
        <button className="btn-primary" onClick={() => { setEditSub(null); setShowModal(true); }}>+ Add Subscription</button>
      </div>

      {/* Quick stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { label: "Recurring Spend", value: `${currencySymbol}${fmt(monthly)}`, sub: `${active.length} active · monthlyized` },
          { label: "Yearly Total", value: `${currencySymbol}${fmt(monthly * 12)}`, sub: "Annualized" },
          { label: "Active", value: String(active.length), sub: `${subSubs.length} total` },
          { label: "Upcoming Renewals", value: String(upcoming7), sub: "Due in next 7 days" },
        ].map(({ label, value, sub }) => (
          <div key={label} className="card">
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 5 }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{value}</div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 200px" }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", fontSize: 13 }}>🔍</span>
          <input className="input" style={{ paddingLeft: 32, height: 36, fontSize: 13 }} placeholder="Search subscriptions..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="select" value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ height: 36, fontSize: 13 }}>
          <option value="All">All Categories</option>
          {categories.map(c => <option key={c.name} value={c.name}>{c.icon} {c.name}</option>)}
        </select>
        <select className="select" value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ height: 36, fontSize: 13 }}>
          <option value="name">Sort: Name</option>
          <option value="amount">Sort: Amount</option>
          <option value="date">Sort: Next Billing</option>
        </select>
        <span style={{ fontSize: 13, color: "var(--muted)" }}>{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {/* Table header */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 80px", gap: 0, padding: "10px 16px", borderBottom: "1px solid var(--border-color)", background: "var(--surface2)" }}>
          {["Service", "Category", "Payment", "Amount", "Next Billing", "Status", ""].map(h => (
            <div key={h} style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</div>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>No subscriptions found</div>
            <button className="btn-primary" onClick={() => setShowModal(true)} style={{ marginTop: 8 }}>Add Subscription</button>
          </div>
        ) : filtered.map((s, i) => {
          const mo = convertToDisplay(toMonthly(s.amount, s.cycle), s.currency);
          const days = s.next_date ? daysUntil(s.next_date) : null;
          const overdue = days !== null && days < 0;
          const soon = days !== null && days >= 0 && days <= 3;
          const catInfo = getCatInfo(s.category);
          const catName = s.category?.replace(/^[^\s]+ /, '') || s.category || "Other";
          return (
            <div key={s.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 80px", gap: 0, padding: "11px 16px", borderBottom: i < filtered.length - 1 ? "1px solid var(--border-color)" : "none", alignItems: "center", transition: "background 0.12s", opacity: s.active ? 1 : 0.55 }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--surface2)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              
              {/* Service */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                  {s.icon ? <img src={s.icon} width={26} height={26} style={{ objectFit: "contain" }} alt={s.name} onError={e => (e.currentTarget.style.display="none")} /> : <span style={{ fontSize: 14 }}>📦</span>}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
                  {s.trial && <span className="badge" style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444", fontSize: 10 }}>Trial</span>}
                  {s.member_name && <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 1 }}>{s.member_name}</div>}
                </div>
              </div>

              {/* Category */}
              <div>
                <span className="badge" style={{ background: catInfo.color + "15", color: catInfo.color, fontSize: 11 }}>{catInfo.icon} {catName}</span>
              </div>

              {/* Payment */}
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                {s.payment_method_label ? <span>{s.payment_method_label}</span> : <span style={{ opacity: 0.4 }}>—</span>}
              </div>

              {/* Amount */}
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{currencySymbol}{fmt(mo)}<span style={{ fontWeight: 400, color: "var(--muted)", fontSize: 11 }}>/mo</span></div>
                {s.cycle !== "monthly" && <div style={{ fontSize: 11, color: "var(--muted)" }}>{currencySymbol}{fmt(convertToDisplay(s.amount, s.currency))} {s.cycle}</div>}
              </div>

              {/* Next billing */}
              <div style={{ fontSize: 12 }}>
                {s.next_date ? (
                  <div>
                    <div style={{ color: overdue ? "#EF4444" : soon ? "#F59E0B" : "var(--text)", fontWeight: overdue || soon ? 600 : 400 }}>
                      {overdue ? "Overdue" : days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days}d`}
                    </div>
                    <div style={{ color: "var(--muted)", fontSize: 11 }}>{s.next_date}</div>
                  </div>
                ) : <span style={{ color: "var(--muted)", opacity: 0.4 }}>—</span>}
              </div>

              {/* Status */}
              <div>
                <div onClick={() => update(s.id, { active: !s.active })} style={{ width: 34, height: 19, borderRadius: 10, background: s.active ? "var(--accent)" : "var(--border-color)", cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
                  <div style={{ position: "absolute", top: 2, left: s.active ? 17 : 2, width: 15, height: 15, borderRadius: 8, background: "white", transition: "left 0.2s" }} />
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 2 }}>
                <button style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 14, padding: "4px 5px", borderRadius: 5 }} onClick={() => { setEditSub(s); setShowModal(true); }}>✏️</button>
                <button style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: 14, padding: "4px 5px", borderRadius: 5 }} onClick={() => { if (confirm(`Delete ${s.name}?`)) remove(s.id); }}>🗑️</button>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <SubModal
          sub={editSub}
          defaultType="subscription"
          familyMembers={familyMembers}
          paymentMethods={paymentMethods}
          onSave={async (data) => { editSub ? await update(editSub.id, data) : await add(data); setShowModal(false); setEditSub(null); }}
          onClose={() => { setShowModal(false); setEditSub(null); }}
        />
      )}
    </div>
  );
}
