import "@/lib/load-env";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaUrl: string | undefined;
};

function normalizeDatabaseUrl(url: string): string {
  return url.trim().replace(/^["']|["']$/g, "");
}

function createPrismaClient() {
  const connectionString = normalizeDatabaseUrl(process.env.DATABASE_URL ?? "");
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const isSupabase =
    connectionString.includes("supabase.co") ||
    connectionString.includes("supabase.com");
  const usesPgBouncer =
    connectionString.includes("pgbouncer=true") || connectionString.includes(":6543");

  const pool = new Pool({
    connectionString,
    ssl: isSupabase ? { rejectUnauthorized: false } : undefined,
    max: process.env.VERCEL ? 1 : 10,
    idleTimeoutMillis: 20000,
    connectionTimeoutMillis: 15000,
    ...(usesPgBouncer ? { allowExitOnIdle: true } : {}),
  });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

const currentUrl = normalizeDatabaseUrl(process.env.DATABASE_URL ?? "");

if (
  !globalForPrisma.prisma ||
  globalForPrisma.prismaUrl !== currentUrl
) {
  if (globalForPrisma.prisma) {
    void globalForPrisma.prisma.$disconnect();
  }
  globalForPrisma.prisma = createPrismaClient();
  globalForPrisma.prismaUrl = currentUrl;
}

export const prisma = globalForPrisma.prisma;
