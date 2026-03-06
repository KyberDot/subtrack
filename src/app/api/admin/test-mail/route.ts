import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const user = db.prepare("SELECT role FROM users WHERE id = ?").get((session.user as any).id) as any;
  if (user?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const ps = db.prepare("SELECT * FROM platform_settings WHERE id = 1").get() as any;
  if (!ps?.mail_host) return NextResponse.json({ error: "No mail server configured" }, { status: 400 });
  try {
    const nodemailer = require("nodemailer");
    const transporter = nodemailer.createTransport({
      host: ps.mail_host, port: ps.mail_port || 587, secure: !!ps.mail_secure,
      auth: ps.mail_user ? { user: ps.mail_user, pass: ps.mail_pass } : undefined,
    });
    await transporter.verify();
    const body = await req.json().catch(() => ({}));
    const toAddr = body.to || session.user?.email;
    await transporter.sendMail({
      from: ps.mail_from || `${ps.app_name || "Vexyo"} <noreply@vexyo.app>`,
      to: toAddr,
      subject: `✓ Mail test from ${ps.app_name || "Vexyo"}`,
      html: `<div style="font-family:sans-serif;max-width:480px;margin:auto"><h2>✓ Mail server working!</h2><p>Your SMTP configuration is correct. This test was sent from <strong>${ps.app_name || "Vexyo"}</strong>.</p><p style="color:#666;font-size:13px">Server: ${ps.mail_host}:${ps.mail_port}</p></div>`,
    });
    return NextResponse.json({ ok: true, message: `Test email sent to ${toAddr}` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "SMTP connection failed" }, { status: 500 });
  }
}
