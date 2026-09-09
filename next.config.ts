import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // Baked into the client bundle so a frozen PWA can compare its own
    // build against /api/build-id (which always reflects the live
    // deploy) and reload itself — see StaleBuildReload.
    NEXT_PUBLIC_BUILD_ID: process.env.VERCEL_GIT_COMMIT_SHA ?? "dev",
  },
};

export default nextConfig;
