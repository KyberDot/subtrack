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
  const db = getDb();
  // Generate renewal notifications
  const subs = db.prepare("SELECT * FROM subscriptions WHERE user_id = ? AND active = 1 AND next_date IS NOT NULL").all(userId) as any[];
  const today = new Date();
  for (const s of subs) {
    const days = Math.ceil((new Date(s.next_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if ([1, 3, 7].includes(days)) {
      const existing = db.prepare("SELECT id FROM notifications WHERE user_id = ? AND sub_id = ? AND type = 'renewal' AND message LIKE ?").get(userId, s.id, `%${days} day%`);
      if (!existing) {
        const title = days === 1 ? "Renewing Tomorrow" : `Renewing in ${days} days`;
        const msg = `${s.name} renews in ${days} day${days > 1 ? "s" : ""} — $${Number(s.amount).toFixed(2)}`;
        db.prepare("INSERT INTO notifications (user_id, sub_id, type, title, message) VALUES (?, ?, 'renewal', ?, ?)").run(userId, s.id, title, msg);
      }
    }
    if (s.trial && days <= 3 && days >= 0) {
      const existing = db.prepare("SELECT id FROM notifications WHERE user_id = ? AND sub_id = ? AND type = 'trial'").get(userId, s.id);
      if (!existing) {
        db.prepare("INSERT INTO notifications (user_id, sub_id, type, title, message) VALUES (?, ?, 'trial', ?, ?)").run(userId, s.id, "Trial Ending Soon", `Your ${s.name} trial ends in ${days} day${days !== 1 ? "s" : ""}`);
      }
    }
  }
  const notifs = db.prepare(`
    SELECT n.*, s.name as sub_name, s.icon as sub_icon, s.amount as sub_amount
    FROM notifications n
    LEFT JOIN subscriptions s ON s.id = n.sub_id
    WHERE n.user_id = ?
    ORDER BY n.created_at DESC
    LIMIT 100
  `).all(userId);
  return NextResponse.json(notifs);
}

export async function PATCH(req: NextRequest) {
  const userId = await uid();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, read, markAll } = await req.json();
  const db = getDb();
  if (markAll) { db.prepare("UPDATE notifications SET read = 1 WHERE user_id = ?").run(userId); }
  else if (id !== undefined) { db.prepare("UPDATE notifications SET read = ? WHERE id = ? AND user_id = ?").run(read ? 1 : 0, id, userId); }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const userId = await uid();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, clearAll } = await req.json();
  const db = getDb();
  if (clearAll) { db.prepare("DELETE FROM notifications WHERE user_id = ? AND read = 1").run(userId); }
  else if (id) { db.prepare("DELETE FROM notifications WHERE id = ? AND user_id = ?").run(id, userId); }
  return NextResponse.json({ ok: true });
}
