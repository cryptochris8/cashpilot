# CashPilot

**Invoice-to-Cash Automation for Small Businesses** — the collections copilot that connects to QuickBooks Online and automatically reminds your customers so you get paid faster.

Small businesses in America are owed $825 billion in unpaid invoices at any given time. The average small business has 24% of its monthly revenue tied up in overdue invoices, and the #1 reason invoices go unpaid is that nobody asked for the money. CashPilot connects to QuickBooks in 60 seconds, shows you exactly who owes you and when it's coming, and sends polite, professional reminders on a schedule you control. A collections copilot, not an autopilot — you stay in control.

---

## Key Features

- **One-Click QuickBooks Sync** — OAuth 2.0 connection, automatic invoice and customer import, incremental sync every 15 minutes. Your CashPilot dashboard always matches your books.
- **Collections Pipeline (Kanban)** — Drag-and-drop invoices through stages: New → Reminder Sent → Follow-Up → Escalated → Resolved. See your entire AR at a glance.
- **Automated Reminder Engine** — Configure cadences: "3 days before due, send a friendly reminder. On the due date, send a notice. 7 days overdue, follow up. 14 days, escalate." Runs daily at 9 AM automatically.
- **5 Default Email Templates** — Merge variables (customer name, invoice number, amount, due date, days overdue). Full template editor with live preview. Create unlimited custom templates.
- **Cash Dashboard** — Expected cash next 30 days, overdue totals, collection effectiveness %, top debtors ranked by outstanding balance, weekly forecast chart.
- **Invoice-Level CRM** — Per-invoice notes (general, dispute, promise-to-pay, escalation), complete reminder history with delivery tracking (sent, opened, bounced).
- **Approval Mode** — Review every reminder before it sends. You stay in control.
- **A/R Aging Report** — Standard 0-30, 31-60, 61-90, 90+ aging buckets with CSV export.
- **Email Analytics** — Open rates, bounce rates, per-template performance, customer engagement tracking.
- **CAN-SPAM Compliant** — Automatic unsubscribe links, bounce handling via Resend webhooks, customer opt-out tracking.
- **Stripe Billing** — Starter $29/mo (1 QBO company, 100 invoices) and Growth $79/mo (5 companies, unlimited), both with 14-day free trial.
- **Help Center** — Built-in FAQ and getting-started guides.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js (React 19, App Router) |
| Language | TypeScript |
| Database | Neon (Serverless Postgres) |
| ORM | Prisma |
| Auth | Clerk |
| UI | shadcn/ui + Tailwind CSS + Radix UI |
| Background Jobs | Inngest (daily reminder cron, QBO sync) |
| Email | Resend (reminder delivery + webhooks) |
| Billing | Stripe (subscriptions + webhooks) |
| Accounting | QuickBooks Online (OAuth 2.0 integration) |
| Charts | Recharts |
| Error Monitoring | Sentry |

## Project Structure

```
src/
├── app/
│   ├── (auth)/            # Login, signup
│   ├── (dashboard)/       # Main app
│   │   ├── aging/         # A/R aging report
│   │   ├── analytics/     # Collection performance analytics
│   │   ├── customers/     # Customer directory + detail pages
│   │   ├── invoices/      # Invoice list + detail with notes and reminder history
│   │   ├── onboarding/    # Connect QBO → review invoices → set cadence → go
│   │   ├── pipeline/      # Kanban collections pipeline
│   │   ├── reminders/     # Cadence configuration
│   │   ├── settings/      # Account, billing, QBO connection, data export
│   │   └── templates/     # Email template editor with live preview
│   ├── (marketing)/       # Landing page, pricing, help center
│   ├── actions/           # Server actions (sync, billing, cadences, templates, etc.)
│   └── api/               # API routes
│       ├── qbo/           # QuickBooks OAuth (connect, callback, sync, disconnect)
│       ├── invoices/      # Invoice CRUD, bulk actions, reminders, export
│       ├── customers/     # Customer CRUD, notes, unsubscribe
│       ├── inngest/       # Background job handler
│       ├── webhooks/      # Clerk, Stripe, Resend webhooks
│       └── ...            # Aging, analytics, billing, notifications, templates
├── components/            # UI components
├── lib/                   # Core libraries (QBO client, email sender, Prisma, Inngest)
└── types/                 # TypeScript type definitions
```

## Getting Started

### Prerequisites

- Node.js 18+
- A Neon database (serverless Postgres)
- Clerk account (authentication)
- QuickBooks Developer account (OAuth app for QBO integration)
- Stripe account (billing)
- Inngest account (background jobs)
- Resend account (email)

### Local Development

1. **Clone and install dependencies:**
   ```bash
   git clone <your-repo-url>
   cd cashpilot
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   Fill in all values in `.env.local`. Each variable is documented in `.env.example` with instructions on where to find it.

3. **Generate the Prisma client and push the schema:**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Open the app:**
   Visit [http://localhost:3000](http://localhost:3000).

### Production Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for a complete step-by-step guide to deploying on Vercel with all service dependencies.

## Environment Variables

All required environment variables are documented in [`.env.example`](.env.example) with descriptions, where to find each value, and which are safe to expose client-side vs. server-only secrets.

Key integration: the QuickBooks connection requires a registered OAuth app at [developer.intuit.com](https://developer.intuit.com) with the redirect URI set to `/api/qbo/callback`. See `.env.example` for details.

## License

Proprietary. All rights reserved.
