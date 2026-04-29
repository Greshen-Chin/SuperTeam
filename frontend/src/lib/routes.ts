export const routes = {
  home: "/",
  dashboard: "/dashboard",
  register: "/register",
  verify: "/verify",
  certificate: (id: string) => `/certificate/${id}`
};
