import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getMailTransporter } from "@/lib/mailer";
import { emailTemplate } from "@/lib/emailTemplate";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const user = db.prepare("SELECT role FROM users WHERE id = ?").get((session.user as any).id) as any;
  if (user?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const mail = getMailTransporter();
  if (!mail) return NextResponse.json({ error: "No mail server configured" }, { status: 400 });
  try {
    await mail.transporter.verify();
    const body = await req.json().catch(() => ({}));
    const toAddr = body.to || session.user?.email;
    await mail.transporter.sendMail({
      from: mail.from, to: toAddr,
      subject: `✓ Mail server test — ${mail.appName}`,
      html: emailTemplate({
        appName: mail.appName,
        title: "Mail server is working!",
        body: `Your SMTP configuration is correctly set up. Emails from <strong style="color:#ffffff">${mail.appName}</strong> will be delivered successfully.<br><br><span style="font-size:13px;color:#6B7280">Sent to: ${toAddr}</span>`,
        footer: `This is an automated test email from ${mail.appName}.`,
      }),
    });
    return NextResponse.json({ ok: true, message: `Test email sent to ${toAddr}` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "SMTP connection failed" }, { status: 500 });
  }
}
