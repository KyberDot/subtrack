import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";

async function getUserId(): Promise<number | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return Number((session.user as any).id);
}

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const notifs = db.prepare(`
    SELECT n.*, s.name as sub_name, s.icon as sub_icon, s.amount as sub_amount
    FROM notifications n
    LEFT JOIN subscriptions s ON s.id = n.sub_id
    WHERE n.user_id = ?
    ORDER BY n.created_at DESC
    LIMIT 50
  `).all(userId);
  return NextResponse.json(notifs);
}

export async function PATCH(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, read, readAll } = await req.json();
  const db = getDb();
  if (readAll) {
    db.prepare("UPDATE notifications SET read = 1 WHERE user_id = ?").run(userId);
  } else {
    db.prepare("UPDATE notifications SET read = ? WHERE id = ? AND user_id = ?").run(read ? 1 : 0, id, userId);
  }
  return NextResponse.json({ ok: true });
}
