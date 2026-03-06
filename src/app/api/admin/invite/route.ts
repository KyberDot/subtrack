import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import crypto from "crypto";

async function isAdmin() {
  const s = await getServerSession(authOptions);
  if (!s?.user) return false;
  const db = getDb();
  const u = db.prepare("SELECT role FROM users WHERE id = ?").get((s.user as any).id) as any;
  return u?.role === "admin";
}

export async function GET() {
  if (!await isAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const db = getDb();
  return NextResponse.json(db.prepare("SELECT i.*, u.name as invited_by_name FROM invites i LEFT JOIN users u ON u.id = i.invited_by ORDER BY i.created_at DESC").all());
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!await isAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });
  const db = getDb();
  const token = crypto.randomBytes(32).toString("hex");
  db.prepare("INSERT INTO invites (email, token, invited_by) VALUES (?, ?, ?)").run(email, token, (session.user as any).id);
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const invite_url = `${baseUrl}/register?invite=${token}`;

  // Try to send email
  const ps = db.prepare("SELECT * FROM platform_settings WHERE id = 1").get() as any;
  let emailed = false;
  if (ps?.mail_host) {
    try {
      const nodemailer = require("nodemailer");
      const transporter = nodemailer.createTransport({ host: ps.mail_host, port: ps.mail_port || 587, secure: !!ps.mail_secure, auth: ps.mail_user ? { user: ps.mail_user, pass: ps.mail_pass } : undefined });
      await transporter.sendMail({
        from: ps.mail_from || `${ps.app_name || "Vexyo"} <noreply@vexyo.app>`,
        to: email,
        subject: `You're invited to ${ps.app_name || "Vexyo"}`,
        html: `<p>You've been invited to join <strong>${ps.app_name || "Vexyo"}</strong>.</p><p><a href="${invite_url}" style="background:#6366F1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600">Accept Invitation</a></p><p style="color:#999;font-size:12px">Or copy: ${invite_url}</p>`,
      });
      emailed = true;
    } catch {}
  }
  return NextResponse.json({ invite_url, emailed, token });
}

export async function DELETE(req: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await req.json();
  getDb().prepare("DELETE FROM invites WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
