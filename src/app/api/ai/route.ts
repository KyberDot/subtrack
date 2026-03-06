import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { toMonthly } from "@/types";

async function getUserId(): Promise<number | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return Number((session.user as any).id);
}

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { messages } = await req.json();
  const db = getDb();

  const allSubs = db.prepare("SELECT * FROM subscriptions WHERE user_id = ?").all(userId) as any[];
  const activeSubs = allSubs.filter(s => s.active && s.type !== "bill");
  const activeBills = allSubs.filter(s => s.active && s.type === "bill");
  const inactiveSubs = allSubs.filter(s => !s.active);

  const monthlyTotal = activeSubs.reduce((acc: number, s: any) => acc + toMonthly(s.amount, s.cycle), 0);
  const billsTotal = activeBills.reduce((acc: number, s: any) => acc + toMonthly(s.amount, s.cycle), 0);

  const cats: Record<string, number> = {};
  for (const s of activeSubs) {
    const k = s.category || "Other";
    cats[k] = (cats[k] || 0) + toMonthly(s.amount, s.cycle);
  }

  const subsForAI = allSubs.map((s: any) => ({
    id: s.id, name: s.name, amount: s.amount, cycle: s.cycle,
    category: s.category, active: !!s.active, type: s.type || "subscription",
    next_date: s.next_date, notes: s.notes,
  }));

  const today = new Date().toISOString().split("T")[0];
  const systemPrompt = `You are a smart personal finance assistant inside a subscription tracker app. You have FULL access to manage the user's data.

USER'S DATA:
Active subscriptions (${activeSubs.length}): ${JSON.stringify(activeSubs.map(s => ({ id: s.id, name: s.name, amount: s.amount, cycle: s.cycle, category: s.category, next_date: s.next_date })))}
Active bills (${activeBills.length}): ${JSON.stringify(activeBills.map(s => ({ id: s.id, name: s.name, amount: s.amount, cycle: s.cycle, next_date: s.next_date })))}
Inactive (${inactiveSubs.length}): ${JSON.stringify(inactiveSubs.map(s => ({ id: s.id, name: s.name })))}

TOTALS: Monthly subs: $${monthlyTotal.toFixed(2)}, Monthly bills: $${billsTotal.toFixed(2)}, Combined yearly: $${((monthlyTotal + billsTotal) * 12).toFixed(2)}
SPENDING BY CATEGORY: ${JSON.stringify(Object.entries(cats).map(([k, v]) => ({ category: k, monthly: +v.toFixed(2) })))}

ACTIONS YOU CAN PERFORM - output ONE JSON command block at the END of your response:

To ADD a subscription or bill:
<ACTION>{"action":"add","data":{"name":"...","amount":9.99,"cycle":"monthly","category":"Entertainment","type":"subscription","icon":"https://www.google.com/s2/favicons?sz=64&domain=example.com","next_date":"${today}","notes":"","trial":false}}</ACTION>

To DELETE a subscription/bill (use exact id):
<ACTION>{"action":"delete","id":123}</ACTION>

To UPDATE a subscription/bill (only include fields to change):
<ACTION>{"action":"update","id":123,"data":{"active":false,"amount":14.99,"name":"New Name"}}</ACTION>

GUIDELINES:
- Be conversational and specific. Reference actual subscription names and amounts.
- Proactively give money-saving advice based on their real data.
- When asked to cancel/delete, confirm the exact item name and cost first, then include the DELETE action.
- When asked to deactivate, use update with active:false instead of delete.
- Suggest cheaper alternatives when relevant (e.g. if they have both Hulu and Netflix).
- If asked about duplicates or unused services, analyze their list carefully.
- For ambiguous requests, ask clarifying questions without emitting an action.
- Keep responses concise. Use bullet points for lists.
- Do NOT include an action if the user is just asking a question.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1200,
      system: systemPrompt,
      messages,
    }),
  });

  const data = await res.json();
  const reply = data.content?.[0]?.text || "Sorry, I couldn't process that.";

  const actionMatch = reply.match(/<ACTION>(.*?)<\/ACTION>/s);
  let actionResult: any = null;
  let cleanReply = reply.replace(/<ACTION>.*?<\/ACTION>/s, "").trim();

  if (actionMatch) {
    try {
      const cmd = JSON.parse(actionMatch[1]);

      if (cmd.action === "add") {
        const d = cmd.data;
        const r = db.prepare(`
          INSERT INTO subscriptions (user_id, name, amount, currency, cycle, category, type, icon, color, next_date, notes, trial, active, payment_method)
          VALUES (?, ?, ?, 'USD', ?, ?, ?, ?, '#6366F1', ?, ?, 0, 1, '')
        `).run(userId, d.name, d.amount || 0, d.cycle || "monthly", d.category || "Other", d.type || "subscription", d.icon || null, d.next_date || today, d.notes || null);
        actionResult = { type: "add", sub: db.prepare("SELECT * FROM subscriptions WHERE id = ?").get(r.lastInsertRowid) };
        cleanReply += `\n\n✅ **${d.name}** has been added.`;

      } else if (cmd.action === "delete") {
        const target = allSubs.find(s => s.id === cmd.id);
        if (target && target.user_id === userId) {
          db.prepare("DELETE FROM subscriptions WHERE id = ? AND user_id = ?").run(cmd.id, userId);
          actionResult = { type: "delete", id: cmd.id };
          cleanReply += `\n\n🗑️ **${target.name}** has been deleted.`;
        }

      } else if (cmd.action === "update") {
        const target = allSubs.find(s => s.id === cmd.id);
        if (target && target.user_id === userId) {
          const fields: string[] = [];
          const vals: any[] = [];
          for (const [k, v] of Object.entries(cmd.data || {})) {
            if (["name","amount","cycle","category","active","notes","next_date","icon","color"].includes(k)) {
              fields.push(`${k} = ?`);
              vals.push(typeof v === "boolean" ? (v ? 1 : 0) : v);
            }
          }
          if (fields.length) {
            db.prepare(`UPDATE subscriptions SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`).run(...vals, cmd.id, userId);
            actionResult = { type: "update", id: cmd.id };
            const wasDeactivated = cmd.data?.active === false;
            cleanReply += `\n\n✅ **${target.name}** has been ${wasDeactivated ? "deactivated" : "updated"}.`;
          }
        }
      }
    } catch {}
  }

  return NextResponse.json({ reply: cleanReply, actionResult });
}
