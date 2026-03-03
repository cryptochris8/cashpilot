# CashPilot Deployment Guide

Complete guide to deploying CashPilot from zero to production.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Neon Database Setup](#2-neon-database-setup)
3. [Clerk Authentication Setup](#3-clerk-authentication-setup)
4. [Stripe Billing Setup](#4-stripe-billing-setup)
5. [QuickBooks Online Setup](#5-quickbooks-online-setup)
6. [Inngest Background Jobs Setup](#6-inngest-background-jobs-setup)
7. [Resend Email Setup](#7-resend-email-setup)
8. [Sentry Error Monitoring Setup](#8-sentry-error-monitoring-setup)
9. [Generate Token Encryption Key](#9-generate-token-encryption-key)
10. [Vercel Deployment](#10-vercel-deployment)
11. [Post-Deployment Configuration](#11-post-deployment-configuration)
12. [Verification Checklist](#12-verification-checklist)
13. [Custom Domain Setup](#13-custom-domain-setup)
14. [Troubleshooting](#14-troubleshooting)

---

## 1. Prerequisites

You need accounts on each of the following services. Sign up before proceeding.

| Service | URL | Purpose |
|---------|-----|---------|
| **Vercel** | https://vercel.com | Hosting and CI/CD |
| **Clerk** | https://clerk.com | Authentication |
| **Neon** | https://neon.tech | Serverless Postgres |
| **Stripe** | https://stripe.com | Billing and subscriptions |
| **Intuit Developer** | https://developer.intuit.com | QuickBooks Online API |
| **Inngest** | https://inngest.com | Background jobs and cron |
| **Resend** | https://resend.com | Transactional email |
| **Sentry** | https://sentry.io | Error monitoring |

You will also need:

- **Node.js 20+** installed locally (for running migrations)
- **Git** with the repository pushed to GitHub
- **openssl** CLI (for generating the encryption key) -- available on macOS/Linux by default; on Windows use Git Bash or WSL

---

## 2. Neon Database Setup

Neon provides serverless Postgres with connection pooling, which is required for serverless environments like Vercel.

### 2.1 Create a Neon Project

1. Log in to the [Neon Console](https://console.neon.tech).
2. Click **New Project**.
3. Set the project name to `cashpilot`.
4. Choose the region closest to your Vercel deployment (e.g., `us-east-2` for Vercel's `iad1`).
5. Click **Create Project**.

### 2.2 Get Connection Strings

After project creation, Neon displays your connection details. You need two strings:

**Pooled connection** (for runtime use by Prisma Client):

```
postgresql://user:password@ep-xxx-pooler-123456.us-east-2.aws.neon.tech/cashpilot?sslmode=require
```

Copy this as `DATABASE_URL`.

**Direct connection** (for running migrations):

```
postgresql://user:password@ep-xxx-123456.us-east-2.aws.neon.tech/cashpilot?sslmode=require
```

Copy this as `DIRECT_DATABASE_URL`.

> **Tip:** The pooled URL contains `-pooler` in the hostname. The direct URL does not.

### 2.3 Run Prisma Migrations

From your local machine, set the environment variable and run migrations:

```bash
# Set the connection URL (use the direct URL for migrations)
export DATABASE_URL="postgresql://user:password@ep-xxx-123456.us-east-2.aws.neon.tech/cashpilot?sslmode=require"

# Generate the Prisma Client
npx prisma generate

# Apply all migrations to the Neon database
npx prisma migrate deploy
```

Verify the schema was applied:

```bash
npx prisma studio
```

---

## 3. Clerk Authentication Setup

### 3.1 Create a Clerk Application

1. Log in to the [Clerk Dashboard](https://dashboard.clerk.com).
2. Click **Create application**.
3. Name it `CashPilot`.
4. Under **Sign-in options**, enable the methods you want (e.g., Email, Google, GitHub).
5. Click **Create application**.

### 3.2 Get API Keys

1. In the Clerk Dashboard, go to **API Keys**.
2. Copy the **Publishable key** (`pk_test_...` or `pk_live_...`) as `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`.
3. Copy the **Secret key** (`sk_test_...` or `sk_live_...`) as `CLERK_SECRET_KEY`.

### 3.3 Configure Redirect URLs

1. Go to **Paths** in the Clerk Dashboard.
2. Set the following:
   - **Sign-in URL:** `/login`
   - **Sign-up URL:** `/signup`
   - **After sign-in URL:** `/dashboard`
   - **After sign-up URL:** `/dashboard`

### 3.4 Set Up the Clerk Webhook

Clerk webhooks notify your app when users are created, updated, or deleted.

1. In the Clerk Dashboard, go to **Webhooks**.
2. Click **Add endpoint**.
3. Set the **Endpoint URL** to:
   ```
   https://cashpilot.yourdomain.com/api/webhooks/clerk
   ```
   (Replace with your actual production URL.)
4. Select the events you need:
   - `user.created`
   - `user.updated`
   - `user.deleted`
5. Click **Create**.
6. Copy the **Signing Secret** (`whsec_...`) as `CLERK_WEBHOOK_SECRET`.

> **Local development:** You cannot receive webhooks on localhost without a tunnel. Use [ngrok](https://ngrok.com) or the Clerk CLI to forward webhook events during development.

---

## 4. Stripe Billing Setup

### 4.1 Get API Keys

1. Log in to the [Stripe Dashboard](https://dashboard.stripe.com).
2. Go to **Developers -> API keys**.
3. Copy the **Publishable key** as `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
4. Copy the **Secret key** as `STRIPE_SECRET_KEY`.

> **Important:** Use **test mode** keys during development. Switch to **live mode** keys for production.

### 4.2 Create Products and Prices

Create two subscription products. The 14-day free trial is configured at checkout time in the application code (see `src/lib/stripe/client.ts`), so you only need to create the products and prices.

#### Starter Plan -- $29/month

1. Go to **Products -> Add product**.
2. Set the name to `Starter`.
3. Set the description to `For freelancers and solo businesses`.
4. Under **Pricing**, select **Recurring**, set the amount to `$29.00`, interval to `Monthly`.
5. Click **Save product**.
6. Copy the **Price ID** (`price_...`) as `STRIPE_PRICE_STARTER`.

#### Growth Plan -- $79/month

1. Go to **Products -> Add product**.
2. Set the name to `Growth`.
3. Set the description to `For growing teams and multiple entities`.
4. Under **Pricing**, select **Recurring**, set the amount to `$79.00`, interval to `Monthly`.
5. Click **Save product**.
6. Copy the **Price ID** (`price_...`) as `STRIPE_PRICE_GROWTH`.

> **Note on trials:** The 14-day free trial is applied automatically when creating checkout sessions via `subscription_data.trial_period_days: 14` in `src/lib/stripe/client.ts`. No additional Stripe configuration is needed.

### 4.3 Set Up the Stripe Webhook

1. In the Stripe Dashboard, go to **Developers -> Webhooks**.
2. Click **Add endpoint**.
3. Set the **Endpoint URL** to:
   ```
   https://cashpilot.yourdomain.com/api/webhooks/stripe
   ```
4. Select these events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click **Add endpoint**.
6. Reveal and copy the **Signing secret** (`whsec_...`) as `STRIPE_WEBHOOK_SECRET`.

#### Local Development with Stripe CLI

```bash
# Install the Stripe CLI, then:
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# The CLI prints a webhook signing secret -- use it as STRIPE_WEBHOOK_SECRET locally.
```

---

## 5. QuickBooks Online Setup

### 5.1 Create an Intuit Developer App

1. Log in to [Intuit Developer](https://developer.intuit.com).
2. Go to **My Apps -> Create an app**.
3. Select **QuickBooks Online and Payments**.
4. Name the app `CashPilot`.
5. Under **Scopes**, select:
   - `com.intuit.quickbooks.accounting` (read/write access to accounting data)

### 5.2 Configure OAuth 2.0 Redirect URI

1. In your app settings, go to **Keys & OAuth**.
2. Under **Redirect URIs**, add:
   - For development: `http://localhost:3000/api/qbo/callback`
   - For production: `https://cashpilot.yourdomain.com/api/qbo/callback`

> **Important:** The redirect URI must match **exactly** what you set in `QBO_REDIRECT_URI` (including protocol, domain, port, and path). Any mismatch causes OAuth to fail silently.

### 5.3 Get Client Credentials

From the **Keys & OAuth** page:

**Development (Sandbox):**

- Copy **Client ID** as `QBO_CLIENT_ID`
- Copy **Client Secret** as `QBO_CLIENT_SECRET`
- Set `QBO_ENVIRONMENT=sandbox`
- Set `QBO_REDIRECT_URI=http://localhost:3000/api/qbo/callback`

**Production:**

- Switch to the **Production** tab
- Copy the production **Client ID** and **Client Secret**
- Set `QBO_ENVIRONMENT=production`
- Set `QBO_REDIRECT_URI=https://cashpilot.yourdomain.com/api/qbo/callback`

### 5.4 Sandbox vs. Production

| Setting | Sandbox | Production |
|---------|---------|------------|
| `QBO_ENVIRONMENT` | `sandbox` | `production` |
| API Base URL | `https://sandbox-quickbooks.api.intuit.com` | `https://quickbooks.api.intuit.com` |
| OAuth Base URL | Same for both | Same for both |
| Data | Test data only | Real customer data |

The app reads `QBO_ENVIRONMENT` in `src/lib/qbo/client.ts` to determine which API base URL to use.

### 5.5 Intuit App Review (Production Only)

Before going live with production QuickBooks credentials:

1. Submit your app for review in the Intuit Developer portal.
2. Provide test credentials, demo videos, and a privacy policy as required.
3. App review typically takes 1-2 weeks.

---

## 6. Inngest Background Jobs Setup

CashPilot uses Inngest for two recurring jobs:

| Function | ID | Schedule | Description |
|----------|----|----------|-------------|
| Scheduled QBO Sync | `scheduled-sync` | `*/15 * * * *` (every 15 min) | Incremental sync of invoices and customers from QuickBooks |
| Execute Daily Reminders | `execute-reminders` | `0 9 * * *` (daily at 9:00 AM UTC) | Evaluates reminder rules and sends emails via Resend |

### 6.1 Create an Inngest Account

1. Sign up at [Inngest](https://app.inngest.com).
2. Create a new project or use the default one.

### 6.2 Get Keys

1. Go to **Manage -> Event Keys** and copy the key as `INNGEST_EVENT_KEY`.
2. Go to **Manage -> Signing Key** and copy it as `INNGEST_SIGNING_KEY`.

### 6.3 Connect Inngest to Vercel

Option A -- Vercel Integration (recommended):

1. Install the [Inngest Vercel Integration](https://vercel.com/integrations/inngest) from the Vercel Marketplace.
2. Authorize the integration for your Vercel team.
3. Select the `cashpilot` project.
4. Inngest will automatically discover your serve endpoint at `/api/inngest`.

Option B -- Manual sync:

1. In the Inngest Dashboard, go to **Apps -> Sync new app**.
2. Enter your serve endpoint URL:
   ```
   https://cashpilot.yourdomain.com/api/inngest
   ```
3. Click **Sync**.

### 6.4 Verify Function Registration

After syncing, confirm these functions appear in the Inngest Dashboard:

- **scheduled-sync** -- Cron: `*/15 * * * *`
- **execute-reminders** -- Cron: `0 9 * * *`

> Functions are defined in `src/lib/inngest/functions/` and registered via the serve endpoint at `src/app/api/inngest/route.ts`. If functions do not appear, check Vercel function logs for errors on the `/api/inngest` route.

---

## 7. Resend Email Setup

### 7.1 Get API Key

1. Log in to [Resend](https://resend.com).
2. Go to **API Keys -> Create API Key**.
3. Name it `cashpilot-production`.
4. Set permissions to **Sending access** only.
5. Copy the key (`re_...`) as `RESEND_API_KEY`.

### 7.2 Verify Your Sending Domain

To send emails from your own domain (e.g., `reminders@cashpilot.app`):

1. Go to **Domains -> Add Domain**.
2. Enter your domain (e.g., `cashpilot.app`).
3. Resend will provide DNS records to add: SPF, DKIM, and optionally DMARC.
4. Add the DNS records in your domain registrar or DNS provider.
5. Click **Verify** in Resend once DNS has propagated (usually a few minutes to a few hours).

After verification, emails sent from addresses on that domain will be delivered normally.

> **Note:** The default "from" address is hardcoded as `CashPilot <reminders@cashpilot.app>` in `src/lib/email/send.ts`. Organizations can override the sender name through the in-app email settings.

> **Development:** You can use Resend's test domain (`onboarding@resend.dev`) without domain verification during development.

---

## 8. Sentry Error Monitoring Setup

### 8.1 Create a Sentry Project

1. Log in to [Sentry](https://sentry.io).
2. Go to **Projects -> Create Project**.
3. Select **Next.js** as the platform.
4. Name the project `cashpilot`.
5. Click **Create Project**.

### 8.2 Get Configuration Values

**DSN:** Found in **Settings -> Projects -> cashpilot -> Client Keys (DSN)**.
Copy it as `NEXT_PUBLIC_SENTRY_DSN`.

**Auth Token:** For source map uploads during build.
Go to **Settings -> Auth Tokens -> Create New Token**.
Give it `project:releases` and `org:read` scopes.
Copy it as `SENTRY_AUTH_TOKEN`.

---

## 9. Generate Token Encryption Key

CashPilot encrypts QuickBooks OAuth tokens at rest using AES-256. You must generate a cryptographically secure key before any user connects their QuickBooks account.

### macOS / Linux / Git Bash / WSL:

```bash
openssl rand -base64 32
```

This outputs a 44-character base64 string. Copy it as `QBO_TOKEN_ENCRYPTION_KEY`.

### Windows PowerShell:

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }) -as [byte[]])
```

> **Critical:** Store this key securely. If you lose or change it, all stored QuickBooks OAuth tokens become permanently unreadable and every user will need to re-authorize their QuickBooks connection. This key is read in `src/lib/qbo/token-manager.ts`.

---

## 10. Vercel Deployment

### 10.1 Import the Project

1. Log in to [Vercel](https://vercel.com).
2. Click **Add New -> Project**.
3. Import the `cashpilot` repository from GitHub.
4. Vercel will auto-detect the Next.js framework.

### 10.2 Configure Build Settings

Vercel should auto-detect these, but verify:

- **Framework Preset:** Next.js
- **Build Command:** `npx prisma generate && next build`
- **Output Directory:** `.next`
- **Install Command:** `npm install`

### 10.3 Configure Environment Variables

Before clicking Deploy, add every environment variable. Go to **Settings -> Environment Variables** and add each one from `.env.example` with production values gathered in the previous steps.

For each variable, select the appropriate environments:

| Variable | Production | Preview | Development |
|----------|:----------:|:-------:|:-----------:|
| `NEXT_PUBLIC_APP_URL` | Your prod URL | Auto (preview URL) | `http://localhost:3000` |
| `NODE_ENV` | `production` | `production` | `development` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Live key | Test key | Test key |
| `CLERK_SECRET_KEY` | Live key | Test key | Test key |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/login` | `/login` | `/login` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/signup` | `/signup` | `/signup` |
| `CLERK_WEBHOOK_SECRET` | Prod secret | -- | -- |
| `DATABASE_URL` | Pooled URL | Pooled URL | Pooled URL |
| `DIRECT_DATABASE_URL` | Direct URL | Direct URL | Direct URL |
| `STRIPE_SECRET_KEY` | Live key | Test key | Test key |
| `STRIPE_WEBHOOK_SECRET` | Prod secret | -- | -- |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Live key | Test key | Test key |
| `STRIPE_PRICE_STARTER` | Live price ID | Test price ID | Test price ID |
| `STRIPE_PRICE_GROWTH` | Live price ID | Test price ID | Test price ID |
| `RESEND_API_KEY` | Prod key | Prod key | Prod key |
| `EMAIL_FROM` | Verified addr | Test addr | Test addr |
| `INNGEST_EVENT_KEY` | Prod key | Prod key | Prod key |
| `INNGEST_SIGNING_KEY` | Prod key | Prod key | Prod key |
| `QBO_CLIENT_ID` | Prod ID | Sandbox ID | Sandbox ID |
| `QBO_CLIENT_SECRET` | Prod secret | Sandbox secret | Sandbox secret |
| `QBO_REDIRECT_URI` | Prod callback URL | Preview callback URL | Local callback URL |
| `QBO_ENVIRONMENT` | `production` | `sandbox` | `sandbox` |
| `QBO_TOKEN_ENCRYPTION_KEY` | Encryption key | Encryption key | Encryption key |
| `NEXT_PUBLIC_SENTRY_DSN` | DSN | DSN | DSN |
| `SENTRY_AUTH_TOKEN` | Token | Token | -- |

### 10.4 Deploy

1. Click **Deploy**.
2. Wait for the build to complete.
3. Vercel will provide a deployment URL (e.g., `https://cashpilot-xxx.vercel.app`).

### 10.5 Run Database Migrations (if not done earlier)

If you have not already run migrations against your production Neon database:

```bash
# Set the production connection URL (use direct/non-pooled URL for migrations)
export DATABASE_URL="postgresql://user:password@ep-xxx-123456.us-east-2.aws.neon.tech/cashpilot?sslmode=require"

npx prisma generate
npx prisma migrate deploy
```

---

## 11. Post-Deployment Configuration

After the first successful deployment, update external services with your production URL.

### 11.1 Clerk

- Update **Allowed redirect URLs** in the Clerk Dashboard to include your production domain.
- Update the webhook endpoint URL to `https://cashpilot.yourdomain.com/api/webhooks/clerk`.

### 11.2 Stripe

- Update the webhook endpoint URL to `https://cashpilot.yourdomain.com/api/webhooks/stripe`.

### 11.3 QuickBooks / Intuit Developer

- Add the production redirect URI: `https://cashpilot.yourdomain.com/api/qbo/callback`.
- Update `QBO_REDIRECT_URI` in Vercel environment variables to match.

### 11.4 Inngest

- Sync the app with your production URL: `https://cashpilot.yourdomain.com/api/inngest`.
- Or if using the Vercel integration, it syncs automatically on each deploy.

### 11.5 Update NEXT_PUBLIC_APP_URL

- Set this environment variable in Vercel to your production URL (e.g., `https://cashpilot.yourdomain.com`).
- **Redeploy** after changing it. Because it is a `NEXT_PUBLIC_` variable, it is inlined at build time and requires a new build to take effect.

---

## 12. Verification Checklist

After deployment, walk through each integration to confirm everything is working.

### Authentication (Clerk)

- [ ] Visit `/login` -- sign-in page loads without errors
- [ ] Visit `/signup` -- sign-up page loads without errors
- [ ] Create a test account -- user appears in the Clerk Dashboard
- [ ] Webhook fires -- check Clerk Dashboard -> Webhooks -> Logs for a `user.created` event

### Database (Neon + Prisma)

- [ ] App loads without database connection errors in Vercel function logs
- [ ] User record is created in the database after sign-up
- [ ] Run `npx prisma studio` pointed at production to verify tables exist and have data

### Billing (Stripe)

- [ ] Pricing/upgrade UI shows Starter ($29/mo) and Growth ($79/mo) plans
- [ ] Checkout flow completes with Stripe test card `4242 4242 4242 4242`
- [ ] 14-day trial is active on the newly created subscription
- [ ] Webhook events appear in Stripe Dashboard -> Developers -> Webhooks -> Logs
- [ ] Subscription status updates correctly in the app after webhook delivery

### QuickBooks Online

- [ ] "Connect QuickBooks" button initiates the OAuth flow and redirects to Intuit
- [ ] OAuth callback redirects back to the app successfully (no error page)
- [ ] Connected QuickBooks company name is displayed in the app
- [ ] Trigger a manual sync -- invoices and customers are pulled from the sandbox

### Background Jobs (Inngest)

- [ ] Both functions (`scheduled-sync` and `execute-reminders`) appear in the Inngest Dashboard
- [ ] `scheduled-sync` executes on its 15-minute cron schedule (check Inngest -> Runs)
- [ ] `execute-reminders` fires at the scheduled time (check Inngest -> Runs)
- [ ] No persistent errors in function run logs

### Email (Resend)

- [ ] Trigger a test reminder email (via reminder rules or manually)
- [ ] Email is received at the target address
- [ ] "From" address and sender name are correct
- [ ] Check Resend Dashboard -> Emails for delivery status and any bounces

### Error Monitoring (Sentry)

- [ ] Trigger a test error (e.g., throw from an API route temporarily)
- [ ] Error appears in the Sentry Dashboard with source maps properly resolved
- [ ] Both client-side and server-side errors are captured

---

## 13. Custom Domain Setup

### 13.1 Add Domain in Vercel

1. Go to your project in Vercel -> **Settings -> Domains**.
2. Enter your domain (e.g., `cashpilot.com` or `app.cashpilot.com`).
3. Click **Add**.

### 13.2 Configure DNS

Vercel will display the required DNS records. Typical configurations:

**For an apex domain (`cashpilot.com`):**

| Type | Name | Value |
|------|------|-------|
| A | @ | `76.76.21.21` |

**For a subdomain (`app.cashpilot.com`):**

| Type | Name | Value |
|------|------|-------|
| CNAME | app | `cname.vercel-dns.com` |

### 13.3 SSL Certificate

Vercel automatically provisions and renews SSL certificates via Let's Encrypt. No manual configuration is required.

### 13.4 Update All Service URLs

After your custom domain is live, update every reference to the old `*.vercel.app` URL:

1. **Vercel env var:** `NEXT_PUBLIC_APP_URL` -> `https://cashpilot.yourdomain.com`
2. **Vercel env var:** `QBO_REDIRECT_URI` -> `https://cashpilot.yourdomain.com/api/qbo/callback`
3. **Clerk:** Allowed redirect URLs and webhook endpoint URL
4. **Stripe:** Webhook endpoint URL
5. **Intuit Developer:** OAuth redirect URI
6. **Inngest:** Re-sync the app URL (automatic if using the Vercel integration)

**Redeploy** after changing any `NEXT_PUBLIC_` environment variable.

---

## 14. Troubleshooting

### Build fails with Prisma error

Ensure the build command includes Prisma Client generation:

```
npx prisma generate && next build
```

If using the Prisma config file (`prisma/prisma.config.ts`), ensure `DATABASE_URL` is set in the Vercel environment.

### Database connection errors on Vercel

- Verify you are using the **pooled** connection string (with `-pooler` in the hostname) for `DATABASE_URL`.
- Ensure `?sslmode=require` is appended to the connection string.
- Check that the Neon project is not paused (free-tier projects auto-suspend after inactivity).

### Clerk webhook returns 401 or 403

- Verify `CLERK_WEBHOOK_SECRET` matches the signing secret shown in Clerk Dashboard -> Webhooks.
- Ensure the webhook endpoint URL is correct and publicly reachable (not behind auth middleware).

### Stripe webhook signature verification fails

- Ensure `STRIPE_WEBHOOK_SECRET` matches the signing secret for the specific webhook endpoint.
- When testing locally with `stripe listen`, use the secret printed by the CLI, not the one from the Dashboard -- they are different.

### QuickBooks OAuth flow fails or redirects to an error

- Verify `QBO_REDIRECT_URI` matches **exactly** what is registered in the Intuit Developer portal (protocol, domain, port, and path must all match).
- Ensure `QBO_ENVIRONMENT` matches the key set you are using (`sandbox` keys with `sandbox`, `production` keys with `production`).
- Check that the OAuth scopes in the Intuit Developer portal include `com.intuit.quickbooks.accounting`.

### Token decryption fails after deployment

- Ensure `QBO_TOKEN_ENCRYPTION_KEY` is identical across all environments where tokens were encrypted. If you changed or lost the key, affected users must disconnect and re-authorize their QuickBooks connection.

### Inngest functions not appearing after deploy

- Hit the serve endpoint directly in a browser: `https://cashpilot.yourdomain.com/api/inngest`. It should return a JSON response listing registered functions.
- Re-sync the app in the Inngest Dashboard.
- Check Vercel function logs for errors on the `/api/inngest` route.

### Emails not being delivered

- Verify the sending domain is verified in Resend (check for a green "Verified" badge).
- Ensure the "from" address uses the verified domain.
- Check Resend Dashboard -> Emails for bounce reasons or error details.
- If using the default `reminders@cashpilot.app`, ensure `cashpilot.app` is verified in Resend.
