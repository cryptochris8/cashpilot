"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, Save } from "lucide-react";
import { getEmailSettings, updateEmailSettings } from "@/app/actions/email-settings";

export function EmailSettingsCard() {
  const [senderName, setSenderName] = useState("");
  const [replyToEmail, setReplyToEmail] = useState("");
  const [emailFooter, setEmailFooter] = useState("");
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const fetchSettings = useCallback(async () => {
    const result = await getEmailSettings();
    if ("data" in result) {
      setSenderName(result.data.senderName);
      setReplyToEmail(result.data.replyToEmail);
      setEmailFooter(result.data.emailFooter);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const handleSave = () => {
    startTransition(async () => {
      await updateEmailSettings({ senderName, replyToEmail, emailFooter });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex h-[200px] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />Email Settings
        </CardTitle>
        <CardDescription>
          Customize how your reminder emails are sent.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="senderName">From Name</Label>
          <Input id="senderName" value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="Your Company Name" />
          <p className="text-xs text-muted-foreground">The name that appears in the From field of emails.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="replyTo">Reply-To Email</Label>
          <Input id="replyTo" type="email" value={replyToEmail} onChange={(e) => setReplyToEmail(e.target.value)} placeholder="billing@yourcompany.com" />
          <p className="text-xs text-muted-foreground">Where replies to reminder emails will be sent.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="footer">Email Footer</Label>
          <textarea id="footer" className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={emailFooter} onChange={(e) => setEmailFooter(e.target.value)} placeholder="Custom footer text appended to all reminder emails..." />
          <p className="text-xs text-muted-foreground">This text is appended to every reminder email.</p>
        </div>
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {saved ? "Saved!" : "Save Settings"}
        </Button>
      </CardContent>
    </Card>
  );
}
