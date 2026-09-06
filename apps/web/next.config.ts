import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The data package is TypeScript source; Next compiles it with the app.
  transpilePackages: ["@albiceleste/data"],
  // DuckDB is a native module used only at build time (every page is static). Keep it out of the bundle.
  serverExternalPackages: ["@duckdb/node-api"],
  typedRoutes: true,
};

export default nextConfig;
