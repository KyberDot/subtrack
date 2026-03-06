import { getDb } from "./db";

export function getMailTransporter() {
  const db = getDb();
  const p = db.prepare("SELECT * FROM platform_settings WHERE id = 1").get() as any;
  if (!p?.mail_host) return null;
  const nodemailer = require("nodemailer");
  const port = Number(p.mail_port) || 587;
  const isSSL = port === 465 || !!p.mail_secure;
  return {
    transporter: nodemailer.createTransport({
      host: p.mail_host,
      port,
      secure: isSSL,
      ...(isSSL ? {} : { requireTLS: true }),
      auth: p.mail_user ? { user: p.mail_user, pass: p.mail_pass } : undefined,
      tls: { rejectUnauthorized: false },
    }),
    from: p.mail_from || `${p.app_name || "Vexyo"} <noreply@vexyo.app>`,
    appName: p.app_name || "Vexyo",
  };
}
