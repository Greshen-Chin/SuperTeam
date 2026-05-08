import { buildApp } from "./build-app.js";
import { config } from "./config.js";
import { migrate } from "./db.js";

const app = await buildApp();

try {
  await migrate();
} catch (error) {
  app.log.warn(
    { error },
    "PostgreSQL migration failed. Database-backed routes will return DATABASE_UNAVAILABLE until DATABASE_URL is valid."
  );
}

try {
  await app.listen({ host: config.host, port: config.port });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
