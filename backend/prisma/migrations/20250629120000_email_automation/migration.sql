-- Email automation: weekly training reminders

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'LEARNING_REMINDER';

CREATE TYPE "EmailType" AS ENUM ('WEEKLY_TRAINING_REMINDER', 'PASSWORD_RESET', 'WELCOME');
CREATE TYPE "EmailStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

CREATE TABLE IF NOT EXISTS "EmailLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "EmailType" NOT NULL,
    "toEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "metadata" JSONB,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "EmailLog_userId_type_createdAt_idx" ON "EmailLog"("userId", "type", "createdAt");
CREATE INDEX IF NOT EXISTS "EmailLog_type_createdAt_idx" ON "EmailLog"("type", "createdAt");

ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
