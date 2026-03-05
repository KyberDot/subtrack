import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";

async function uid(req: NextRequest) {
  const s = await getServerSession(authOptions);
  return s?.user ? Number((s.user as any).id) : null;
}

export async function GET(req: NextRequest) {
  const userId = await uid(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const bills = db.prepare(`
    SELECT s.*, fm.name as member_name, pm.label as payment_method_label
    FROM subscriptions s
    LEFT JOIN family_members fm ON fm.id = s.member_id
    LEFT JOIN payment_methods pm ON pm.id = s.payment_method_id
    WHERE s.user_id = ? AND s.type = 'bill'
    ORDER BY s.name
  `).all(userId);
  return NextResponse.json(bills);
}

export async function POST(req: NextRequest) {
  const userId = await uid(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const db = getDb();
  const r = db.prepare(`
    INSERT INTO subscriptions (user_id, type, name, amount, currency, cycle, category, icon, color, next_date, member_id, notes, active, payment_method_id)
    VALUES (?, 'bill', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(userId, body.name, body.amount, body.currency || "USD", body.cycle || "monthly", body.category || "Utilities", body.icon || null, body.color || "#F59E0B", body.next_date || null, body.member_id || null, body.notes || null, 1, body.payment_method_id || null);
  return NextResponse.json(db.prepare("SELECT * FROM subscriptions WHERE id = ?").get(r.lastInsertRowid), { status: 201 });
}
