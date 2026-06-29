#!/usr/bin/env tsx
/**
 * Send weekly training reminder emails to all active learners.
 * Run: npm run email:weekly-reminders
 * Force resend (ignore 6-day cooldown): npm run email:weekly-reminders -- --force
 */
import "../src/lib/load-env";
import { sendWeeklyTrainingReminders } from "../src/lib/email/training-reminders";
import { prisma } from "../src/lib/prisma";

async function main() {
  const force = process.argv.includes("--force");

  console.log(`\nWeekly Training Reminder Job${force ? " (force)" : ""}\n`);

  const result = await sendWeeklyTrainingReminders({ force });

  console.log(`Processed: ${result.processed}`);
  console.log(`Sent:      ${result.sent}`);
  console.log(`Skipped:   ${result.skipped}`);
  console.log(`Failed:    ${result.failed}\n`);

  for (const d of result.details) {
    console.log(`  ${d.status.padEnd(8)} ${d.email}${d.reason ? ` — ${d.reason}` : ""}`);
  }

  await prisma.$disconnect();

  if (result.failed > 0) process.exit(1);
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
