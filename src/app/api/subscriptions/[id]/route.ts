import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";

async function getUserId(): Promise<number | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return Number((session.user as any).id);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const existing = db.prepare("SELECT * FROM subscriptions WHERE id = ? AND user_id = ?").get(params.id, userId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json();
  const fields = ["name", "amount", "currency", "cycle", "category", "icon", "color", "next_date", "member", "notes", "trial", "active", "payment_method"];
  const updates: string[] = [];
  const values: any[] = [];
  for (const f of fields) {
    if (f in body) {
      updates.push(`${f} = ?`);
      values.push(typeof body[f] === "boolean" ? (body[f] ? 1 : 0) : body[f]);
    }
  }
  if (updates.length === 0) return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  updates.push("updated_at = datetime('now')");
  values.push(params.id, userId);
  db.prepare(`UPDATE subscriptions SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`).run(...values);
  const updated = db.prepare("SELECT * FROM subscriptions WHERE id = ?").get(params.id);
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const r = db.prepare("DELETE FROM subscriptions WHERE id = ? AND user_id = ?").run(params.id, userId);
  if (r.changes === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
