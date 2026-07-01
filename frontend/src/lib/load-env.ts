import { config } from "dotenv";
import path from "path";

// Local dev only — never override platform env (Vercel/Render inject DATABASE_URL).
const envPath = path.resolve(process.cwd(), "../.env");
config({ path: envPath, override: false });
