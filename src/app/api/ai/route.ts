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
  const subs = db.prepare("SELECT * FROM subscriptions WHERE user_id = ? AND active = 1").all(userId) as any[];
  const monthlyTotal = subs.reduce((acc: number, s: any) => acc + toMonthly(s.amount, s.cycle), 0);

  const systemPrompt = `You are a helpful subscription tracking assistant. The user has these active subscriptions:
${JSON.stringify(subs.map((s: any) => ({ name: s.name, amount: s.amount, cycle: s.cycle, category: s.category })))}

Monthly total: $${monthlyTotal.toFixed(2)}. Yearly: $${(monthlyTotal * 12).toFixed(2)}.

Help the user manage subscriptions. If they want to add one, output a JSON block at the END of your response:
<ADD_SUB>{"name":"...","amount":9.99,"cycle":"monthly","category":"Entertainment","icon":"https://www.google.com/s2/favicons?sz=64&domain=example.com","color":"#6366F1","next_date":"${new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0]}","member":"Me","notes":"","trial":false,"payment_method":""}</ADD_SUB>

Keep responses concise and helpful. Use $ for currency.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt,
      messages,
    }),
  });

  const data = await res.json();
  const reply = data.content?.[0]?.text || "Sorry, I couldn't process that.";

  // Parse ADD_SUB command
  const addMatch = reply.match(/<ADD_SUB>(.*?)<\/ADD_SUB>/s);
  let addedSub = null;
  let cleanReply = reply;

  if (addMatch) {
    try {
      const subData = JSON.parse(addMatch[1]);
      const r = db.prepare(`
        INSERT INTO subscriptions (user_id, name, amount, currency, cycle, category, icon, color, next_date, member, notes, trial, active, payment_method)
        VALUES (?, ?, ?, 'USD', ?, ?, ?, ?, ?, ?, ?, 0, 1, ?)
      `).run(userId, subData.name, subData.amount, subData.cycle, subData.category, subData.icon || null, subData.color || "#6366F1", subData.next_date || null, subData.member || "Me", subData.notes || null, subData.payment_method || null);
      addedSub = db.prepare("SELECT * FROM subscriptions WHERE id = ?").get(r.lastInsertRowid);
      cleanReply = reply.replace(/<ADD_SUB>.*?<\/ADD_SUB>/s, "").trim() + "\n\n✅ Subscription added!";
    } catch {
      cleanReply = reply.replace(/<ADD_SUB>.*?<\/ADD_SUB>/s, "").trim();
    }
  }

  return NextResponse.json({ reply: cleanReply, addedSub });
}
