import { createPublicKey, randomBytes, verify as verifyEd25519 } from "node:crypto";
import jwt from "jsonwebtoken";
import bs58 from "bs58";
import { config } from "./config.js";
import type { User } from "./repositories/auth-repository.js";
import { normalizeAddress } from "./repositories/auth-repository.js";

export function createNonce() {
  return randomBytes(24).toString("hex");
}

export function createLoginMessage(nonce: string) {
  return `Login nonce: ${nonce}`;
}

export function signAccessToken(user: User) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      wallet_address: user.walletAddress
    },
    config.jwtSecret,
    { expiresIn: "1h" }
  );
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, config.jwtSecret) as jwt.JwtPayload;
}

export function verifyWalletSignature(input: { address: string; nonce: string; signature: string }) {
  try {
    const publicKeyBytes = bs58.decode(input.address);
    const signatureBytes = bs58.decode(input.signature);

    if (publicKeyBytes.length !== 32 || signatureBytes.length !== 64) {
      return false;
    }

    const spkiPrefix = Buffer.from("302a300506032b6570032100", "hex");
    const publicKey = createPublicKey({
      key: Buffer.concat([spkiPrefix, Buffer.from(publicKeyBytes)]),
      format: "der",
      type: "spki"
    });

    return verifyEd25519(null, Buffer.from(createLoginMessage(input.nonce)), publicKey, Buffer.from(signatureBytes));
  } catch {
    return false;
  }
}
