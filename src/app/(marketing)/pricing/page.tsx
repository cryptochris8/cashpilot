import Link from "next/link";
import { Check, X, ArrowRight } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function PricingPage() {
  return (
    <div>
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h1 className="text-center text-4xl font-bold">Pricing Plans</h1>
          <p className="mx-auto mt-4 max-w-xl text-center text-muted-foreground">
            Choose the plan that fits your business. Both plans include a 14-day free trial.
          </p>

          <div className="mt-12 grid gap-8 md:grid-cols-2 max-w-3xl mx-auto">
            <div className="rounded-lg border p-8">
              <h3 className="text-xl font-semibold">Starter</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold">$29</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">Perfect for small businesses</p>
              <Link href="/signup" className="mt-6 flex h-10 w-full items-center justify-center rounded-md border text-sm font-medium hover:bg-muted">
                Start Free Trial
              </Link>
            </div>
            <div className="relative rounded-lg border-2 border-primary p-8">
              <span className="absolute -top-3 right-4 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">Popular</span>
              <h3 className="text-xl font-semibold">Growth</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold">$79</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">For growing businesses</p>
              <Link href="/signup" className="mt-6 flex h-10 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90">
                Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>

          <Separator className="my-12" />

          {/* Feature Comparison Table */}
          <div className="mx-auto max-w-3xl">
            <h2 className="mb-8 text-center text-2xl font-bold">Feature Comparison</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-3 text-left font-medium">Feature</th>
                  <th className="py-3 text-center font-medium">Starter</th>
                  <th className="py-3 text-center font-medium">Growth</th>
                </tr>
              </thead>
              <tbody>
                <ComparisonRow feature="QBO Companies" starter="1" growth="5" />
                <ComparisonRow feature="Invoices" starter="100" growth="Unlimited" />
                <ComparisonRow feature="Emails per Month" starter="200" growth="Unlimited" />
                <ComparisonRow feature="Reminder Cadences" starter="1" growth="Unlimited" />
                <ComparisonRow feature="Email Templates" starter="3" growth="Unlimited" />
                <ComparisonRow feature="Email Tracking" starter={false} growth={true} />
                <ComparisonRow feature="Pipeline Management" starter={true} growth={true} />
                <ComparisonRow feature="Cash Dashboard" starter={true} growth={true} />
                <ComparisonRow feature="QuickBooks Sync" starter={true} growth={true} />
                <ComparisonRow feature="Bounce Handling" starter={true} growth={true} />
                <ComparisonRow feature="CAN-SPAM Compliance" starter={true} growth={true} />
                <ComparisonRow feature="Custom Sender Settings" starter={true} growth={true} />
              </tbody>
            </table>
          </div>

          <Separator className="my-12" />

          {/* FAQ */}
          <div className="mx-auto max-w-2xl">
            <h2 className="mb-8 text-center text-2xl font-bold">Frequently Asked Questions</h2>
            <div className="space-y-6">
              <FaqItem question="Can I try CashPilot for free?" answer="Yes! Both plans include a 14-day free trial. No credit card is required to start." />
              <FaqItem question="Can I switch plans later?" answer="Absolutely. You can upgrade or downgrade your plan at any time from the billing settings." />
              <FaqItem question="What payment methods do you accept?" answer="We accept all major credit cards through our payment processor, Stripe." />
              <FaqItem question="What happens when my trial ends?" answer="You will be prompted to choose a plan. Your data is preserved and you can continue where you left off." />
              <FaqItem question="Can I cancel at any time?" answer="Yes, you can cancel your subscription at any time. There are no long-term contracts." />
              <FaqItem question="Do you support multiple QuickBooks companies?" answer="The Starter plan supports 1 QBO company. The Growth plan supports up to 5." />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ComparisonRow({ feature, starter, growth }: { feature: string; starter: string | boolean; growth: string | boolean }) {
  return (
    <tr className="border-b">
      <td className="py-3">{feature}</td>
      <td className="py-3 text-center">
        {typeof starter === "boolean" ? (
          starter ? <Check className="mx-auto h-4 w-4 text-green-600" /> : <X className="mx-auto h-4 w-4 text-muted-foreground" />
        ) : (
          starter
        )}
      </td>
      <td className="py-3 text-center">
        {typeof growth === "boolean" ? (
          growth ? <Check className="mx-auto h-4 w-4 text-green-600" /> : <X className="mx-auto h-4 w-4 text-muted-foreground" />
        ) : (
          <span className="font-medium">{growth}</span>
        )}
      </td>
    </tr>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="rounded-lg border p-4">
      <h3 className="font-medium">{question}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{answer}</p>
    </div>
  );
}
