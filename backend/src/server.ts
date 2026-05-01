import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import { config } from "./config.js";
import { migrate } from "./db.js";
import { registerRoutes } from "./routes.js";

const app = Fastify({
  logger: true,
  genReqId: () => `req_${Date.now()}_${Math.random().toString(16).slice(2)}`
});

await app.register(cors, {
  origin: [config.frontendOrigin, "http://localhost:3000", "http://127.0.0.1:3000"],
  credentials: true
});
await app.register(rateLimit, {
  global: false,
  keyGenerator: (req) => req.ip
});
await app.register(multipart, {
  limits: {
    fileSize: 250 * 1024 * 1024
  }
});
await registerRoutes(app);

try {
  await migrate();
} catch (error) {
  app.log.warn({ error }, "PostgreSQL/Supabase migration failed. Database-backed auth will return DATABASE_UNAVAILABLE until DATABASE_URL is valid.");
}

try {
  await app.listen({ host: config.host, port: config.port });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
