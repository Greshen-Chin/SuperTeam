export const routes = {
  home: "/",
  login: "/login",
  wallet: "/wallet",
  users: "/users",
  dashboard: "/dashboard",
  register: "/register",
  verify: "/verify",
  certificate: (id: string) => `/certificate/${id}`,
  cert: (mintAddress: string) => `/cert/${mintAddress}`
};
