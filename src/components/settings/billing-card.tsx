"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Check, Loader2, ExternalLink, FileText, Mail, Layout, Zap } from "lucide-react";
import { getSubscriptionStatus, createCheckoutSessionAction, createPortalSessionAction } from "@/app/actions/billing";

interface SubscriptionInfo { id: string; status: string; stripePriceId: string | null; currentPeriodEnd: string | null; trialEnd: string | null; plan: string | null; }
interface UsageInfo { invoiceCount: number; emailsSentThisMonth: number; templateCount: number; cadenceCount: number; }
interface SubscriptionData { subscription: SubscriptionInfo | null; usage: UsageInfo; trialDaysRemaining: number | null; priceIds: { starter: string; growth: string }; }

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = { ACTIVE: "default", TRIALING: "secondary", PAST_DUE: "destructive", CANCELED: "outline", UNPAID: "destructive" };

function UsageStat({ icon: Icon, label, limit }: { icon: React.ComponentType<{ className?: string }>; label: string; limit: string }) {
  return (<div className="flex items-center gap-3 rounded-md border p-3"><Icon className="h-4 w-4 text-muted-foreground" /><div><p className="text-sm font-medium">{label}</p><p className="text-xs text-muted-foreground">{limit}</p></div></div>);
}

function PlanCard({ name, price, features, popular, onSubscribe, subscribing, disabled, variant }: { name: string; price: string; features: string[]; popular?: boolean; onSubscribe: () => void; subscribing: boolean; disabled: boolean; variant?: "outline" | "default" }) {
  return (
    <div className={popular ? "relative rounded-lg border-2 border-primary p-6" : "rounded-lg border p-6"}>
      {popular && <Badge className="absolute -top-3 right-4">Popular</Badge>}
      <h3 className="text-lg font-semibold">{name}</h3>
      <div className="mt-2 flex items-baseline gap-1"><span className="text-3xl font-bold">{price}</span><span className="text-muted-foreground">/month</span></div>
      <p className="mt-1 text-sm text-muted-foreground">14-day free trial included</p>
      <Separator className="my-4" />
      <ul className="space-y-2">{features.map((f) => (<li key={f} className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 shrink-0 text-green-600" />{f}</li>))}</ul>
      <Button className="mt-6 w-full" variant={variant || "default"} onClick={onSubscribe} disabled={disabled}>{subscribing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Start Free Trial</Button>
    </div>
  );
}

export function BillingCard() {
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [managingBilling, setManagingBilling] = useState(false);

  const fetchData = useCallback(async () => {
    const result = await getSubscriptionStatus();
    if ("data" in result && result.data) { setData(result.data as unknown as SubscriptionData); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubscribe = async (priceId: string) => {
    setSubscribing(priceId);
    const result = await createCheckoutSessionAction(priceId);
    if ("url" in result && result.url) { window.location.href = result.url; }
    setSubscribing(null);
  };

  const handleManageBilling = async () => {
    setManagingBilling(true);
    const result = await createPortalSessionAction();
    if ("url" in result && result.url) { window.location.href = result.url; }
    setManagingBilling(false);
  };

  if (loading) {
    return (<Card><CardContent className="flex h-[200px] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></CardContent></Card>);
  }
  if (!data) return null;

  const { subscription, usage, trialDaysRemaining, priceIds } = data;
  const hasActive = subscription && (subscription.status === "ACTIVE" || subscription.status === "TRIALING");

  if (hasActive && subscription) {
    const planName = subscription.plan === "growth" ? "Growth" : "Starter";
    const isTrialing = subscription.status === "TRIALING";
    const lbl = (g: string, s: string) => planName === "Growth" ? g : s;
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" />Billing</CardTitle>
              <CardDescription>Manage your subscription and billing details.</CardDescription>
            </div>
            <Badge variant={statusColors[subscription.status] || "outline"}>{subscription.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="text-lg font-semibold">{planName} Plan</p>
              <p className="text-sm text-muted-foreground">{planName === "Growth" ? "$79" : "$29"}/month</p>
              {subscription.currentPeriodEnd && (
                <p className="text-xs text-muted-foreground">
                  Renews on {new Date(subscription.currentPeriodEnd).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </p>
              )}
            </div>
            <Button variant="outline" onClick={handleManageBilling} disabled={managingBilling}>
              {managingBilling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
              Manage Billing
            </Button>
          </div>
          {isTrialing && trialDaysRemaining !== null && (
            <div className="space-y-2 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Free Trial</p>
                <p className="text-sm text-muted-foreground">{trialDaysRemaining} days remaining</p>
              </div>
              <Progress value={((14 - trialDaysRemaining) / 14) * 100} className="h-2" />
            </div>
          )}
          <Separator />
          <div>
            <h4 className="mb-3 text-sm font-semibold">Current Usage</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <UsageStat icon={FileText} label={usage.invoiceCount + " invoices"} limit={lbl("Unlimited", "100 limit")} />
              <UsageStat icon={Mail} label={usage.emailsSentThisMonth + " emails this month"} limit={lbl("Unlimited", "200/mo limit")} />
              <UsageStat icon={Layout} label={usage.templateCount + " templates"} limit={lbl("Unlimited", "3 limit")} />
              <UsageStat icon={Zap} label={usage.cadenceCount + " cadences"} limit={lbl("Unlimited", "1 limit")} />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" />Choose Your Plan</CardTitle>
        <CardDescription>Start your 14-day free trial. No credit card required to start.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
          <PlanCard name="Starter" price="$29" features={["1 QBO company","100 invoices","200 emails/month","1 cadence","3 templates"]} onSubscribe={() => handleSubscribe(priceIds.starter)} subscribing={subscribing === priceIds.starter} disabled={subscribing !== null} variant="outline" />
          <PlanCard name="Growth" price="$79" popular features={["5 QBO companies","Unlimited invoices","Unlimited emails","Unlimited cadences","Unlimited templates","Email tracking"]} onSubscribe={() => handleSubscribe(priceIds.growth)} subscribing={subscribing === priceIds.growth} disabled={subscribing !== null} />
        </div>
        {(usage.invoiceCount > 0 || usage.emailsSentThisMonth > 0) && (
          <>
            <Separator className="my-6" />
            <div>
              <h4 className="mb-3 text-sm font-semibold">Current Usage</h4>
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>{usage.invoiceCount} invoices</span>
                <span>{usage.emailsSentThisMonth} emails this month</span>
                <span>{usage.templateCount} templates</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
