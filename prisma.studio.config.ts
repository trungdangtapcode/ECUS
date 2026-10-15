import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { defineConfig } from "prisma/config";

const envFile = fileURLToPath(new URL("./.env", import.meta.url));
if (existsSync(envFile)) loadEnvFile(envFile);

// Studio connects directly to PostgreSQL; Alembic remains the schema owner.
// Convert only the SQLAlchemy driver prefix, preserving escaped credentials.
const databaseUrl = process.env.DATABASE_URL?.replace(/^postgresql\+asyncpg:/, "postgresql:");
if (!databaseUrl) {
  throw new Error("Set DATABASE_URL in the root .env or environment before starting Studio.");
}
try {
  const url = new URL(databaseUrl);
  if (!["postgresql:", "postgres:"].includes(url.protocol) || !url.hostname) throw new Error();
} catch {
  // Do not include connection strings or credentials in error output.
  throw new Error("DATABASE_URL must be a valid PostgreSQL connection URL.");
}

export default defineConfig({ datasource: { url: databaseUrl } });
