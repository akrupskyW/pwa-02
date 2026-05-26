import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  // Disable the SW in dev so we don't fight HMR; enable when building.
  disable: process.env.NODE_ENV === "development",
  reloadOnOnline: true,
});

const config: NextConfig = {
  reactStrictMode: true,
  // Pin the workspace root since there are unrelated lockfiles in parent dirs.
  outputFileTracingRoot: __dirname,
  // Allow phone / LAN device testing against the dev server without the
  // Next 15.x cross-origin deprecation warning. Dev-only — production
  // requests go through the deployed origin and aren't affected.
  allowedDevOrigins: ["192.168.*.*", "10.10.*.*", "172.16.*.*", "*.local"],
  // pg is a CommonJS Node module; mark it external so Next doesn't try to
  // bundle it into the edge/middleware traces.
  serverExternalPackages: ["pg"],
  images: {
    // TODO(prod): tighten this to a known list of CDN hostnames before launch.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default withSerwist(config);
