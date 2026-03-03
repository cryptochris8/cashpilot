"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X, CheckCheck, Loader2 } from "lucide-react";

interface PendingReminder {
  invoiceId: string;
  customerName: string;
  invoiceNumber: string;
  templateName: string;
  renderedSubject: string;
  renderedBody: string;
}

interface ApprovalQueueProps {
  reminders: PendingReminder[];
  onApprove: (invoiceId: string) => Promise<void>;
  onSkip: (invoiceId: string) => Promise<void>;
  onApproveAll: () => Promise<void>;
}

export function ApprovalQueue({ reminders, onApprove, onSkip, onApproveAll }: ApprovalQueueProps) {
  const [processing, setProcessing] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleApprove = async (invoiceId: string) => {
    setProcessing(invoiceId);
    await onApprove(invoiceId);
    setProcessing(null);
  };

  const handleSkip = async (invoiceId: string) => {
    setProcessing(invoiceId);
    await onSkip(invoiceId);
    setProcessing(null);
  };

  const handleApproveAll = async () => {
    setApproving(true);
    await onApproveAll();
    setApproving(false);
  };

  if (reminders.length === 0) {
    return (
      <Card>
        <CardContent className="flex h-[200px] items-center justify-center">
          <p className="text-sm text-muted-foreground">No pending reminders to approve.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Badge variant="secondary">{reminders.length} pending</Badge>
        <Button size="sm" onClick={handleApproveAll} disabled={approving}>
          {approving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <CheckCheck className="mr-1 h-3 w-3" />}
          Approve All
        </Button>
      </div>

      <div className="space-y-3">
        {reminders.map((r) => (
          <Card key={r.invoiceId}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{r.customerName} - #{r.invoiceNumber}</CardTitle>
                <Badge variant="outline" className="text-xs">{r.templateName}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs font-medium">Subject: {r.renderedSubject}</p>

              <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setExpandedId(expandedId === r.invoiceId ? null : r.invoiceId)}>
                {expandedId === r.invoiceId ? "Hide preview" : "Show preview"}
              </Button>

              {expandedId === r.invoiceId && (
                <pre className="max-h-[150px] overflow-y-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap">
                  {r.renderedBody}
                </pre>
              )}

              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleApprove(r.invoiceId)} disabled={processing === r.invoiceId}>
                  {processing === r.invoiceId ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Check className="mr-1 h-3 w-3" />}
                  Approve
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleSkip(r.invoiceId)} disabled={processing === r.invoiceId}>
                  <X className="mr-1 h-3 w-3" />Skip
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
