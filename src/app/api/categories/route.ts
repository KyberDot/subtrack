import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { DEFAULT_CATEGORIES } from "@/types";

async function uid() {
  const s = await getServerSession(authOptions);
  return s?.user ? Number((s.user as any).id) : null;
}

export async function GET() {
  const userId = await uid();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const custom = db.prepare("SELECT * FROM user_categories WHERE user_id = ? ORDER BY name").all(userId) as any[];
  // Merge defaults with custom
  const customNames = new Set(custom.map((c: any) => c.name));
  const defaults = DEFAULT_CATEGORIES.filter(d => !customNames.has(d.name)).map(d => ({ ...d, user_id: userId }));
  return NextResponse.json([...defaults, ...custom]);
}

export async function POST(req: NextRequest) {
  const userId = await uid();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { name, icon, color, budget } = await req.json();
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });
  const db = getDb();
  const r = db.prepare("INSERT INTO user_categories (user_id, name, icon, color, budget) VALUES (?, ?, ?, ?, ?)").run(userId, name, icon || "📦", color || "#6366F1", budget || 0);
  return NextResponse.json(db.prepare("SELECT * FROM user_categories WHERE id = ?").get(r.lastInsertRowid), { status: 201 });
}
