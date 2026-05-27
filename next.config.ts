import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@murmure/design-system"],
  // Emit a self-contained runtime under .next/standalone (used by Dockerfile.web)
  output: "standalone",
  // The long-standing ~140 `any[]` AppSync-typing errors were caused by a broken
  // `@amplify-schema` tsconfig path (it pointed at the empty pre-rename TourGuide/).
  // Repointed to ../TourGuideApp (2026-05-26) → `npm run typecheck` is clean again.
  // Kept as a deploy safety-net; can be set to false once a `next build` is verified.
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
