import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingRoot: frontendRoot,

  // Tree-shake icon and animation libraries; only bundle what's actually imported.
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion", "@tsparticles/react", "@tsparticles/slim"]
  },

  // Enable Next.js image optimization for external sources used in the app.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" }
    ],
    formats: ["image/avif", "image/webp"]
  },

  // Strip console.log in production builds, but keep console.error/warn.
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false
  }
};

export default nextConfig;
