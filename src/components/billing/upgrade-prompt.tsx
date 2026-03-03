"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, Check } from "lucide-react";
import { PRICE_IDS } from "@/lib/stripe/client";

interface UpgradePromptProps {
  feature: string;
  currentUsage?: number;
  limit?: number;
  reason?: string;
}

export function UpgradePrompt({
  feature,
  currentUsage,
  limit,
  reason,
}: UpgradePromptProps) {
  const handleUpgrade = async () => {
    try {
      const res = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: PRICE_IDS.growth }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      // Handle error silently
    }
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            <ArrowUp className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Upgrade to Growth</span>
            <Badge variant="secondary">$79/mo</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {reason ||
              `You have reached your limit for ${feature}.`}
          </p>
          {currentUsage !== undefined && limit !== undefined && (
            <p className="mt-1 text-xs text-muted-foreground">
              Current usage: {currentUsage} / {limit}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Check className="h-3 w-3 text-green-600" /> Unlimited invoices
            </span>
            <span className="flex items-center gap-1">
              <Check className="h-3 w-3 text-green-600" /> Unlimited emails
            </span>
            <span className="flex items-center gap-1">
              <Check className="h-3 w-3 text-green-600" /> Email tracking
            </span>
            <span className="flex items-center gap-1">
              <Check className="h-3 w-3 text-green-600" /> 5 QBO companies
            </span>
          </div>
        </div>
        <Button onClick={handleUpgrade} className="ml-4 shrink-0">
          Upgrade Now
        </Button>
      </CardContent>
    </Card>
  );
}
