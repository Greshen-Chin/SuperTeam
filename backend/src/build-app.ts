import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import { config } from "./config.js";
import { pool } from "./db.js";
import { registerRoutes } from "./routes.js";
import { registerApiKeyRoutes } from "./routes/api-key-routes.js";
import { recordUsage } from "./api-keys.js";
import type { ApiKey } from "./api-keys.js";

declare module "fastify" {
  interface FastifyRequest {
    __apiKey?: ApiKey;
  }
}

export async function buildApp(opts: { logger?: boolean | object } = {}): Promise<FastifyInstance> {
  const logger = opts.logger !== undefined
    ? opts.logger
    : {
        level: config.logLevel,
        redact: ["req.headers.authorization", "req.headers['x-api-key']"],
        serializers: {
          req(r: { id: string; method: string; url: string; ip: string }) {
            return { id: r.id, method: r.method, url: r.url, ip: r.ip };
          }
        }
      };

  const app = Fastify({
    logger,
    genReqId: () => `req_${Date.now()}_${Math.random().toString(16).slice(2)}`
  });

  app.addHook("onRequest", async (_request, reply) => {
    void reply
      .header("X-Content-Type-Options", "nosniff")
      .header("X-Frame-Options", "DENY")
      .header("Referrer-Policy", "no-referrer")
      .header("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()")
      .header("Cross-Origin-Resource-Policy", "same-site")
      .header("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
  });

  app.setErrorHandler((error: unknown, request, reply) => {
    const statusCode = getErrorStatusCode(error);
    request.log.error({ err: error }, "request failed");
    void reply.status(statusCode).send({
      success: false,
      error: {
        code: getErrorCode(error),
        message: statusCode < 500 ? getErrorMessage(error) : "Internal server error."
      },
      requestId: request.id,
      timestamp: new Date().toISOString()
    });
  });

  app.addHook("onResponse", async (request, reply) => {
    request.log.info(
      {
        requestId: request.id,
        route: (request.routeOptions as { url?: string })?.url ?? request.url,
        status: reply.statusCode,
        durationMs: Math.round(reply.elapsedTime)
      },
      "request completed"
    );

    const apiKey = request.__apiKey;
    if (apiKey && pool) {
      recordUsage(
        pool,
        apiKey.id,
        (request.routeOptions as { url?: string })?.url ?? request.url,
        reply.statusCode
      ).catch(() => {});
    }
  });

  await app.register(cors, {
    origin: (origin, cb) => {
      const allowed = [config.frontendOrigin, "http://localhost:3000", "http://127.0.0.1:3000"];
      const isDevLocalhost = !!origin && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
      if (!origin || allowed.includes(origin) || isDevLocalhost) {
        cb(null, true);
      } else {
        cb(new Error("Not allowed"), false);
      }
    },
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "Origin", "X-Api-Key"],
    credentials: true,
    optionsSuccessStatus: 204
  });
  await app.register(rateLimit, {
    global: true,
    max: 240,
    timeWindow: "1 minute",
    keyGenerator: (req) => req.ip
  });
  await app.register(multipart, {
    limits: { fileSize: 250 * 1024 * 1024 }
  });

  await registerRoutes(app);
  await registerApiKeyRoutes(app);

  return app;
}

function getErrorStatusCode(error: unknown): number {
  if (typeof error === "object" && error !== null && "statusCode" in error && typeof error.statusCode === "number") {
    return error.statusCode >= 400 ? error.statusCode : 500;
  }
  return 500;
}

function getErrorCode(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error && typeof error.code === "string") {
    return error.code;
  }
  return "INTERNAL";
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Request failed.";
}
