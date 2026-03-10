import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import { securityHeaders } from "./src/lib/security/headers";

const nextConfig: NextConfig = {
  async headers() {
    return securityHeaders;
  },
};

export default withSentryConfig(nextConfig, {
  // Upload source maps only when SENTRY_AUTH_TOKEN is available (CI/CD)
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Delete source maps after upload so they aren't publicly accessible
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  // Suppress logs unless in CI
  silent: !process.env.CI,

  // Annotate React components for better stack traces (webpack only)
  webpack: {
    reactComponentAnnotation: { enabled: true },
  },
});
