"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Monitor, Smartphone, Send, Loader2 } from "lucide-react";
import {
  templateRenderers,
  templateLabels,
  type TemplateName,
  type EmailTemplateData,
} from "@/lib/email/react-templates";

const sampleData: EmailTemplateData = {
  customerName: "John Smith",
  invoiceNumber: "1042",
  amount: "$5,200.00",
  balance: "$5,200.00",
  dueDate: "March 15, 2026",
  daysOverdue: "14",
  companyName: "Acme Corp",
  paymentLink: "https://pay.example.com/inv-1042",
  unsubscribeUrl: "https://app.cashpilot.com/api/unsubscribe/token123",
};

export function EmailPreview() {
  const [template, setTemplate] = useState<TemplateName>("friendlyReminder");
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const html = templateRenderers[template](sampleData);

  const handleSendTest = async () => {
    setSending(true);
    try {
      const res = await fetch("/api/templates/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template }),
      });
      if (res.ok) {
        setSent(true);
        setTimeout(() => setSent(false), 3000);
      }
    } catch {
      // Handle error
    }
    setSending(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Email Preview</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={template} onValueChange={(v) => setTemplate(v as TemplateName)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(templateLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex rounded-md border">
              <Button
                variant={viewport === "desktop" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewport("desktop")}
              >
                <Monitor className="h-4 w-4" />
              </Button>
              <Button
                variant={viewport === "mobile" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewport("mobile")}
              >
                <Smartphone className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSendTest}
              disabled={sending}
            >
              {sending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : sent ? (
                <Badge variant="secondary" className="mr-2">Sent!</Badge>
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send Test to Me
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex justify-center bg-muted/30 rounded-lg p-4">
          <div
            className={"bg-white border rounded-lg overflow-hidden shadow-sm transition-all " + (viewport === "mobile" ? "w-[375px]" : "w-[600px]")}
          >
            <iframe
              srcDoc={html}
              className="w-full border-0"
              style={{ height: "700px" }}
              title="Email Preview"
              sandbox=""
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
