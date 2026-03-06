import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getMailTransporter } from "@/lib/mailer";
import { emailTemplate, renderDbTemplate } from "@/lib/emailTemplate";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  const db = getDb();
  const user = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as any;

  if (user) {
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 900000).toISOString();
    db.prepare("UPDATE users SET magic_link_token = ?, magic_link_expires = ? WHERE id = ?").run(token, expires, user.id);

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const link = `${baseUrl}/api/auth/callback/credentials?magicToken=${token}`;
    const mail = getMailTransporter();

    if (mail) {
      try {
        const dbTpl = await renderDbTemplate("magic_link", { appName: mail.appName, link });
        await mail.transporter.sendMail({
          from: mail.from,
          to: email,
          subject: dbTpl?.subject || `Sign in to ${mail.appName}`,
          html: dbTpl?.html || emailTemplate({
            appName: mail.appName,
            title: "Magic Sign-in Link",
            body: "Click below to sign in instantly. This link expires in 15 minutes.",
            buttonText: "Sign In",
            buttonUrl: link,
          }),
        });
      } catch (e) { console.error(e); }
    }
  }
  return NextResponse.json({ ok: true });
}