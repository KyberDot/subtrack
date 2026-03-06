import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getMailTransporter } from "@/lib/mailer";
import { emailTemplate, renderDbTemplate } from "@/lib/emailTemplate";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const db = getDb();
  const user = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as any;

  if (user) {
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 3600000).toISOString();
    db.prepare("UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?").run(token, expires, user.id);

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const link = `${baseUrl}/reset-password?token=${token}`;
    const mail = getMailTransporter();

    if (mail) {
      try {
        const dbTpl = await renderDbTemplate("password_reset", { appName: mail.appName, link });
        await mail.transporter.sendMail({
          from: mail.from,
          to: email,
          subject: dbTpl?.subject || `Reset your ${mail.appName} password`,
          html: dbTpl?.html || emailTemplate({
            appName: mail.appName,
            title: "Reset your password",
            body: "Click below to reset your password. This link expires in 1 hour.",
            buttonText: "Reset Password",
            buttonUrl: link,
          }),
        });
      } catch (err) {
        console.error("Mail error:", err);
      }
    }
  }
  return NextResponse.json({ ok: true });
}