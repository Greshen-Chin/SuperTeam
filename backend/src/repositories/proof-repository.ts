import type { Pool } from "pg";
import type { Proof, RegisterProofInput } from "../schemas.js";

export function createProofRepository(pool: Pool) {
  return {
    async create(input: RegisterProofInput): Promise<Proof> {
      const id = input.id ?? `proof_${Date.now()}`;
      const phashBucket0 = computePhashBucket0(input.fingerprint.frameHashes);
      const result = await pool.query(
        `
          insert into proofs (
            id, title, description, creator_wallet, creator_handle, sha256, phash,
            frame_hashes, fingerprint_root, duration, solana_signature,
            metadata_uri, ipfs_video_uri, ipfs_thumbnail_uri,
            license_fee_lamports, license_model, license_split,
            phash_bucket0, status
          )
          values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb,$18,$19)
          returning *
        `,
        [
          id,
          input.title,
          input.description ?? null,
          input.creatorWallet,
          input.creatorHandle ?? null,
          input.fingerprint.sha256,
          input.fingerprint.phash ?? null,
          JSON.stringify(input.fingerprint.frameHashes),
          input.fingerprint.fingerprintRoot,
          input.fingerprint.duration,
          input.solanaSignature,
          input.metadataUri ?? null,
          input.ipfsVideoUri ?? null,
          input.ipfsThumbnailUri ?? null,
          input.licenseFeeLamports,
          input.licenseModel,
          input.licenseSplit ? JSON.stringify(input.licenseSplit) : null,
          phashBucket0,
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
      const result = await pool.query("select * from proofs where sha256 = $1 order by registered_at desc limit 1", [sha256]);
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
           order by registered_at desc limit $3`,
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

    async findListed(opts: { cursor?: string; limit: number; excludeWallet?: string }): Promise<{ proofs: Proof[]; nextCursor: string | null }> {
      const limit = Math.min(opts.limit, 50);
      let rows: Record<string, unknown>[];

      if (opts.cursor && opts.excludeWallet) {
        const result = await pool.query(
          `select * from proofs
           where license_fee_lamports > 0 and status = 'active'
             and creator_wallet != $1
             and registered_at < (select registered_at from proofs where id = $2)
           order by registered_at desc limit $3`,
          [opts.excludeWallet, opts.cursor, limit + 1]
        );
        rows = result.rows;
      } else if (opts.cursor) {
        const result = await pool.query(
          `select * from proofs
           where license_fee_lamports > 0 and status = 'active'
             and registered_at < (select registered_at from proofs where id = $1)
           order by registered_at desc limit $2`,
          [opts.cursor, limit + 1]
        );
        rows = result.rows;
      } else if (opts.excludeWallet) {
        const result = await pool.query(
          `select * from proofs
           where license_fee_lamports > 0 and status = 'active'
             and creator_wallet != $1
           order by registered_at desc limit $2`,
          [opts.excludeWallet, limit + 1]
        );
        rows = result.rows;
      } else {
        const result = await pool.query(
          `select * from proofs
           where license_fee_lamports > 0 and status = 'active'
           order by registered_at desc limit $1`,
          [limit + 1]
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
    },

    async findCandidatesByBuckets(buckets: number[], limit = 200): Promise<Proof[]> {
      if (!buckets.length) return this.findCandidates(limit);
      const result = await pool.query(
        `select * from proofs
         where status = 'active' and phash_bucket0 = ANY($1::smallint[])
         order by registered_at desc limit $2`,
        [buckets, limit]
      );
      return result.rows.map(mapProof);
    },

    async updateMetadataUri(id: string, metadataUri: string): Promise<void> {
      await pool.query("update proofs set metadata_uri = $1 where id = $2", [metadataUri, id]);
    },

    async updateLicenseTerms(
      id: string,
      terms: { licenseFeeLamports: number; licenseModel: string; licenseSplit: unknown }
    ): Promise<Proof | null> {
      const result = await pool.query(
        `update proofs set license_fee_lamports = $1, license_model = $2, license_split = $3::jsonb
         where id = $4 returning *`,
        [
          terms.licenseFeeLamports,
          terms.licenseModel,
          terms.licenseSplit ? JSON.stringify(terms.licenseSplit) : null,
          id
        ]
      );
      return result.rows[0] ? mapProof(result.rows[0]) : null;
    },

    async countByCreator(wallet: string): Promise<number> {
      const result = await pool.query(
        "select count(*) as cnt from proofs where creator_wallet = $1 and status = 'active'",
        [wallet]
      );
      return Number(result.rows[0]?.cnt ?? 0);
    }
  };
}

function computePhashBucket0(frameHashes: string[]): number | null {
  const firstChar = frameHashes[0]?.[0];
  return firstChar != null ? parseInt(firstChar, 16) : null;
}

function mapProof(row: Record<string, unknown>): Proof {
  return {
    id: String(row.id),
    title: String(row.title),
    description: nullStr(row.description),
    creatorWallet: String(row.creator_wallet),
    creatorHandle: nullStr(row.creator_handle),
    sha256: String(row.sha256),
    phash: nullStr(row.phash),
    frameHashes: Array.isArray(row.frame_hashes) ? row.frame_hashes.map(String) : [],
    fingerprintRoot: String(row.fingerprint_root),
    duration: Number(row.duration ?? 0),
    solanaSignature: String(row.solana_signature),
    mintAddress: nullStr(row.mint_address),
    metadataUri: nullStr(row.metadata_uri),
    ipfsVideoUri: nullStr(row.ipfs_video_uri),
    ipfsThumbnailUri: nullStr(row.ipfs_thumbnail_uri),
    licenseFeeLamports: Number(row.license_fee_lamports ?? 0),
    licenseModel: (row.license_model as Proof["licenseModel"]) ?? "flat",
    licenseSplit: row.license_split == null ? null : (row.license_split as Proof["licenseSplit"]),
    registeredAt: new Date(String(row.registered_at)).toISOString(),
    status: row.status as Proof["status"]
  };
}

function nullStr(value: unknown) {
  return value == null ? undefined : String(value);
}
