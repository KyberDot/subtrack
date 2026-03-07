{/* Budget + Upcoming side by side */}
<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
  
  {/* Budget tracker - LOCKED TO 280px */}
  <div className="card" style={{ height: 280, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: 16, display: "flex", alignItems: "center", gap: 6 }}>Monthly Budget <span style={{ fontSize: 14 }}>ℹ️</span></div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Track your spending</div>
      </div>
      {budget > 0 && <div style={{ fontSize: 13, color: "var(--muted)" }}>{currencySymbol}{fmt(budget)}</div>}
    </div>

    {budget > 0 ? (
      <div style={{ marginTop: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{currencySymbol}{fmt(monthlyTotal)}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: budgetColor }}>{Math.round(budgetPct)}%</span>
        </div>
        <div style={{ height: 8, background: "var(--surface2)", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ width: `${budgetPct}%`, height: "100%", background: budgetColor, borderRadius: 4, transition: "width 0.5s ease" }} />
        </div>
        
        {/* Compact Stats for 280px height */}
        <div style={{ marginTop: 12, display: "grid", gap: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted)" }}>
                <span>Last month</span>
                <span style={{ color: "#EF4444", fontWeight: 600 }}>↑ 5%</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted)" }}>
                <span>Days left</span>
                <span style={{ fontWeight: 600, color: "var(--text)" }}>{daysRemaining}</span>
            </div>
        </div>

        <div style={{ marginTop: 14, padding: "8px 10px", background: `${budgetColor}12`, borderRadius: 8, fontSize: 12, color: budgetColor, display: "flex", alignItems: "center", gap: 6 }}>
          <span>{budgetPct < 70 ? "✅" : budgetPct < 90 ? "⚠️" : "🚨"}</span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {budgetPct < 70 ? "Within budget" : budgetPct < 90 ? "Getting close" : "Over budget!"}
          </span>
        </div>
      </div>
    ) : (
      <div style={{ textAlign: "center", padding: "20px 0" }}>
        <div style={{ fontSize: 24 }}>🎯</div>
        <div style={{ fontSize: 13, color: "var(--muted)" }}>Set a budget to track</div>
      </div>
    )}
  </div>

  {/* Upcoming renewals - LOCKED TO 280px WITH SCROLLING */}
  <div className="card" style={{ height: 280, display: "flex", flexDirection: "column", overflow: "hidden" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexShrink: 0 }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: 16 }}>Upcoming</div>
        <div style={{ fontSize: 12, color: "var(--muted)" }}>Next 7 days</div>
      </div>
      <Link href="/dashboard/subscriptions" style={{ fontSize: 12, color: accentColor, textDecoration: "none" }}>View All</Link>
    </div>
    
    <div style={{ flex: 1, overflowY: "auto", paddingRight: 8, marginRight: -4 }} className="custom-scrollbar">
      {upcomingRenewals.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)", fontSize: 13 }}>🎉 All clear</div>
      ) : upcomingRenewals.map(s => {
        const days = daysUntil(s.next_date!);
        return (
          <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--border-color)" }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {s.icon ? <img src={s.icon} width={20} height={20} style={{ objectFit: "contain" }} alt="" /> : <span style={{ fontSize: 14 }}>📦</span>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>{currencySymbol}{fmt(convertToDisplay(s.amount, s.currency))}</div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: days === 0 ? "#EF4444" : "#F59E0B" }}>{days === 0 ? "Today" : `${days}d`}</span>
          </div>
        );
      })}
    </div>
  </div>
</div>