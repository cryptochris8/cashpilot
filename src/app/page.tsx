import Link from "next/link";
import { Check, Mail, BarChart3, Zap, Shield, ArrowRight, LinkIcon, Bell, TrendingUp } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function RootPage() {
  const { userId } = await auth();
  if (userId) {
    // Authenticated users go to the dashboard (under the (dashboard) route group)
    // We need to render the dashboard page for them
    // Since (dashboard)/page.tsx handles /, just let it fall through
    // Actually, route groups with the same path - the first match wins
    // The solution: redirect authenticated users away from the marketing page
    redirect("/pipeline");
  }

  return (
    <MarketingContent />
  );
}

function MarketingContent() {
  return (
    <div className="min-h-screen flex flex-col">
      <MarketingHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="py-20 md:py-32">
          <div className="mx-auto max-w-6xl px-4 text-center">
            <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
              Stop Chasing Payments.<br />Let CashPilot Do It.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              Automate your invoice reminder workflows, reduce days sales outstanding, and accelerate cash flow with intelligent payment follow-ups connected to QuickBooks Online.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link href="/signup" className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                Start Your Free Trial <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link href="/pricing" className="inline-flex h-12 items-center justify-center rounded-md border px-8 text-sm font-medium hover:bg-muted">
                View Pricing
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">14-day free trial. No credit card required.</p>
          </div>
        </section>

        <Separator />

        {/* How It Works */}
        <section className="py-20 bg-muted/30">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center text-3xl font-bold">How It Works</h2>
            <p className="mx-auto mt-4 max-w-xl text-center text-muted-foreground">Get started in minutes with three simple steps.</p>
            <div className="mt-12 grid gap-8 md:grid-cols-3">
              <StepCard number={1} icon={LinkIcon} title="Connect QuickBooks" description="Link your QuickBooks Online account to automatically sync invoices, customers, and payment data." />
              <StepCard number={2} icon={Bell} title="Configure Reminders" description="Set up automated reminder cadences with customizable templates for your collection workflow." />
              <StepCard number={3} icon={TrendingUp} title="Get Paid Faster" description="Watch your collections improve as CashPilot sends professional reminders and tracks engagement." />
            </div>
          </div>
        </section>

        <Separator />

        {/* Features */}
        <section className="py-20">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center text-3xl font-bold">Everything You Need to Collect Faster</h2>
            <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              <FeatureCard icon={Mail} title="Smart Reminders" description="Automated email reminders with customizable templates and merge variables." />
              <FeatureCard icon={BarChart3} title="Email Analytics" description="Track open rates, bounce rates, and customer engagement metrics." />
              <FeatureCard icon={Zap} title="Pipeline Management" description="Visual Kanban board to track invoices through your collection workflow." />
              <FeatureCard icon={Shield} title="CAN-SPAM Compliant" description="Built-in unsubscribe links, bounce handling, and compliance features." />
            </div>
          </div>
        </section>

        <Separator />

        {/* Pricing Preview */}
        <section className="py-20 bg-muted/30">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center text-3xl font-bold">Simple, Transparent Pricing</h2>
            <p className="mx-auto mt-4 max-w-xl text-center text-muted-foreground">Start free for 14 days. No credit card required.</p>
            <div className="mt-12 grid gap-8 md:grid-cols-2 max-w-3xl mx-auto">
              <PricingCard name="Starter" price="$29" features={["1 QBO company", "100 invoices", "200 emails/month", "1 reminder cadence", "3 email templates"]} />
              <PricingCard name="Growth" price="$79" popular features={["5 QBO companies", "Unlimited invoices", "Unlimited emails", "Unlimited cadences", "Unlimited templates", "Email tracking"]} />
            </div>
          </div>
        </section>

        <Separator />

        {/* CTA */}
        <section className="py-20 bg-primary/5">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <h2 className="text-3xl font-bold">Ready to Get Paid Faster?</h2>
            <p className="mt-4 text-lg text-muted-foreground">Join businesses that use CashPilot to automate collections and improve cash flow.</p>
            <Link href="/signup" className="mt-8 inline-flex h-12 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Start Your 14-Day Free Trial <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}

function MarketingHeader() {
  return (
    <header className="border-b bg-white dark:bg-zinc-950">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold">CashPilot</span>
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground">Pricing</Link>
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">Log In</Link>
          <Link href="/signup" className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">Sign Up</Link>
        </nav>
      </div>
    </header>
  );
}

function MarketingFooter() {
  return (
    <footer className="border-t bg-muted/40 py-12">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid gap-8 md:grid-cols-4">
          <div><span className="font-bold">CashPilot</span><p className="mt-2 text-sm text-muted-foreground">Automate your invoice collections.</p></div>
          <div><h4 className="mb-3 text-sm font-semibold">Product</h4><ul className="space-y-2 text-sm text-muted-foreground"><li><Link href="/pricing">Pricing</Link></li><li><Link href="/signup">Get Started</Link></li></ul></div>
          <div><h4 className="mb-3 text-sm font-semibold">Company</h4><ul className="space-y-2 text-sm text-muted-foreground"><li><a href="#">About</a></li><li><a href="#">Contact</a></li></ul></div>
          <div><h4 className="mb-3 text-sm font-semibold">Legal</h4><ul className="space-y-2 text-sm text-muted-foreground"><li><a href="#">Privacy</a></li><li><a href="#">Terms</a></li></ul></div>
        </div>
      </div>
    </footer>
  );
}

function StepCard({ number, icon: Icon, title, description }: { number: number; icon: React.ComponentType<{ className?: string }>; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10"><Icon className="h-6 w-6 text-primary" /></div>
      <div className="mb-2 text-sm font-medium text-primary">Step {number}</div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }: { icon: React.ComponentType<{ className?: string }>; title: string; description: string }) {
  return (
    <div className="rounded-lg border p-6">
      <Icon className="mb-4 h-8 w-8 text-primary" />
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function PricingCard({ name, price, features, popular }: { name: string; price: string; features: string[]; popular?: boolean }) {
  return (
    <div className={popular ? "relative rounded-lg border-2 border-primary p-8" : "rounded-lg border p-8"}>
      {popular && <span className="absolute -top-3 right-4 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">Popular</span>}
      <h3 className="text-xl font-semibold">{name}</h3>
      <div className="mt-4 flex items-baseline gap-1"><span className="text-4xl font-bold">{price}</span><span className="text-muted-foreground">/month</span></div>
      <p className="mt-2 text-sm text-muted-foreground">14-day free trial</p>
      <ul className="mt-6 space-y-3">{features.map((f) => (<li key={f} className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 shrink-0 text-green-600" />{f}</li>))}</ul>
      <Link href="/signup" className="mt-8 flex h-10 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90">Start Free Trial</Link>
    </div>
  );
}
