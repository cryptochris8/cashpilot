"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, LinkIcon, FileText, Bell, Send, Rocket } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";

interface StepProps {
  onNext: () => void;
  onSkip: () => void;
}

interface ReviewStepProps extends StepProps {
  invoiceCount: number;
  totalOutstanding: number;
}

interface CadenceStepProps extends StepProps {
  cadenceConfigured: boolean;
}

export function WelcomeStep({ onNext }: StepProps) {
  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 rounded-full bg-primary/10 p-4 w-fit">
          <Rocket className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">Welcome to CashPilot!</CardTitle>
        <CardDescription>
          Let us help you set up automated invoice reminders so you can get paid faster.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-muted p-4 space-y-3">
          <p className="text-sm font-medium">In the next few steps, you will:</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600" />Connect your QuickBooks Online account</li>
            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600" />Review your synced invoices</li>
            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600" />Set up your first reminder cadence</li>
            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600" />Send a test reminder</li>
          </ul>
        </div>
        <Button className="w-full" size="lg" onClick={onNext}>
          <LinkIcon className="mr-2 h-5 w-5" />Get Started
        </Button>
      </CardContent>
    </Card>
  );
}

export function ConnectQboStep({ onNext, onSkip }: StepProps) {
  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 rounded-full bg-green-100 p-4 w-fit dark:bg-green-900">
          <LinkIcon className="h-8 w-8 text-green-600" />
        </div>
        <CardTitle>Connect QuickBooks Online</CardTitle>
        <CardDescription>Link your QuickBooks account to automatically import invoices and customers.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button className="w-full" size="lg" onClick={() => { window.location.href = "/api/qbo/connect"; }}>
          <LinkIcon className="mr-2 h-5 w-5" />Connect to QuickBooks
        </Button>
        <div className="flex justify-between">
          <Button variant="ghost" size="sm" onClick={onSkip}>Skip for now</Button>
          <Button variant="outline" size="sm" onClick={onNext}>Already connected</Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function ReviewInvoicesStep({ onNext, onSkip, invoiceCount, totalOutstanding }: ReviewStepProps) {
  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 rounded-full bg-blue-100 p-4 w-fit dark:bg-blue-900">
          <FileText className="h-8 w-8 text-blue-600" />
        </div>
        <CardTitle>Review Your Invoices</CardTitle>
        <CardDescription>Here is a summary of your synced invoice data.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border p-4 text-center">
            <p className="text-2xl font-bold">{invoiceCount}</p>
            <p className="text-sm text-muted-foreground">Total Invoices</p>
          </div>
          <div className="rounded-lg border p-4 text-center">
            <p className="text-2xl font-bold">{formatCurrency(totalOutstanding)}</p>
            <p className="text-sm text-muted-foreground">Outstanding</p>
          </div>
        </div>
        {invoiceCount === 0 && (
          <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            No invoices found. Make sure QuickBooks is connected and sync from Settings.
          </div>
        )}
        <div className="flex justify-between">
          <Button variant="ghost" size="sm" onClick={onSkip}>Skip</Button>
          <Button onClick={onNext}>Continue</Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function SetupCadenceStep({ onNext, onSkip, cadenceConfigured }: CadenceStepProps) {
  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 rounded-full bg-purple-100 p-4 w-fit dark:bg-purple-900">
          <Bell className="h-8 w-8 text-purple-600" />
        </div>
        <CardTitle>Set Up Reminder Cadence</CardTitle>
        <CardDescription>Configure when and how reminders are sent.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {cadenceConfigured ? (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-800 dark:bg-green-900 dark:text-green-200">
            <Check className="h-4 w-4" />Default cadence is already configured.
          </div>
        ) : (
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <p className="text-sm font-medium">Default Cadence:</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">3 days before due</Badge>
              <Badge variant="outline">Day of due date</Badge>
              <Badge variant="outline">7 days overdue</Badge>
              <Badge variant="outline">14 days overdue</Badge>
              <Badge variant="outline">30 days overdue</Badge>
            </div>
          </div>
        )}
        <Button className="w-full" onClick={() => { window.location.href = "/reminders"; }}>
          <Bell className="mr-2 h-4 w-4" />Configure Cadence
        </Button>
        <div className="flex justify-between">
          <Button variant="ghost" size="sm" onClick={onSkip}>Skip</Button>
          <Button variant="outline" size="sm" onClick={onNext}>Use Default</Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function TestReminderStep({ onNext, onSkip }: StepProps) {
  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 rounded-full bg-orange-100 p-4 w-fit dark:bg-orange-900">
          <Send className="h-8 w-8 text-orange-600" />
        </div>
        <CardTitle>Send a Test Reminder</CardTitle>
        <CardDescription>Try sending a test reminder to yourself to see how it looks.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button className="w-full" onClick={() => { window.location.href = "/templates"; }}>
          <Send className="mr-2 h-4 w-4" />Go to Templates to Send Test
        </Button>
        <div className="flex justify-between">
          <Button variant="ghost" size="sm" onClick={onSkip}>Skip</Button>
          <Button variant="outline" size="sm" onClick={onNext}>Continue</Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function CompletionStep({ onNext }: { onNext: () => void }) {
  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 rounded-full bg-green-100 p-4 w-fit dark:bg-green-900">
          <Rocket className="h-8 w-8 text-green-600" />
        </div>
        <CardTitle className="text-2xl">You Are All Set!</CardTitle>
        <CardDescription>CashPilot is ready to help you collect payments faster.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
          <p className="font-medium">What happens next:</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>- Reminders run automatically every day at 9 AM</li>
            <li>- Track performance in the Analytics dashboard</li>
            <li>- Manage invoices in the Pipeline view</li>
            <li>- Customize templates any time</li>
          </ul>
        </div>
        <Button className="w-full" size="lg" onClick={onNext}>Go to Dashboard</Button>
      </CardContent>
    </Card>
  );
}
