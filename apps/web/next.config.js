/** @type {import('next').NextConfig} */
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig = {
  reactStrictMode: true,
  distDir: process.env.NEXT_DIST_DIR || (process.env.NODE_ENV === "production" ? ".next" : ".next-dev"),
  experimental: {
    typedRoutes: true,
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  hideSourceMaps: true,
});
