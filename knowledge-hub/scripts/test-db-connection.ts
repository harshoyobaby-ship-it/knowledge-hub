import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const result = await prisma.$queryRaw<{ ok: number }[]>`SELECT 1 as ok`;
  console.log("✓ Supabase database connected:", result);
  const tables = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::int as count FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `;
  console.log("✓ Tables in public schema:", tables[0]?.count ?? 0);
}

main()
  .catch((e) => {
    console.error("✗ Connection failed:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
