import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import type { NextConfig } from "next";

const monorepoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

config({ path: path.resolve(monorepoRoot, ".env") });

const nextConfig: NextConfig = {
  outputFileTracingRoot: monorepoRoot,
};

export default nextConfig;
