import type { Pool } from "pg";
import type { Proof, RegisterProofInput } from "../schemas.js";

export function createProofRepository(pool: Pool) {
  return {
    async create(input: RegisterProofInput): Promise<Proof> {
      const existing = await pool.query(
        "select * from proofs where sha256 = $1 limit 1",
        [input.fingerprint.sha256]
      );
      if (existing.rows[0]) return mapProof(existing.rows[0]);

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

      if (!result.rows[0]) throw new Error("Failed to create proof record.");
      return mapProof(result.rows[0]);
    },

    async findById(id: string): Promise<Proof | null> {
      const result = await pool.query("select * from proofs where id = $1", [id]);
      return result.rows[0] ? mapProof(result.rows[0]) : null;
    },

    async findBySha256(sha256: string): Promise<Proof | null> {
      const result = await pool.query("select * from proofs where sha256 = $1 limit 1", [sha256]);
      return result.rows[0] ? mapProof(result.rows[0]) : null;
    },

    async findByCreatorWallet(
      wallet: string,
      opts: { cursor?: string; limit: number }
    ): Promise<{ proofs: Proof[]; nextCursor: string | null }> {
      const limit = Math.min(opts.limit, 50);
      let rows: Record<string, unknown>[];

      if (opts.cursor) {
        const result = await pool.query(
          `select * from proofs
           where creator_wallet = $1 and registered_at < (
             select registered_at from proofs where id = $2
           )
           order by registered_at desc
           limit $3`,
          [wallet, opts.cursor, limit + 1]
        );
        rows = result.rows;
      } else {
        const result = await pool.query(
          "select * from proofs where creator_wallet = $1 order by registered_at desc limit $2",
          [wallet, limit + 1]
        );
        rows = result.rows;
      }

      const hasMore = rows.length > limit;
      const page = hasMore ? rows.slice(0, limit) : rows;
      const nextCursor = hasMore && page.at(-1) ? String(page.at(-1)!.id) : null;

      return { proofs: page.map(mapProof), nextCursor };
    },

    async findCandidates(limit = 200): Promise<Proof[]> {
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
