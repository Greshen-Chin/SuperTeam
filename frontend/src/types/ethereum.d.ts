type SolanaProvider = {
  isPhantom?: boolean;
  publicKey?: { toString(): string };
  connect(): Promise<{ publicKey: { toString(): string } }>;
  signMessage(message: Uint8Array, encoding?: "utf8"): Promise<{ signature: Uint8Array }>;
};

interface Window {
  phantom?: {
    solana?: SolanaProvider;
  };
  solana?: SolanaProvider;
  google?: {
    accounts: {
      oauth2: {
        initTokenClient(config: {
          client_id: string;
          scope: string;
          prompt?: string;
          callback: (response: { access_token?: string; error?: string }) => void;
        }): {
          requestAccessToken(): void;
        };
      };
    };
  };
}
