import type { Pool } from "pg";

export type User = {
  id: string;
  email: string | null;
  displayName: string | null;
  walletAddress: string | null;
  walletLinkedAt: string | null;
  createdAt: string;
};

export function createAuthRepository(pool: Pool) {
  return {
    async findById(id: string): Promise<User | null> {
      const result = await pool.query("select * from users where id = $1", [id]);
      return result.rows[0] ? mapUser(result.rows[0]) : null;
    },

    async listUsers(): Promise<User[]> {
      const result = await pool.query("select * from users order by created_at desc limit 50");
      return result.rows.map(mapUser);
    },

    async upsertWalletUser(input: { id: string; walletAddress: string; email?: string | null; displayName?: string | null }): Promise<User> {
      const address = normalizeAddress(input.walletAddress);
      const existing = await pool.query("select * from users where wallet_address = $1 or lower(wallet_address) = lower($1)", [address]);
      if (existing.rows[0]) return mapUser(existing.rows[0]);

      const result = await pool.query(
        "insert into users (id, wallet_address, wallet_linked_at, email, display_name) values ($1, $2, now(), $3, $4) returning *",
        [input.id, address, input.email ?? null, input.displayName ?? null]
      );
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

function mapUser(row: Record<string, unknown>): User {
  return {
    id: String(row.id),
    email: row.email == null ? null : String(row.email),
    displayName: row.display_name == null ? null : String(row.display_name),
    walletAddress: row.wallet_address == null ? null : String(row.wallet_address),
    walletLinkedAt: row.wallet_linked_at == null ? null : new Date(String(row.wallet_linked_at)).toISOString(),
    createdAt: new Date(String(row.created_at)).toISOString()
  };
}
