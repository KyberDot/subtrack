import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getMailTransporter } from "@/lib/mailer";
import crypto from "crypto";

async function isAdmin() {
  const s = await getServerSession(authOptions);
  if (!s?.user) return { ok: false, session: null };
  const db = getDb();
  const u = db.prepare("SELECT role FROM users WHERE id = ?").get((s.user as any).id) as any;
  return { ok: u?.role === "admin", session: s };
}

export async function GET() {
  const { ok } = await isAdmin();
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const db = getDb();
  return NextResponse.json(db.prepare("SELECT i.*, u.name as invited_by_name FROM invites i LEFT JOIN users u ON u.id = i.invited_by ORDER BY i.created_at DESC").all());
}

export async function POST(req: NextRequest) {
  const { ok, session } = await isAdmin();
  if (!ok || !session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });
  const db = getDb();
  const token = crypto.randomBytes(32).toString("hex");
  db.prepare("INSERT INTO invites (email, token, invited_by) VALUES (?, ?, ?)").run(email, token, (session.user as any).id);
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const invite_url = `${baseUrl}/register?invite=${token}`;
  const mail = getMailTransporter();
  let emailed = false;
  if (mail) {
    try {
      await mail.transporter.sendMail({
        from: mail.from, to: email,
        subject: `You're invited to ${mail.appName}`,
        html: `<div style="font-family:sans-serif;max-width:480px;margin:auto"><h2>You're invited!</h2><p>You've been invited to join <strong>${mail.appName}</strong>.</p><p><a href="${invite_url}" style="background:#6366F1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600">Accept Invitation</a></p><p style="color:#999;font-size:12px">Or copy: ${invite_url}</p></div>`,
      });
      emailed = true;
    } catch {}
  }
  return NextResponse.json({ invite_url, emailed, token });
}

export async function DELETE(req: NextRequest) {
  const { ok } = await isAdmin();
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await req.json();
  getDb().prepare("DELETE FROM invites WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
