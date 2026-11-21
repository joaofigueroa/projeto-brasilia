import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: { root: process.cwd() },
  logging: { serverFunctions: false },
  serverExternalPackages: ["@electric-sql/pglite"],
  experimental: { serverActions: { bodySizeLimit: "2mb" } },
};

export default nextConfig;
