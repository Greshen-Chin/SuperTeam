type ApiResponse<T> = {
  success: boolean;
  data: T | null;
  error: { code: string; message: string } | null;
  requestId: string;
};

export type AuthUser = {
  id: string;
  email: string | null;
  googleEmail: string | null;
  googleLinkedAt: string | null;
  walletAddress: string | null;
  walletLinkedAt: string | null;
  createdAt: string;
};

export type AuthResult = {
  access_token: string;
  user: AuthUser;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

export function hasBackendAuth() {
  return Boolean(apiBaseUrl);
}

export async function registerWithPassword(input: { email: string; password: string }) {
  return postAuth<AuthResult>("/auth/register", input);
}

export async function loginWithPassword(input: { email: string; password: string }) {
  return postAuth<AuthResult>("/auth/login", input);
}

export async function loginWithGoogleToken(token: string) {
  return postAuth<AuthResult>("/auth/google", { token });
}

export async function linkGoogleToken(input: { token: string; accessToken: string }) {
  return postAuth<AuthResult>("/auth/link-google", { token: input.token }, input.accessToken);
}

export async function requestWalletNonce(address: string) {
  let response: Response;

  try {
    response = await fetch(`${requiredApiBaseUrl()}/auth/nonce?address=${encodeURIComponent(address)}`);
  } catch {
    throw new Error("Backend auth belum jalan di http://localhost:4000. Jalankan: cd backend lalu npm run dev.");
  }

  return readApiResponse<{ nonce: string }>(response);
}

export async function loginWithWallet(input: { address: string; signature: string; nonce: string }) {
  return postAuth<AuthResult>("/auth/wallet", input);
}

export async function linkWallet(input: { address: string; signature: string; nonce: string; token: string }) {
  return postAuth<AuthResult>(
    "/auth/link-wallet",
    {
      address: input.address,
      signature: input.signature,
      nonce: input.nonce
    },
    input.token
  );
}

export async function getCurrentUser(token: string) {
  let response: Response;

  try {
    response = await fetch(`${requiredApiBaseUrl()}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  } catch {
    throw new Error("Backend auth belum jalan di http://localhost:4000.");
  }

  return readApiResponse<{ user: AuthUser }>(response);
}

export async function listUsers(token: string) {
  let response: Response;

  try {
    response = await fetch(`${requiredApiBaseUrl()}/users`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  } catch {
    throw new Error("Backend auth belum jalan di http://localhost:4000.");
  }

  return readApiResponse<{ users: AuthUser[] }>(response);
}

export function persistAuth(result: AuthResult) {
  localStorage.setItem("vidchain_access_token", result.access_token);
  localStorage.setItem("vidchain_user", JSON.stringify(result.user));
  document.cookie = `vidchain_session=${encodeURIComponent(result.access_token)}; path=/; max-age=604800; samesite=lax`;
}

export function getAccessToken() {
  return localStorage.getItem("vidchain_access_token");
}

async function postAuth<T>(path: string, body: unknown, token?: string) {
  let response: Response;

  try {
    response = await fetch(`${requiredApiBaseUrl()}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(body)
    });
  } catch {
    throw new Error("Backend auth belum jalan di http://localhost:4000. Jalankan: cd backend lalu npm run dev.");
  }

  return readApiResponse<T>(response);
}

async function readApiResponse<T>(response: Response): Promise<T> {
  let payload: ApiResponse<T>;

  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    throw new Error(`Backend returned ${response.status}. Response was not valid JSON.`);
  }

  if (!response.ok || !payload.success || !payload.data) {
    if (payload.error?.code === "DATABASE_UNAVAILABLE") {
      throw new Error("Database Supabase belum bisa diakses. Pakai connection string Transaction Pooler/IPv4 di backend/.env, lalu restart backend.");
    }

    throw new Error(payload.error?.message ?? "Authentication failed.");
  }

  return payload.data;
}

function requiredApiBaseUrl() {
  if (!apiBaseUrl) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured.");
  }

  return apiBaseUrl;
}
