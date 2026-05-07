import type { NextConfig } from "next";

const config: NextConfig = {
  env: {
    NEXT_PUBLIC_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA ?? 'dev',
  },
  serverExternalPackages: ['edge-tts-universal'],
};

export default config;
