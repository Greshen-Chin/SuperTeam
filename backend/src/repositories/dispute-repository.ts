import type { Pool } from "pg";
import type { Dispute } from "../schemas.js";
import type { z } from "zod";
import type { fileDisputeSchema, respondDisputeSchema, resolveDisputeSchema } from "../schemas.js";

type FileDisputeInput = z.infer<typeof fileDisputeSchema>;
type RespondInput = z.infer<typeof respondDisputeSchema>;
type ResolveInput = z.infer<typeof resolveDisputeSchema>;
type PageOpts = { cursor?: string; limit: number };
type Page<T> = { items: T[]; nextCursor: string | null };

export type DisputeCounts = {
  totalAsAccused: number;
  unresolvedAsAccused: number;
  resolvedAgainst: number;
  dismissed: number;
  totalAsClaimant: number;
};

export function createDisputeRepository(pool: Pool) {
  return {
    async create(input: FileDisputeInput, claimantWallet: string): Promise<Dispute> {
      const id = `dis_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const responseDeadline = new Date(Date.now() + 72 * 60 * 60 * 1000);
      const result = await pool.query(
        `insert into disputes
           (id, proof_id, claimant_wallet, accused_wallet, accused_url,
            reason, evidence, filing_signature, response_deadline)
         values ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9) returning *`,
        [
          id,
          input.proofId,
          claimantWallet,
          input.accusedWallet,
          input.accusedUrl ?? null,
          input.reason,
          input.evidence != null ? JSON.stringify(input.evidence) : null,
          input.filingSignature,
          responseDeadline
        ]
      );
      if (!result.rows[0]) throw new Error("Failed to create dispute record.");
      return mapDispute(result.rows[0]);
    },

    async findById(id: string): Promise<Dispute | null> {
      const result = await pool.query("select * from disputes where id = $1", [id]);
      return result.rows[0] ? mapDispute(result.rows[0]) : null;
    },

    async findByProof(proofId: string): Promise<Dispute[]> {
      const result = await pool.query(
        "select * from disputes where proof_id = $1 order by created_at desc",
        [proofId]
      );
      return result.rows.map(mapDispute);
    },

    async findByWallet(
      wallet: string,
      role: "claimant" | "accused" | "any",
      opts: PageOpts
    ): Promise<Page<Dispute>> {
      const limit = Math.min(opts.limit, 50);

      const whereClause =
        role === "claimant"
          ? "claimant_wallet = $1"
          : role === "accused"
            ? "accused_wallet = $1"
            : "(claimant_wallet = $1 or accused_wallet = $1)";

      let rows: Record<string, unknown>[];

      if (opts.cursor) {
        const r = await pool.query(
          `select * from disputes
           where ${whereClause} and created_at < (select created_at from disputes where id = $2)
           order by created_at desc limit $3`,
          [wallet, opts.cursor, limit + 1]
        );
        rows = r.rows;
      } else {
        const r = await pool.query(
          `select * from disputes where ${whereClause} order by created_at desc limit $2`,
          [wallet, limit + 1]
        );
        rows = r.rows;
      }

      const hasMore = rows.length > limit;
      const page = hasMore ? rows.slice(0, limit) : rows;
      return {
        items: page.map(mapDispute),
        nextCursor: hasMore && page.at(-1) ? String(page.at(-1)!.id) : null
      };
    },

    async recordResponse(id: string, accusedWallet: string, input: RespondInput): Promise<Dispute> {
      const result = await pool.query(
        `update disputes
         set response_text = $1, response_signature = $2, status = 'responded', updated_at = now()
         where id = $3 and accused_wallet = $4 returning *`,
        [input.responseText, input.responseSignature, id, accusedWallet]
      );
      if (!result.rows[0]) throw new Error("Dispute not found or caller is not the accused.");
      return mapDispute(result.rows[0]);
    },

    async recordResolution(id: string, input: ResolveInput): Promise<Dispute> {
      const result = await pool.query(
        `update disputes
         set resolution = $1, resolution_note = $2, resolution_signature = $3,
             status = $1, updated_at = now()
         where id = $4 returning *`,
        [input.resolution, input.note, input.resolutionSignature, id]
      );
      if (!result.rows[0]) throw new Error("Dispute not found.");
      return mapDispute(result.rows[0]);
    },

    async expireOpenDisputes(): Promise<number> {
      const result = await pool.query(
        `update disputes set status = 'expired', updated_at = now()
         where status = 'open' and response_deadline < now()`
      );
      return result.rowCount ?? 0;
    },

    async findBySignature(signature: string): Promise<Dispute | null> {
      const result = await pool.query(
        "select * from disputes where filing_signature = $1 limit 1",
        [signature]
      );
      return result.rows[0] ? mapDispute(result.rows[0]) : null;
    },

    async countsForWallet(wallet: string): Promise<DisputeCounts> {
      const result = await pool.query(
        `select
           count(*) filter (where accused_wallet = $1) as total_as_accused,
           count(*) filter (where accused_wallet = $1 and status in ('open','responded')) as unresolved_as_accused,
           count(*) filter (where accused_wallet = $1 and status = 'resolved') as resolved_against,
           count(*) filter (where accused_wallet = $1 and status = 'dismissed') as dismissed,
           count(*) filter (where claimant_wallet = $1) as total_as_claimant
         from disputes
         where claimant_wallet = $1 or accused_wallet = $1`,
        [wallet]
      );
      const row = result.rows[0] ?? {};
      return {
        totalAsAccused: Number(row.total_as_accused ?? 0),
        unresolvedAsAccused: Number(row.unresolved_as_accused ?? 0),
        resolvedAgainst: Number(row.resolved_against ?? 0),
        dismissed: Number(row.dismissed ?? 0),
        totalAsClaimant: Number(row.total_as_claimant ?? 0)
      };
    }
  };
}

function mapDispute(row: Record<string, unknown>): Dispute {
  return {
    id: String(row.id),
    proofId: String(row.proof_id),
    claimantWallet: String(row.claimant_wallet),
    accusedWallet: String(row.accused_wallet),
    accusedUrl: row.accused_url == null ? undefined : String(row.accused_url),
    reason: String(row.reason),
    evidence: row.evidence ?? null,
    filingSignature: String(row.filing_signature),
    filingFeeLamports: Number(row.filing_fee_lamports ?? 10_000_000),
    responseDeadline: new Date(String(row.response_deadline)).toISOString(),
    responseText: row.response_text == null ? null : String(row.response_text),
    responseSignature: row.response_signature == null ? null : String(row.response_signature),
    resolution: row.resolution == null ? null : (String(row.resolution) as Dispute["resolution"]),
    resolutionNote: row.resolution_note == null ? null : String(row.resolution_note),
    resolutionSignature: row.resolution_signature == null ? null : String(row.resolution_signature),
    status: String(row.status) as Dispute["status"],
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString()
  };
}
