import type { Pool } from "pg";
import type { Proof, RegisterProofInput } from "../schemas.js";

export function createProofRepository(pool: Pool) {
  return {
    async create(input: RegisterProofInput): Promise<Proof> {
      const id = input.id ?? `proof_${Date.now()}`;
      const result = await pool.query(
        `
          insert into proofs (
            id, title, description, creator_wallet, creator_handle, sha256,
            frame_hashes, fingerprint_root, duration, solana_signature, metadata_uri, status
          )
          values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11, $12)
          returning *
        `,
        [
          id,
          input.title,
          input.description ?? null,
          input.creatorWallet,
          input.creatorHandle ?? null,
          input.fingerprint.sha256,
          JSON.stringify(input.fingerprint.frameHashes),
          input.fingerprint.fingerprintRoot,
          input.fingerprint.duration,
          input.solanaSignature,
          input.metadataUri ?? null,
          input.status
        ]
      );

      return mapProof(result.rows[0]);
    },

    async findById(id: string): Promise<Proof | null> {
      const result = await pool.query("select * from proofs where id = $1", [id]);
      return result.rows[0] ? mapProof(result.rows[0]) : null;
    },

    async findCandidates(limit = 50): Promise<Proof[]> {
      const result = await pool.query(
        "select * from proofs where status = 'active' order by registered_at desc limit $1",
        [limit]
      );
      return result.rows.map(mapProof);
    }
  };
}

function mapProof(row: Record<string, unknown>): Proof {
  return {
    id: String(row.id),
    title: String(row.title),
    description: nullableString(row.description),
    creatorWallet: String(row.creator_wallet),
    creatorHandle: nullableString(row.creator_handle),
    sha256: String(row.sha256),
    frameHashes: Array.isArray(row.frame_hashes) ? row.frame_hashes.map(String) : [],
    fingerprintRoot: String(row.fingerprint_root),
    duration: Number(row.duration ?? 0),
    solanaSignature: String(row.solana_signature),
    metadataUri: nullableString(row.metadata_uri),
    registeredAt: new Date(String(row.registered_at)).toISOString(),
    status: row.status as Proof["status"]
  };
}

function nullableString(value: unknown) {
  return value == null ? undefined : String(value);
}
