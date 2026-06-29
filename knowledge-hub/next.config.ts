import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import type { NextConfig } from "next";

config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.env") });

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
