import type { Fingerprint } from "@/shared/schemas";

async function hashFile(file: File) {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function createDemoFrameHashes(hash: string, frameCount: number) {
  return Array.from({ length: frameCount }, (_, index) => {
    const start = (index * 8) % Math.max(hash.length - 8, 1);
    return hash.slice(start, start + 16).padEnd(16, "0");
  });
}

export async function createLocalFingerprint(file: File): Promise<Fingerprint> {
  const sha256 = await hashFile(file);
  const frameCount = Math.max(4, Math.min(16, Math.ceil(file.size / 250_000)));
  const frameHashes = createDemoFrameHashes(sha256, frameCount);

  return {
    sha256,
    frameHashes,
    fingerprintRoot: `fp_${sha256.slice(0, 24)}`,
    duration: 12.4
  };
}

