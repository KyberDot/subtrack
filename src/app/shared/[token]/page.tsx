import { getDb } from "@/lib/db";
import { toMonthly, fmt, CURRENCY_SYMBOLS } from "@/types";
import { notFound } from "next/navigation";

export default function SharedPage({ params }: { params: { token: string } }) {
  const db = getDb();
  
  // 1. Fetch the shared link and the owner's settings
  const link = db.prepare(`
    SELECT sl.*, u.name as sharer_name, s.currency as user_currency, s.exchange_rates
    FROM shared_links sl
    LEFT JOIN users u ON u.id = sl.user_id
    LEFT JOIN settings s ON s.user_id = sl.user_id
    WHERE sl.token = ? AND sl.active = 1
  `).get(params.token) as any;

  if (!link) notFound();

  // 2. Setup conversion logic for the shared view
  const displayCurrency = link.user_currency || "USD";
  const sym = CURRENCY_SYMBOLS[displayCurrency] || displayCurrency;
  const rates = JSON.parse(link.exchange_rates || "{}");

  const convertValue = (amount: number, fromCurrency: string) => {
    if (fromCurrency === displayCurrency) return amount;
    const rate = rates[fromCurrency];
    return rate ? amount / rate : amount; // Simple conversion logic consistent with your app
  };

  // 3. Fetch only the mapped subscriptions
  const subs = db.prepare(`
    SELECT s.* FROM subscriptions s
    INNER JOIN shared_link_items sli ON sli.subscription_id = s.id
    WHERE sli.link_id = ? AND s.active = 1
    ORDER BY s.name
  `).all(link.id) as any[];

  const monthlyTotal = subs.reduce((a: number, s: any) => 
    a + convertValue(toMonthly(s.amount, s.cycle), s.currency), 0
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0F1117", padding: 32, fontFamily: "DM Sans, sans-serif" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>💰</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}>Shared Subscriptions</h1>
          {link.sharer_name && (
            <p style={{ color: "#9CA3AF", fontSize: 14, marginTop: 4 }}>
              Shared by <strong style={{ color: "#fff" }}>{link.sharer_name}</strong> via Vexyo
            </p>
          )}
          <div style={{ marginTop: 12, fontSize: 20, fontWeight: 700, color: "#6366F1" }}>
             {sym}{fmt(monthlyTotal)}/mo
          </div>
        </div>

        <div style={{ background: "#1A1D27", border: "1px solid #2A2D3A", borderRadius: 12, overflow: "hidden" }}>
          {subs.length === 0 ? (
             <div style={{ padding: 48, textAlign: "center", color: "#9CA3AF" }}>No items shared in this link.</div>
          ) : subs.map((s: any, i: number) => {
            const convertedMonthly = convertValue(toMonthly(s.amount, s.cycle), s.currency);
            
            return (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: i < subs.length - 1 ? "1px solid #2A2D3A" : "none" }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "#2A2D3A", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  {s.icon ? (
                    <img src={s.icon} width={22} height={22} style={{ objectFit: "contain" }} alt="" />
                  ) : (
                    <span style={{ fontSize: 14 }}>📦</span>
                  )}
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "#fff" }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: "#9CA3AF" }}>{s.category} · {s.cycle}</div>
                </div>
                
                <div style={{ fontWeight: 700, color: "#fff", textAlign: "right" }}>
                  {s.cycle === "variable" ? (
                    <span style={{ color: "#9CA3AF" }}>Variable</span>
                  ) : (
                    `${sym}${fmt(convertedMonthly)}/mo`
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}