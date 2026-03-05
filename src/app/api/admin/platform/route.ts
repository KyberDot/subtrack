import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";

async function requireAdmin() {
  const s = await getServerSession(authOptions);
  if (!s?.user) return null;
  const db = getDb();
  const u = db.prepare("SELECT role FROM users WHERE id = ?").get((s.user as any).id) as any;
  return u?.role === "admin" ? Number((s.user as any).id) : null;
}

export async function GET() {
  const adminId = await requireAdmin();
  if (!adminId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const db = getDb();
  const p = db.prepare("SELECT * FROM platform_settings WHERE id = 1").get();
  return NextResponse.json(p || {});
}
