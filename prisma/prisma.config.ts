import path from "node:path";
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Load env files from project root (prisma.config.ts is in prisma/)
const root = path.join(__dirname, "..");
config({ path: path.join(root, ".env.local"), override: false });
config({ path: path.join(root, ".env"), override: false });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.warn("WARNING: DATABASE_URL not found. Falling back to localhost.");
}

export default defineConfig({
  schema: path.join(__dirname, "schema.prisma"),
  datasource: {
    url: databaseUrl ?? "postgresql://localhost:5432/cashpilot",
  },
});
