import type { Pool } from "pg";
import type { VerificationResult } from "../schemas.js";

type CreateVerificationInput = VerificationResult & {
  id: string;
  uploadedSha256: string;
  uploadedFingerprintRoot: string;
};

export function createVerificationRepository(pool: Pool) {
  return {
    async create(input: CreateVerificationInput) {
      const result = await pool.query(
        `
          insert into verifications (
            id, uploaded_sha256, uploaded_fingerprint_root, match_type,
            confidence, matched_proof_id, certificate_url
          )
          values ($1, $2, $3, $4, $5, $6, $7)
          returning *
        `,
        [
          input.id,
          input.uploadedSha256,
          input.uploadedFingerprintRoot,
          input.matchType,
          input.confidence,
          input.matchedProofId,
          input.certificateUrl
        ]
      );

      return result.rows[0];
    },

    async findByProofId(proofId: string) {
      const result = await pool.query(
        "select * from verifications where matched_proof_id = $1 order by created_at desc limit 25",
        [proofId]
      );
      return result.rows;
    }
  };
}
