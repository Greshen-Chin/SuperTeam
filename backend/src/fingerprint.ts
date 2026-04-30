import { createHash, randomUUID } from "node:crypto";
import type { MultipartFile } from "@fastify/multipart";
import type { Fingerprint } from "./schemas.js";

export async function fingerprintFromMultipart(file: MultipartFile): Promise<Fingerprint> {
  const buffer = await file.toBuffer();
  return createFingerprint(buffer);
}

export function createFingerprint(buffer: Buffer): Fingerprint {
  const sha256 = hash(buffer);
  const frameHashes = chunkHashes(buffer);
  const fingerprintRoot = hash(Buffer.from(frameHashes.join(":") || sha256));

  return {
    sha256,
    frameHashes,
    fingerprintRoot,
    duration: 0
  };
}

export function makeId(prefix: string) {
  return `${prefix}_${randomUUID().replaceAll("-", "").slice(0, 18)}`;
}

function hash(input: Buffer) {
  return createHash("sha256").update(input).digest("hex");
}

function chunkHashes(buffer: Buffer) {
  if (buffer.length === 0) return [];

  const chunkCount = Math.min(12, Math.max(1, Math.ceil(buffer.length / 256_000)));
  const chunkSize = Math.ceil(buffer.length / chunkCount);

  return Array.from({ length: chunkCount }, (_, index) => {
    const start = index * chunkSize;
    const end = Math.min(buffer.length, start + chunkSize);
    return hash(buffer.subarray(start, end));
  });
}
