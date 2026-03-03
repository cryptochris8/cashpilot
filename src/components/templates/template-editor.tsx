"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, Eye } from "lucide-react";
import { renderTemplate } from "@/lib/email/render";

interface TemplateData {
  id?: string;
  name: string;
  subject: string;
  body: string;
  isDefault?: boolean;
}

interface TemplateEditorProps {
  template?: TemplateData | null;
  onSave: (data: { name: string; subject: string; body: string }) => Promise<void>;
  onCancel: () => void;
  saving?: boolean;
}

const MERGE_VARS = [
  { key: "customer_name", label: "Customer Name" },
  { key: "invoice_number", label: "Invoice #" },
  { key: "amount", label: "Amount" },
  { key: "balance", label: "Balance" },
  { key: "due_date", label: "Due Date" },
  { key: "days_overdue", label: "Days Overdue" },
  { key: "company_name", label: "Company Name" },
  { key: "payment_link", label: "Payment Link" },
];

const SAMPLE_DATA: Record<string, string> = {
  customer_name: "John Doe",
  invoice_number: "INV-001",
  amount: "$1,250.00",
  balance: "$1,250.00",
  due_date: "Mar 15, 2026",
  days_overdue: "7",
  company_name: "Acme Corp",
  payment_link: "https://pay.example.com/inv-001",
};

export function TemplateEditor({ template, onSave, onCancel, saving }: TemplateEditorProps) {
  const [name, setName] = useState(template?.name ?? "");
  const [subject, setSubject] = useState(template?.subject ?? "");
  const [body, setBody] = useState(template?.body ?? "");
  const [showPreview, setShowPreview] = useState(false);
  const [activeField, setActiveField] = useState<"subject" | "body">("body");

  const insertVariable = (varKey: string) => {
    const tag = "{{" + varKey + "}}";
    if (activeField === "subject") {
      setSubject((prev) => prev + tag);
    } else {
      setBody((prev) => prev + tag);
    }
  };

  const handleSave = async () => {
    await onSave({ name, subject, body });
  };

  const renderedSubject = renderTemplate(subject, SAMPLE_DATA);
  const renderedBody = renderTemplate(body, SAMPLE_DATA);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Template Name</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Friendly Reminder" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="subject">Subject Line</Label>
        <Input
          id="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          onFocus={() => setActiveField("subject")}
          placeholder="e.g. Invoice {{invoice_number}} due on {{due_date}}"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="body">Email Body</Label>
        <textarea
          id="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onFocus={() => setActiveField("body")}
          rows={12}
          className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          placeholder="Hi {{customer_name}},..."
        />
      </div>

      <div className="space-y-2">
        <Label>Merge Variables (click to insert into {activeField})</Label>
        <div className="flex flex-wrap gap-1">
          {MERGE_VARS.map((v) => (
            <Badge
              key={v.key}
              variant="outline"
              className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
              onClick={() => insertVariable(v.key)}
            >
              {"{{" + v.key + "}}"}
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)}>
          <Eye className="mr-1 h-3 w-3" />
          {showPreview ? "Hide Preview" : "Show Preview"}
        </Button>
      </div>

      {showPreview && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Preview (with sample data)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Subject:</p>
              <p className="text-sm">{renderedSubject}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Body:</p>
              <pre className="whitespace-pre-wrap text-sm text-muted-foreground">{renderedBody}</pre>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving || !name || !subject || !body}>
          {saving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Save className="mr-1 h-3 w-3" />}
          Save Template
        </Button>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}
