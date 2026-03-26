import { z } from "zod/v4";

const serverSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1),

  // Clerk
  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_WEBHOOK_SECRET: z.string().min(1),

  // Stripe
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  STRIPE_PRICE_STARTER: z.string().min(1),
  STRIPE_PRICE_GROWTH: z.string().min(1),

  // Resend
  RESEND_API_KEY: z.string().min(1),
  RESEND_WEBHOOK_SECRET: z.string().min(1),

  // QuickBooks
  QBO_CLIENT_ID: z.string().min(1),
  QBO_CLIENT_SECRET: z.string().min(1),
  QBO_REDIRECT_URI: z.url(),
  QBO_ENVIRONMENT: z.enum(["sandbox", "production"]),
  QBO_TOKEN_ENCRYPTION_KEY: z.string().min(1),

  // Inngest — required in production for webhook signature verification
  INNGEST_EVENT_KEY: z.string().optional(),
  INNGEST_SIGNING_KEY: process.env.NODE_ENV === "production"
    ? z.string().min(1)
    : z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
});

const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url(),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverSchema>;
export type ClientEnv = z.infer<typeof clientSchema>;

function validateEnv() {
  if (process.env.SKIP_ENV_VALIDATION === "1") {
    return {
      serverEnv: process.env as unknown as ServerEnv,
      clientEnv: process.env as unknown as ClientEnv,
    };
  }

  const serverResult = serverSchema.safeParse(process.env);
  const clientResult = clientSchema.safeParse(process.env);

  const errors: string[] = [];

  if (!serverResult.success) {
    for (const issue of serverResult.error.issues) {
      errors.push(`  ${issue.path.join(".")}: ${issue.message}`);
    }
  }

  if (!clientResult.success) {
    for (const issue of clientResult.error.issues) {
      errors.push(`  ${issue.path.join(".")}: ${issue.message}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Environment variable validation failed:\n${errors.join("\n")}`
    );
  }

  return {
    serverEnv: serverResult.data as ServerEnv,
    clientEnv: clientResult.data as ClientEnv,
  };
}

const { serverEnv, clientEnv } = validateEnv();

export { serverEnv, clientEnv };
