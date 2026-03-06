import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getMailTransporter } from "@/lib/mailer";
import { emailTemplate, renderDbTemplate } from "@/lib/emailTemplate";
import crypto from "crypto";

async function isAdmin() {
  const s = await getServerSession(authOptions);
  if (!s?.user) return { ok: false };
  const db = getDb();
  const u = db.prepare("SELECT role FROM users WHERE id = ?").get((s.user as any).id) as any;
  return { ok: u?.role === "admin", session: s };
}

export async function POST(req: NextRequest) {
  const { ok, session } = await isAdmin();
  if (!ok || !session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { email } = body;
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const db = getDb();
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().replace("T", " ").split(".")[0];
  db.prepare("INSERT INTO invites (email, token, invited_by, expires_at) VALUES (?, ?, ?, ?)").run(email, token, (session.user as any).id, expiresAt);

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const invite_url = `${baseUrl}/register?invite=${token}`;
  const mail = getMailTransporter();

  if (mail) {
    try {
      const dbTpl = await renderDbTemplate("invite", { appName: mail.appName, link: invite_url });
      await mail.transporter.sendMail({
        from: mail.from,
        to: email,
        subject: dbTpl?.subject || `You're invited to join ${mail.appName}`,
        html: dbTpl?.html || emailTemplate({
          appName: mail.appName,
          title: "You've been invited!",
          body: `You've been invited to join <strong style="color:#ffffff">${mail.appName}</strong>.`,
          buttonText: "Accept Invitation",
          buttonUrl: invite_url,
        }),
      });
    } catch (e) { console.error(e); }
  }
  return NextResponse.json({ invite_url, token });
}
// ... rest of your file (GET/DELETE)