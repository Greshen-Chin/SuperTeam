import { buildApp } from "./app.js";
import { config } from "./config.js";
import { migrate, requirePool } from "./db.js";
import { createDisputeRepository } from "./repositories/dispute-repository.js";

const app = await buildApp();

try {
  await migrate();
} catch (error) {
  app.log.warn(
    { error },
    "PostgreSQL migration failed. Database-backed routes will return DATABASE_UNAVAILABLE until DATABASE_URL is valid."
  );
}

// Expire open disputes whose response deadline has passed (runs every minute)
setInterval(() => {
  try {
    const pool = requirePool();
    createDisputeRepository(pool)
      .expireOpenDisputes()
      .then((n) => {
        if (n > 0) app.log.info({ expired: n }, "dispute expiry job: marked disputes expired");
      })
      .catch((err) => app.log.warn({ err }, "dispute expiry job failed"));
  } catch {
    // DB not connected yet — skip silently
  }
}, 60_000);

try {
  await app.listen({ host: config.host, port: config.port });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
