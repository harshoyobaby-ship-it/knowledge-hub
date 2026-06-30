import "@/lib/load-env";

export function isDatabaseConfigured(): boolean {
  const url = process.env.DATABASE_URL ?? "";
  if (!url) return false;
  const placeholders = ["[PROJECT_REF]", "[PASSWORD]", "[REGION]", "your-anon-key", "your-publishable-key", "YOUR_DB_PASSWORD"];
  return !placeholders.some((p) => url.includes(p));
}

export function databaseUnavailableMessage(): string {
  return "Database is not connected. Use “Continue with Demo Account” below, or add your Supabase credentials to .env and run npm run db:push.";
}
