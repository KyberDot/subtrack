import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { email, password, name, invite } = await req.json();
  if (!email || !password) return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  const db = getDb();
  const platform = db.prepare("SELECT allow_registration FROM platform_settings WHERE id = 1").get() as any;
  
  if (!platform?.allow_registration) {
    if (!invite) return NextResponse.json({ error: "Registration is currently by invite only" }, { status: 403 });
    const inv = db.prepare("SELECT * FROM invites WHERE token = ? AND used = 0").get(invite) as any;
    if (!inv) return NextResponse.json({ error: "Invalid or expired invite link" }, { status: 403 });
    if (inv.email && inv.email !== email) return NextResponse.json({ error: "This invite is for a different email address" }, { status: 403 });
    db.prepare("UPDATE invites SET used = 1 WHERE token = ?").run(invite);
  }
  
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) return NextResponse.json({ error: "Email already registered" }, { status: 400 });
  const hash = await bcrypt.hash(password, 12);
  const r = db.prepare("INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)").run(email, name || email.split("@")[0], hash);
  db.prepare("INSERT INTO user_settings (user_id) VALUES (?)").run(r.lastInsertRowid);
  return NextResponse.json({ ok: true }, { status: 201 });
}
