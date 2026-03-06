"use client";
import { useSettings } from "@/lib/SettingsContext";
import { useSubscriptions } from "@/lib/useSubscriptions";
import { toMonthly, fmt, daysUntil, Subscription } from "@/types";
import { useState, useEffect, useMemo } from "react";
import SubModal from "@/components/SubModal";
import AttachmentsPanel from "@/components/AttachmentsPanel";
import { useSearch } from "@/app/(dashboard)/layout";

export default function BillsPage() {
  const { currencySymbol, convertToDisplay } = useSettings();
  const { subs, loading, add, update, remove } = useSubscriptions();
  const { search } = useSearch();
  const [showModal, setShowModal] = useState(false);
  const [editBill, setEditBill] = useState<Subscription | null>(null);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState("name");

  useEffect(() => {
    Promise.all([
      fetch("/api/family-members").then(r => r.json()),
      fetch("/api/payment-methods").then(r => r.json()),
    ]).then(([fm, pm]) => {
      setFamilyMembers(Array.isArray(fm) ? fm : []);
      setPaymentMethods(Array.isArray(pm) ? pm.map((m: any) => ({ ...m, is_default: !!m.is_default })) : []);
    });
  }, []);

  const bills = useMemo(() => {
    return subs
      .filter(s => s.type === "bill")
      .filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.category?.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        const am = convertToDisplay(toMonthly(a.amount, a.cycle), a.currency);
        const bm = convertToDisplay(toMonthly(b.amount, b.cycle), b.currency);
        if (sortBy === "amount") return bm - am;
        if (sortBy === "date" && a.next_date && b.next_date) return new Date(a.next_date).getTime() - new Date(b.next_date).getTime();
        return a.name.localeCompare(b.name);
      });
  }, [subs, search, sortBy]);

  const active = bills.filter(b => b.active);
  const monthly = active.reduce((a, b) => a + convertToDisplay(toMonthly(b.amount, b.cycle), b.currency), 0);
  const overdue = active.filter(b => b.next_date && daysUntil(b.next_date) < 0).length;
  const dueSoon = active.filter(b => b.next_date && daysUntil(b.next_date) >= 0 && daysUntil(b.next_date) <= 3).length;

  if (loading && bills.length === 0) return <div style={{ color: "var(--muted)", padding: 24 }}>Loading...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="fade-in">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>My Bills</h1>
          <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 2 }}>Track all your recurring bills and due dates</p>
        </div>
        <button className="btn-primary" onClick={() => { setEditBill(null); setShowModal(true); }}>+ Add Bill</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[["Monthly Total", `${currencySymbol}${fmt(monthly)}`, `${active.length} active`],["Yearly", `${currencySymbol}${fmt(monthly * 12)}`, "Annualized"],["Overdue", String(overdue), overdue > 0 ? "Needs attention" : "All good"],["Due Soon", String(dueSoon), "Within 3 days"]].map(([l, v, s], i) => (
          <div key={l} className="card">
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 5 }}>{l}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: i === 2 && overdue > 0 ? "#EF4444" : i === 3 && dueSoon > 0 ? "#F59E0B" : "var(--text)" }}>{v}</div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{s}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <select className="select" value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ height: 36, fontSize: 13 }}>
          <option value="name">Sort: Name</option>
          <option value="amount">Sort: Amount</option>
          <option value="date">Sort: Due Date</option>
        </select>
        {search && <span style={{ fontSize: 13, color: "var(--muted)", alignSelf: "center" }}>Results for "{search}"</span>}
        <span style={{ fontSize: 13, color: "var(--muted)", marginLeft: "auto", alignSelf: "center" }}>{bills.length} bill{bills.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 100px", padding: "9px 16px", borderBottom: "1px solid var(--border-color)", background: "var(--surface2)" }}>
          {["Bill","Category","Amount","Due Date",""].map(h => <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</div>)}
        </div>
        {bills.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🧾</div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>No bills found</div>
            <button className="btn-primary" onClick={() => setShowModal(true)}>Add Bill</button>
          </div>
        ) : bills.map((b, i) => {
          const mo = convertToDisplay(toMonthly(b.amount, b.cycle), b.currency);
          const days = b.next_date ? daysUntil(b.next_date) : null;
          const overdue = days !== null && days < 0;
          const soon = days !== null && days >= 0 && days <= 3;
          return (
            <div key={b.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 100px", padding: "11px 16px", borderBottom: i < bills.length - 1 ? "1px solid var(--border-color)" : "none", alignItems: "center", opacity: b.active ? 1 : 0.55 }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--surface2)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                  {b.icon ? <img src={b.icon} width={26} height={26} style={{ objectFit: "contain" }} alt="" onError={e => (e.currentTarget.style.display = "none")} /> : <span>🧾</span>}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{b.name}</div>
                  {b.member_name && <div style={{ fontSize: 11, color: "var(--muted)" }}>{b.member_name}</div>}
                </div>
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>{b.category}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{currencySymbol}{fmt(mo)}<span style={{ fontWeight: 400, color: "var(--muted)", fontSize: 10 }}>/mo</span></div>
                {b.cycle !== "monthly" && <div style={{ fontSize: 10, color: "var(--muted)" }}>{currencySymbol}{fmt(convertToDisplay(b.amount, b.currency))} {b.cycle}</div>}
              </div>
              <div style={{ fontSize: 12 }}>
                {b.next_date ? <div>
                  <div style={{ color: overdue ? "#EF4444" : soon ? "#F59E0B" : "var(--text)", fontWeight: overdue || soon ? 600 : 400 }}>{overdue ? `${Math.abs(days!)}d overdue` : days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days}d`}</div>
                  <div style={{ color: "var(--muted)", fontSize: 10 }}>{b.next_date}</div>
                </div> : <span style={{ opacity: 0.4 }}>—</span>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div onClick={() => update(b.id, { active: !b.active })} style={{ width: 32, height: 18, borderRadius: 9, background: b.active ? "var(--accent)" : "var(--border-color)", cursor: "pointer", position: "relative", flexShrink: 0 }}>
                  <div style={{ position: "absolute", top: 2, left: b.active ? 16 : 2, width: 14, height: 14, borderRadius: 7, background: "white", transition: "left 0.18s" }} />
                </div>
                <AttachmentsPanel subId={b.id} label="" />
                <button style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 13, padding: "2px 4px" }} onClick={() => { setEditBill(b); setShowModal(true); }}>✏️</button>
                <button style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: 13, padding: "2px 4px" }} onClick={() => { if (confirm(`Delete ${b.name}?`)) remove(b.id); }}>🗑️</button>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && <SubModal sub={editBill} defaultType="bill" familyMembers={familyMembers} paymentMethods={paymentMethods} onSave={async (data) => { editBill ? await update(editBill.id, data) : await add(data); setShowModal(false); setEditBill(null); }} onClose={() => { setShowModal(false); setEditBill(null); }} />}
    </div>
  );
}
