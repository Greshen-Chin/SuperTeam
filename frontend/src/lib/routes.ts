export const routes = {
  home: "/",
  login: "/login",
  wallet: "/wallet",
  users: "/users",
  dashboard: "/dashboard",
  collection: "/collection",
  register: "/register",
  check: "/check",
  nftStorage: "/nft-storage",
  videoStorage: "/video-storage",
  verify: "/verify",
  certificate: (id: string) => `/certificate/${id}`,
  cert: (mintAddress: string) => `/cert/${mintAddress}`
};
