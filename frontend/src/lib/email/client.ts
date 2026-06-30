import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { getEmailConfig } from "./config";

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  const config = getEmailConfig();
  if (config.mode !== "smtp") return null;

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    });
  }

  return transporter;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SendEmailResult {
  success: boolean;
  mode: "smtp" | "console" | "disabled";
  messageId?: string;
  error?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const config = getEmailConfig();

  if (!config.enabled) {
    return { success: false, mode: "disabled", error: "Email is disabled" };
  }

  const from = `"${config.fromName}" <${config.from}>`;

  if (config.mode === "console") {
    console.log("\n--- EMAIL (console mode) ---");
    console.log(`To: ${params.to}`);
    console.log(`Subject: ${params.subject}`);
    console.log(params.text ?? params.html.replace(/<[^>]+>/g, " ").slice(0, 500));
    console.log("--- END EMAIL ---\n");
    return { success: true, mode: "console", messageId: `console-${Date.now()}` };
  }

  try {
    const transport = getTransporter();
    if (!transport) {
      return { success: false, mode: "smtp", error: "SMTP not configured" };
    }

    const info = await transport.sendMail({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });

    return { success: true, mode: "smtp", messageId: info.messageId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Send failed";
    return { success: false, mode: "smtp", error: message };
  }
}
