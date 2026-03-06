import { NextRequest, NextResponse } from "next/server";
import { getMailTransporter } from "@/lib/mailer";
import { emailTemplate, renderDbTemplate } from "@/lib/emailTemplate";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  const mail = getMailTransporter();
  if (!mail) return NextResponse.json({ error: "Mailer not configured" }, { status: 500 });

  try {
    const dbTpl = await renderDbTemplate("test", { appName: mail.appName, link: "#" });
    await mail.transporter.sendMail({
      from: mail.from,
      to: email,
      subject: dbTpl?.subject || "Test Email",
      html: dbTpl?.html || emailTemplate({
        appName: mail.appName,
        title: "Test Email",
        body: "This is a test email to verify your SMTP settings.",
        buttonText: "Success",
        buttonUrl: "#",
      }),
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}