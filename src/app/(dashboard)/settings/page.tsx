"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, Download, UserCog } from "lucide-react";
import { QboConnectionCard } from "@/components/settings/qbo-connection-card";
import { BillingCard } from "@/components/settings/billing-card";
import { EmailSettingsCard } from "@/components/settings/email-settings-card";

function SettingsContent() {
  const searchParams = useSearchParams();
  const success = searchParams.get("success");
  const billing = searchParams.get("billing");
  const error = searchParams.get("error");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your integrations, billing, and account preferences.</p>
      </div>

      {success === "connected" && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Connected Successfully</AlertTitle>
          <AlertDescription>Your QuickBooks account has been connected. Click &quot;Sync Now&quot; to import your invoices and customers.</AlertDescription>
        </Alert>
      )}

      {billing === "success" && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Subscription Active</AlertTitle>
          <AlertDescription>Your subscription has been activated. Thank you for choosing CashPilot!</AlertDescription>
        </Alert>
      )}

      {billing === "cancelled" && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Checkout Cancelled</AlertTitle>
          <AlertDescription>Your checkout was cancelled. You can try again when ready.</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error === "missing_params" ? "Missing required parameters from QuickBooks."
              : error === "invalid_state" ? "Invalid security token. Please try connecting again."
              : error === "org_not_found" ? "Organization not found. Please select an organization first."
              : error === "token_exchange_failed" ? "Failed to complete QuickBooks authorization. Please try again."
              : "An error occurred: " + error}
          </AlertDescription>
        </Alert>
      )}

      {/* 1. QuickBooks Connection */}
      <QboConnectionCard />

      <Separator />

      {/* 2. Email Settings */}
      <EmailSettingsCard />

      <Separator />

      {/* 3. Billing & Subscription */}
      <BillingCard />

      <Separator />

      {/* 4. Data Export */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Data Export</CardTitle>
              <CardDescription>Download your data or manage your account.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <Link href="/settings/export">
              <Download className="mr-2 h-4 w-4" />
              Go to Data & Privacy
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* 6. Account */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Account</CardTitle>
              <CardDescription>Manage your account settings.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Account name and email are managed through your authentication provider (Clerk).
          </p>
          <div className="rounded-lg border border-destructive/50 p-4">
            <h4 className="text-sm font-medium text-destructive">Danger Zone</h4>
            <p className="mt-1 text-xs text-muted-foreground">
              Permanently delete your account and all associated data.
            </p>
            <Button variant="destructive" size="sm" className="mt-3" asChild>
              <Link href="/settings/export">Delete Account</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div>Loading settings...</div>}>
      <SettingsContent />
    </Suspense>
  );
}
