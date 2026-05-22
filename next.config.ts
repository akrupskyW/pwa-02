import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  // pg is a CommonJS Node module; mark it external so Next doesn't try to
  // bundle it into the edge/middleware traces.
  serverExternalPackages: ["pg"],
  // Allow any product image domain. Tighten in production.
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default config;
