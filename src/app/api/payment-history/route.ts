import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";

async function uid() {
  const s = await getServerSession(authOptions);
  return s?.user ? Number((s.user as any).id) : null;
}

export async function GET(req: NextRequest) {
  const userId = await uid();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const subId = req.nextUrl.searchParams.get("sub_id");
  const db = getDb();
  const rows = subId
    ? db.prepare("SELECT * FROM payment_history WHERE user_id = ? AND sub_id = ? ORDER BY paid_at DESC LIMIT 50").all(userId, subId)
    : db.prepare("SELECT ph.*, s.name as sub_name FROM payment_history ph JOIN subscriptions s ON s.id=ph.sub_id WHERE ph.user_id = ? ORDER BY paid_at DESC LIMIT 100").all(userId);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const userId = await uid();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { sub_id, amount, currency, note, advance_date } = await req.json();
  if (!sub_id) return NextResponse.json({ error: "sub_id required" }, { status: 400 });
  const db = getDb();
  const sub = db.prepare("SELECT * FROM subscriptions WHERE id = ? AND user_id = ?").get(sub_id, userId) as any;
  if (!sub) return NextResponse.json({ error: "Not found" }, { status: 404 });
  
  // Record payment
  const r = db.prepare("INSERT INTO payment_history (user_id, sub_id, amount, currency, note) VALUES (?, ?, ?, ?, ?)").run(userId, sub_id, amount ?? sub.amount, currency ?? sub.currency, note || null);
  
  // Advance next_date if requested
  if (advance_date && sub.next_date) {
    const d = new Date(sub.next_date);
    if (sub.cycle === "monthly") d.setMonth(d.getMonth() + 1);
    else if (sub.cycle === "yearly") d.setFullYear(d.getFullYear() + 1);
    else if (sub.cycle === "weekly") d.setDate(d.getDate() + 7);
    else if (sub.cycle === "quarterly") d.setMonth(d.getMonth() + 3);
    else if (sub.cycle === "6-months") d.setMonth(d.getMonth() + 6);
    db.prepare("UPDATE subscriptions SET next_date = ? WHERE id = ?").run(d.toISOString().split("T")[0], sub_id);
  }
  return NextResponse.json({ id: r.lastInsertRowid, ok: true });
}

export async function DELETE(req: NextRequest) {
  const userId = await uid();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  getDb().prepare("DELETE FROM payment_history WHERE id = ? AND user_id = ?").run(id, userId);
  return NextResponse.json({ ok: true });
}
