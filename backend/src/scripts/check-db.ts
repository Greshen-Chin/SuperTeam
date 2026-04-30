import "dotenv/config";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL;
const directUrl = process.env.DIRECT_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is missing in backend/.env");
  process.exit(1);
}

await checkConnection("DATABASE_URL", databaseUrl);

if (directUrl) {
  await checkConnection("DIRECT_URL", directUrl);
}

async function checkConnection(name: string, connectionString: string) {
  const safeUrl = connectionString.replace(/:([^:@/]+)@/, ":***@");
  console.log(`Checking ${name}: ${safeUrl}`);

  const pool = new pg.Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10_000
  });

  try {
    const result = await pool.query("select current_database() as database, current_user as user, now() as time");
    console.log(`${name} connection OK`);
    console.log(result.rows[0]);
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: unknown }).code) : "UNKNOWN";
    const message = error instanceof Error ? error.message : String(error);

    console.error(`${name} connection FAILED`);
    console.error(`Code: ${code}`);
    console.error(`Message: ${message}`);
    console.error("");
    console.error("For Supabase, use the exact Transaction Pooler and Direct Connection strings from:");
    console.error("Project Settings -> Database -> Connection string");
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
