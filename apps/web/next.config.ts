import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The data package is TypeScript source; Next compiles it with the app.
  transpilePackages: ["@albiceleste/data"],
  // DuckDB is a native module used only at build time (every page is static). Keep it out of the bundle.
  serverExternalPackages: ["@duckdb/node-api"],
  typedRoutes: true,
  // The site-chromed 404 for URLs outside every route (app/global-not-found.tsx).
  experimental: { globalNotFound: true },
  async redirects() {
    return [
      { source: "/", destination: "/es", permanent: false },
      // Anything outside a locale (and outside the static data routes) goes to the Spanish edition.
      { source: "/:path((?!es(?:/|$)|en(?:/|$)|data/|_next/|favicon).*)", destination: "/es/:path", permanent: false },
    ];
  },
};

export default nextConfig;
