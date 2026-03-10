/**
 * Security headers configuration for Next.js.
 * Apply via next.config.ts headers() function.
 */

export const securityHeaders = [
  {
    // Apply to all routes
    source: "/(.*)",
    headers: [
      {
        key: "X-Frame-Options",
        value: "DENY",
      },
      {
        key: "X-Content-Type-Options",
        value: "nosniff",
      },
      {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
      },
      {
        key: "X-DNS-Prefetch-Control",
        value: "on",
      },
      {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
      },
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com https://accounts.google.com https://*.clerk.accounts.dev https://*.clerk.dev",
          "style-src 'self' 'unsafe-inline' https://*.clerk.accounts.dev https://*.clerk.dev",
          "img-src 'self' data: blob: https:",
          "font-src 'self' data: https://*.clerk.accounts.dev https://*.clerk.dev",
          "connect-src 'self' https://api.stripe.com https://*.clerk.accounts.dev https://*.clerk.dev https://api.resend.com https://*.ingest.sentry.io",
          "frame-src 'self' https://js.stripe.com https://accounts.google.com https://*.clerk.accounts.dev https://*.clerk.dev",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join("; "),
      },
    ],
  },
];
