import type { Pool } from "pg";
import type { License } from "../schemas.js";
import type { z } from "zod";
import type { createLicenseSchema, licenseTermsSchema } from "../schemas.js";

type CreateLicenseInput = z.infer<typeof createLicenseSchema>;
type LicenseTerms = z.infer<typeof licenseTermsSchema>;
type PageOpts = { cursor?: string; limit: number };
type Page<T> = { items: T[]; nextCursor: string | null };

export function createLicenseRepository(pool: Pool) {
  return {
    async create(input: CreateLicenseInput, sellerWallet: string, terms: LicenseTerms): Promise<License> {
      const id = `lic_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const result = await pool.query(
        `insert into licenses
           (id, proof_id, buyer_wallet, seller_wallet, license_model, fee_lamports,
            split_config, license_token_mint, solana_signature)
         values ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9) returning *`,
        [
          id,
          input.proofId,
          input.buyerWallet,
          sellerWallet,
          terms.licenseModel,
          input.feeLamports,
          terms.splitConfig ? JSON.stringify(terms.splitConfig) : null,
          input.licenseTokenMint ?? null,
          input.solanaSignature
        ]
      );
      if (!result.rows[0]) throw new Error("Failed to create license record.");
      return mapLicense(result.rows[0]);
    },

    async findById(id: string): Promise<License | null> {
      const result = await pool.query("select * from licenses where id = $1", [id]);
      return result.rows[0] ? mapLicense(result.rows[0]) : null;
    },

    async findByBuyer(wallet: string, opts: PageOpts): Promise<Page<License>> {
      const limit = Math.min(opts.limit, 50);
      let rows: Record<string, unknown>[];

      if (opts.cursor) {
        const r = await pool.query(
          `select * from licenses
           where buyer_wallet = $1 and created_at < (select created_at from licenses where id = $2)
           order by created_at desc limit $3`,
          [wallet, opts.cursor, limit + 1]
        );
        rows = r.rows;
      } else {
        const r = await pool.query(
          "select * from licenses where buyer_wallet = $1 order by created_at desc limit $2",
          [wallet, limit + 1]
        );
        rows = r.rows;
      }

      const hasMore = rows.length > limit;
      const page = hasMore ? rows.slice(0, limit) : rows;
      return {
        items: page.map(mapLicense),
        nextCursor: hasMore && page.at(-1) ? String(page.at(-1)!.id) : null
      };
    },

    async findByProof(proofId: string): Promise<License[]> {
      const result = await pool.query(
        "select * from licenses where proof_id = $1 order by created_at desc",
        [proofId]
      );
      return result.rows.map(mapLicense);
    },

    async findBySignature(sig: string): Promise<License | null> {
      const result = await pool.query(
        "select * from licenses where solana_signature = $1 limit 1",
        [sig]
      );
      return result.rows[0] ? mapLicense(result.rows[0]) : null;
    }
  };
}

function mapLicense(row: Record<string, unknown>): License {
  return {
    id: String(row.id),
    proofId: String(row.proof_id),
    buyerWallet: String(row.buyer_wallet),
    sellerWallet: String(row.seller_wallet),
    licenseModel: String(row.license_model) as License["licenseModel"],
    feeLamports: Number(row.fee_lamports),
    splitConfig: row.split_config == null ? null : (row.split_config as License["splitConfig"]),
    licenseTokenMint: row.license_token_mint == null ? null : String(row.license_token_mint),
    solanaSignature: String(row.solana_signature),
    status: String(row.status) as License["status"],
    createdAt: new Date(String(row.created_at)).toISOString()
  };
}
