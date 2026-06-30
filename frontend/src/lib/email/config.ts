export interface EmailConfig {
  enabled: boolean;
  mode: "smtp" | "console";
  from: string;
  fromName: string;
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
  };
  appUrl: string;
  appName: string;
}

export function getEmailConfig(): EmailConfig {
  const enabled = process.env.EMAIL_ENABLED !== "false";
  const host = process.env.SMTP_HOST?.trim() ?? "";
  const user = process.env.SMTP_USER?.trim() ?? "";
  const pass = process.env.SMTP_PASS?.trim() ?? "";
  const hasSmtp = Boolean(host && user && pass);

  // Gmail (and most SMTP providers) require the From address to match the authenticated account.
  const configuredFrom = process.env.SMTP_FROM?.trim() || "";
  const from =
    configuredFrom && (!user.includes("@gmail.com") || configuredFrom === user)
      ? configuredFrom
      : user || "noreply@kharesiya.com";

  return {
    enabled,
    mode: hasSmtp ? "smtp" : "console",
    from,
    fromName: process.env.SMTP_FROM_NAME?.trim() || process.env.NEXT_PUBLIC_APP_NAME || "Kharesiya LMS",
    smtp: {
      host,
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: process.env.SMTP_SECURE === "true",
      user,
      pass,
    },
    appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    appName: process.env.NEXT_PUBLIC_APP_NAME || "Kharesiya Knowledge Hub",
  };
}

export function getCronSecret(): string | null {
  return process.env.CRON_SECRET?.trim() || null;
}
