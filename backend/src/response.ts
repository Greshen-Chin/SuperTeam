import type { FastifyReply, FastifyRequest } from "fastify";

export function ok<T>(request: FastifyRequest, data: T) {
  return {
    success: true,
    data,
    error: null,
    requestId: request.id
  };
}

export function fail(reply: FastifyReply, request: FastifyRequest, statusCode: number, code: string, message: string) {
  return reply.status(statusCode).send({
    success: false,
    data: null,
    error: { code, message },
    requestId: request.id
  });
}
