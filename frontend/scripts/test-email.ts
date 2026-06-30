#!/usr/bin/env tsx
import "../src/lib/load-env";
import { getEmailConfig } from "../src/lib/email/config";
import { sendEmail } from "../src/lib/email/client";
import { prisma } from "../src/lib/prisma";

async function main() {
  const to = process.argv[2] || "harshc8179@gmail.com";
  const config = getEmailConfig();

  console.log("\nEmail configuration");
  console.log(`  enabled: ${config.enabled}`);
  console.log(`  mode:    ${config.mode}`);
  console.log(`  from:    ${config.from}`);

  if (config.mode === "console") {
    console.log(
      "\nSMTP is NOT configured — emails only print to this terminal, not to inboxes."
    );
    console.log("Set SMTP_HOST, SMTP_USER, and SMTP_PASS in .env, then restart the app.\n");
  }

  const result = await sendEmail({
    to,
    subject: "Kharesiya LMS - Test email",
    text: "This is a test email from Kharesiya Knowledge Hub. If you received this, SMTP is working.",
    html: "<p>This is a <strong>test email</strong> from Kharesiya Knowledge Hub.</p><p>If you received this, SMTP is working.</p>",
  });

  console.log("\nSend result:", result);

  const logs = await prisma.emailLog.findMany({
    where: { toEmail: to },
    orderBy: { createdAt: "desc" },
    take: 3,
    select: { status: true, error: true, sentAt: true, subject: true, createdAt: true },
  });
  console.log("\nRecent email logs for", to, ":", logs);

  await prisma.$disconnect();

  if (!result.success) process.exit(1);
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
