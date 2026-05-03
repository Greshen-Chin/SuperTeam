import type { Pool } from "pg";
export type User = {
  id: string;
  email: string | null;
  googleEmail: string | null;
  googleLinkedAt: string | null;
  walletAddress: string | null;
  walletLinkedAt: string | null;
  createdAt: string;
};

export function createAuthRepository(pool: Pool) {
  return {
    async createPasswordUser(input: { id: string; email: string; passwordHash: string }): Promise<User> {
      const result = await pool.query(
        "insert into users (id, email, password_hash) values ($1, $2, $3) returning *",
        [input.id, normalizeEmail(input.email), input.passwordHash]
      );
      return mapUser(result.rows[0]);
    },

    async findByEmail(email: string): Promise<(User & { passwordHash: string | null }) | null> {
      const result = await pool.query("select * from users where lower(email) = $1", [normalizeEmail(email)]);
      return result.rows[0] ? mapUserWithPassword(result.rows[0]) : null;
    },

    async findById(id: string): Promise<User | null> {
      const result = await pool.query("select * from users where id = $1", [id]);
      return result.rows[0] ? mapUser(result.rows[0]) : null;
    },

    async listUsers(): Promise<User[]> {
      const result = await pool.query("select * from users order by created_at desc limit 50");
      return result.rows.map(mapUser);
    },

    async upsertGoogleUser(input: { id: string; email: string; googleSub?: string | null }): Promise<User> {
      const email = normalizeEmail(input.email);
      const existing = await pool.query(
        "select * from users where lower(email) = $1 or lower(google_email) = $1 or ($2::text is not null and google_sub = $2)",
        [email, input.googleSub ?? null]
      );
      if (existing.rows[0]) return mapUser(existing.rows[0]);

      const result = await pool.query(
        "insert into users (id, email, google_sub, google_email, google_linked_at) values ($1, $2, $3, $2, now()) returning *",
        [input.id, email, input.googleSub ?? null]
      );
      return mapUser(result.rows[0]);
    },

    async upsertWalletUser(input: { id: string; walletAddress: string }): Promise<User> {
      const address = normalizeAddress(input.walletAddress);
      const existing = await pool.query("select * from users where wallet_address = $1 or lower(wallet_address) = lower($1)", [address]);
      if (existing.rows[0]) return mapUser(existing.rows[0]);

      const result = await pool.query(
        "insert into users (id, wallet_address, wallet_linked_at) values ($1, $2, now()) returning *",
        [input.id, address]
      );
      return mapUser(result.rows[0]);
    },

    async linkGoogle(input: { userId: string; email: string; googleSub?: string | null }): Promise<User> {
      const email = normalizeEmail(input.email);
      const result = await pool.query(
        "update users set google_email = $1, google_sub = coalesce($2, google_sub), google_linked_at = now(), email = coalesce(email, $1) where id = $3 returning *",
        [email, input.googleSub ?? null, input.userId]
      );

      if (!result.rows[0]) {
        throw new Error("User not found.");
      }

      return mapUser(result.rows[0]);
    },

    async linkWallet(input: { userId: string; walletAddress: string }): Promise<User> {
      const address = normalizeAddress(input.walletAddress);
      const result = await pool.query(
        "update users set wallet_address = $1, wallet_linked_at = now() where id = $2 returning *",
        [address, input.userId]
      );

      if (!result.rows[0]) {
        throw new Error("User not found.");
      }

      return mapUser(result.rows[0]);
    },

    async saveNonce(input: { address: string; nonce: string; expiredAt: Date }) {
      await pool.query(
        `
          insert into nonces (address, nonce, expired_at)
          values ($1, $2, $3)
          on conflict (address)
          do update set nonce = excluded.nonce, expired_at = excluded.expired_at, created_at = now()
        `,
        [normalizeAddress(input.address), input.nonce, input.expiredAt]
      );
    },

    async consumeNonce(input: { address: string; nonce: string }) {
      const result = await pool.query(
        "delete from nonces where address = $1 and nonce = $2 and expired_at > now() returning *",
        [normalizeAddress(input.address), input.nonce]
      );

      return Boolean(result.rows[0]);
    }
  };
}

export function normalizeAddress(address: string) {
  const cleanAddress = address.trim();
  return cleanAddress.toLowerCase().startsWith("0x") ? cleanAddress.toLowerCase() : cleanAddress;
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function mapUser(row: Record<string, unknown>): User {
  return {
    id: String(row.id),
    email: row.email == null ? null : String(row.email),
    googleEmail: row.google_email == null ? null : String(row.google_email),
    googleLinkedAt: row.google_linked_at == null ? null : new Date(String(row.google_linked_at)).toISOString(),
    walletAddress: row.wallet_address == null ? null : String(row.wallet_address),
    walletLinkedAt: row.wallet_linked_at == null ? null : new Date(String(row.wallet_linked_at)).toISOString(),
    createdAt: new Date(String(row.created_at)).toISOString()
  };
}

function mapUserWithPassword(row: Record<string, unknown>): User & { passwordHash: string | null } {
  return {
    ...mapUser(row),
    passwordHash: row.password_hash == null ? null : String(row.password_hash)
  };
}
