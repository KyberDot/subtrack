import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getMailTransporter } from "@/lib/mailer";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const { email } = await req.json().catch(() => ({}));
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });
  const db = getDb();
  const user = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as any;
  // Silent - don't reveal if email exists
  if (!user) return NextResponse.json({ ok: true });
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString().replace("T", " ").split(".")[0];
  db.prepare("INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)").run(user.id, token, expires);
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const link = `${baseUrl}/reset-password?token=${token}`;
  const mail = getMailTransporter();
  if (mail) {
    try {
      await mail.transporter.sendMail({
        from: mail.from, to: email,
        subject: `Reset your ${mail.appName} password`,
        html: `<div style="font-family:sans-serif;max-width:480px;margin:auto"><h2>Reset your password</h2><p>Click below to reset your password. This link expires in 1 hour.</p><p><a href="${link}" style="background:#6366F1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600">Reset Password</a></p><p style="color:#999;font-size:12px">Or paste: ${link}</p></div>`,
      });
      return NextResponse.json({ ok: true, sent: true });
    } catch {}
  }
  return NextResponse.json({ ok: true, sent: false, link });
}
