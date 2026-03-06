import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getMailTransporter } from "@/lib/mailer";

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
      subject: `✓ Mail test from ${mail.appName}`,
      html: `<div style="font-family:sans-serif;max-width:480px;margin:auto"><h2>✓ Mail server working!</h2><p>Your SMTP configuration is correct.</p></div>`,
    });
    return NextResponse.json({ ok: true, message: `Test email sent to ${toAddr}` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "SMTP connection failed" }, { status: 500 });
  }
}
