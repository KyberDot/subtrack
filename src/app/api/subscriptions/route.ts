import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().default("USD"),
  cycle: z.enum(["monthly", "yearly", "weekly", "quarterly"]),
  category: z.string().default("Other"),
  icon: z.string().optional(),
  color: z.string().default("#6366F1"),
  next_date: z.string().optional(),
  member: z.string().default("Me"),
  notes: z.string().optional(),
  trial: z.boolean().default(false),
  active: z.boolean().default(true),
  payment_method: z.string().optional(),
});

async function getUserId(req: NextRequest): Promise<number | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return Number((session.user as any).id);
}

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const subs = db.prepare("SELECT * FROM subscriptions WHERE user_id = ? ORDER BY name").all(userId);
  return NextResponse.json(subs);
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = schema.parse(await req.json());
  const db = getDb();
  const r = db.prepare(`
    INSERT INTO subscriptions (user_id, name, amount, currency, cycle, category, icon, color, next_date, member, notes, trial, active, payment_method)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(userId, body.name, body.amount, body.currency, body.cycle, body.category, body.icon || null, body.color, body.next_date || null, body.member, body.notes || null, body.trial ? 1 : 0, body.active ? 1 : 0, body.payment_method || null);
  const sub = db.prepare("SELECT * FROM subscriptions WHERE id = ?").get(r.lastInsertRowid);
  return NextResponse.json(sub, { status: 201 });
}
