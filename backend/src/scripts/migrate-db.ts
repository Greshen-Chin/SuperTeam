import "dotenv/config";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";

const databaseUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DIRECT_URL or DATABASE_URL is missing in backend/.env");
  process.exit(1);
}

const schemaPath = resolve(process.cwd(), "schema.sql");
const schema = await readFile(schemaPath, "utf8");

const pool = new pg.Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10_000
});

try {
  const safeUrl = databaseUrl.replace(/:([^:@/]+)@/, ":***@");
  console.log(`Running migration with ${process.env.DIRECT_URL ? "DIRECT_URL" : "DATABASE_URL"}: ${safeUrl}`);
  await pool.query(schema);
  console.log("Database schema migrated successfully.");
} catch (error) {
  const code = error instanceof Error && "code" in error ? String((error as { code?: unknown }).code) : "UNKNOWN";
  const message = error instanceof Error ? error.message : String(error);
  console.error("Database migration failed.");
  console.error(`Code: ${code}`);
  console.error(`Message: ${message}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
