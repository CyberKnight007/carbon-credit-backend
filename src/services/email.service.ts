import nodemailer from "nodemailer";
import { config } from "../config";

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  auth: { user: config.smtp.user, pass: config.smtp.pass },
});

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (config.smtp.user) {
    try {
      await transporter.sendMail({ from: config.smtp.from, to, subject, html });
    } catch (err) {
      console.warn("Email send failed (check SMTP config):", (err as Error).message);
    }
  } else {
    console.log(`[DEV] Email to ${to} | Subject: ${subject}`);
  }
}
