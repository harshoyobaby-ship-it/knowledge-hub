/**
 * Configure .env for Supabase after creating a project in the dashboard.
 *
 * macOS / Linux (interactive — recommended):
 *   npm run setup:supabase
 *
 * macOS / Linux (with arguments):
 *   npm run setup:supabase -- \
 *     --ref YOUR_PROJECT_REF \
 *     --password YOUR_DB_PASSWORD \
 *     --region ap-southeast-2 \
 *     --anon-key YOUR_ANON_KEY \
 *     --service-key YOUR_SERVICE_ROLE_KEY
 *
 * Windows (PowerShell):
 *   npm run setup:supabase -- `
 *     --ref YOUR_PROJECT_REF `
 *     --password YOUR_DB_PASSWORD `
 *     --region us-east-1 `
 *     --anon-key YOUR_ANON_KEY `
 *     --service-key YOUR_SERVICE_ROLE_KEY
 *
 * Get values from: Supabase Dashboard → Project Settings → Database / API
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { randomUUID } from "crypto";
import * as readline from "readline";

const isWindows = process.platform === "win32";
const projectRoot = process.cwd();
const envPath = resolve(projectRoot, "../.env");
const uploadsDir = join(projectRoot, "public", "uploads");

function parseExistingEnv(content: string): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    vars[key] = value;
  }
  return vars;
}

function loadExistingEnv(): Record<string, string> {
  if (!existsSync(envPath)) return {};
  return parseExistingEnv(readFileSync(envPath, "utf-8"));
}

function getArg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1 || !process.argv[idx + 1]) return undefined;
  return process.argv[idx + 1];
}

function hasCliArgs(): boolean {
  return process.argv.some((arg) => arg.startsWith("--"));
}

function extractRefFromUrl(url?: string): string | undefined {
  if (!url) return undefined;
  const match = url.match(/https?:\/\/([^.]+)\.supabase\.co/);
  return match?.[1];
}

function extractRegionFromComment(content: string): string | undefined {
  const match = content.match(/Region:\s*([a-z0-9-]+)/i);
  return match?.[1];
}

async function prompt(question: string, defaultValue?: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const suffix = defaultValue ? ` [${defaultValue}]` : "";
  return new Promise((resolvePrompt) => {
    rl.question(`${question}${suffix}: `, (answer) => {
      rl.close();
      resolvePrompt(answer.trim() || defaultValue || "");
    });
  });
}

async function collectConfig(): Promise<{
  projectRef: string;
  password: string;
  region: string;
  anonKey: string;
  serviceKey: string;
}> {
  const existing = loadExistingEnv();
  const existingContent = existsSync(envPath)
    ? readFileSync(envPath, "utf-8")
    : "";

  if (!hasCliArgs()) {
    const platformLabel = isWindows ? "Windows" : "macOS";
    console.log(`Supabase .env setup (${platformLabel})\n`);

    const projectRef = await prompt(
      "Project ref",
      extractRefFromUrl(existing.NEXT_PUBLIC_SUPABASE_URL)
    );
    const password = await prompt("Database password");
    const region = await prompt(
      "AWS region (e.g. ap-southeast-2, us-east-1)",
      extractRegionFromComment(existingContent) || "us-east-1"
    );
    const anonKey = await prompt(
      "Publishable (anon) key",
      existing.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    );
    const serviceKey = await prompt(
      "Service role key",
      existing.SUPABASE_SERVICE_ROLE_KEY
    );

    if (!projectRef || !password || !anonKey || !serviceKey) {
      console.error("\nAll fields are required.");
      process.exit(1);
    }

    return { projectRef, password, region, anonKey, serviceKey };
  }

  const projectRef = getArg("ref");
  const password = getArg("password");
  const anonKey = getArg("anon-key");
  const serviceKey = getArg("service-key");

  if (!projectRef || !password || !anonKey || !serviceKey) {
    console.error("Missing required arguments.");
    console.error(
      isWindows
        ? "\nWindows example:\n  npm run setup:supabase -- --ref REF --password PASS --region us-east-1 --anon-key KEY --service-key KEY"
        : "\nmacOS example:\n  npm run setup:supabase -- --ref REF --password PASS --region ap-southeast-2 --anon-key KEY --service-key KEY"
    );
    console.error("\nOr run without arguments for interactive prompts:\n  npm run setup:supabase");
    process.exit(1);
  }

  return {
    projectRef,
    password,
    region: getArg("region") || "us-east-1",
    anonKey,
    serviceKey,
  };
}

async function main() {
  const config = await collectConfig();
  const existing = loadExistingEnv();

  const encodedPassword = encodeURIComponent(config.password);
  const databaseUrl = `postgresql://postgres.${config.projectRef}:${encodedPassword}@aws-0-${config.region}.pooler.supabase.com:6543/postgres?pgbouncer=true`;
  const directUrl = `postgresql://postgres.${config.projectRef}:${encodedPassword}@aws-0-${config.region}.pooler.supabase.com:5432/postgres`;
  const supabaseUrl = `https://${config.projectRef}.supabase.co`;

  const jwtSecret = existing.JWT_SECRET || `${randomUUID()}-${randomUUID()}`;
  const jwtExpires = existing.JWT_EXPIRES_IN || "7d";
  const appName = existing.NEXT_PUBLIC_APP_NAME || "Kharesiya Knowledge Hub";
  const appUrl = existing.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const demoMode = existing.NEXT_PUBLIC_DEMO_MODE;

  let envContent = `# Supabase — Knowledge Hub
# Project: ${config.projectRef} | Region: ${config.region}

DATABASE_URL="${databaseUrl}"
DIRECT_URL="${directUrl}"
NEXT_PUBLIC_SUPABASE_URL="${supabaseUrl}"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="${config.anonKey}"
SUPABASE_SERVICE_ROLE_KEY="${config.serviceKey}"

JWT_SECRET="${jwtSecret}"
JWT_EXPIRES_IN="${jwtExpires}"
STORAGE_TYPE="local"
STORAGE_LOCAL_PATH="public/uploads"
NEXT_PUBLIC_APP_NAME="${appName}"
NEXT_PUBLIC_APP_URL="${appUrl}"
`;

  if (demoMode) {
    envContent += `NEXT_PUBLIC_DEMO_MODE="${demoMode}"\n`;
  }

  writeFileSync(envPath, envContent, "utf-8");
  mkdirSync(uploadsDir, { recursive: true });

  console.log("\n✓ .env written successfully");
  console.log(`  Path: ${envPath}`);
  console.log(`  Project: ${supabaseUrl}`);
  console.log(`  Uploads: ${uploadsDir}`);
  console.log("\nNext steps:");
  console.log("  npm run db:push    # create tables in Supabase");
  console.log("  npm run db:seed    # optional demo data");
  console.log("  npm run dev        # start the app");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("Setup failed:", message);
  process.exit(1);
});
