import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@murmure/design-system"],
  // Emit a self-contained runtime under .next/standalone (used by Dockerfile.web)
  output: "standalone",
};

export default nextConfig;
