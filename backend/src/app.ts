import { buildApp } from "./build-app.js";
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

export default app;
