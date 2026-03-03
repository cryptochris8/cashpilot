"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { TemplateEditor } from "@/components/templates/template-editor";
import {
  getTemplates,
  ensureDefaultTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  sendTestEmail,
} from "@/app/actions/templates";
import { Loader2, Plus, Pencil, Trash2, Send } from "lucide-react";

interface TemplateData {
  id: string;
  name: string;
  subject: string;
  body: string;
  isDefault: boolean;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<TemplateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<TemplateData | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testEmailDialogId, setTestEmailDialogId] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [isPending, startTransition] = useTransition();

  const fetchTemplates = useCallback(async () => {
    await ensureDefaultTemplates();
    const result = await getTemplates();
    if ("data" in result && result.data) {
      setTemplates(result.data as unknown as TemplateData[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const handleCreate = async (data: { name: string; subject: string; body: string }) => {
    setSaving(true);
    await createTemplate(data);
    setIsCreating(false);
    setSaving(false);
    await fetchTemplates();
  };

  const handleUpdate = async (data: { name: string; subject: string; body: string }) => {
    if (!editingTemplate) return;
    setSaving(true);
    await updateTemplate(editingTemplate.id, data);
    setEditingTemplate(null);
    setSaving(false);
    await fetchTemplates();
  };

  const handleDelete = (templateId: string) => {
    startTransition(async () => {
      await deleteTemplate(templateId);
      await fetchTemplates();
    });
  };

  const handleSendTest = () => {
    if (!testEmailDialogId || !testEmail) return;
    startTransition(async () => {
      await sendTestEmail(testEmailDialogId, testEmail);
      setTestEmailDialogId(null);
      setTestEmail("");
    });
  };

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (editingTemplate || isCreating) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {editingTemplate ? "Edit Template" : "Create Template"}
          </h1>
          <p className="text-muted-foreground">
            {editingTemplate ? "Modify the template content and merge variables." : "Create a new email reminder template."}
          </p>
        </div>
        <TemplateEditor
          template={editingTemplate}
          onSave={editingTemplate ? handleUpdate : handleCreate}
          onCancel={() => { setEditingTemplate(null); setIsCreating(false); }}
          saving={saving}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reminder Templates</h1>
          <p className="text-muted-foreground">Manage email templates used in your reminder cadences.</p>
        </div>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="mr-1 h-4 w-4" />Create Template
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <Card key={template.id} className="transition-shadow hover:shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{template.name}</CardTitle>
                <Badge variant={template.isDefault ? "secondary" : "default"}>
                  {template.isDefault ? "Default" : "Custom"}
                </Badge>
              </div>
              <CardDescription className="line-clamp-1">{template.subject}</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="mb-3 line-clamp-3 text-xs text-muted-foreground whitespace-pre-wrap">
                {template.body}
              </pre>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditingTemplate(template)}>
                  <Pencil className="mr-1 h-3 w-3" />Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => setTestEmailDialogId(template.id)}>
                  <Send className="mr-1 h-3 w-3" />Send Test
                </Button>
                {!template.isDefault && (
                  <Button variant="outline" size="sm" onClick={() => handleDelete(template.id)} disabled={isPending}>
                    <Trash2 className="mr-1 h-3 w-3 text-destructive" />Delete
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Send Test Email Dialog */}
      <Dialog open={testEmailDialogId !== null} onOpenChange={(open) => { if (!open) setTestEmailDialogId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
            <DialogDescription>
              Send a test email with sample data to verify the template looks correct.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="testEmail">Email Address</Label>
              <Input
                id="testEmail"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <Button onClick={handleSendTest} disabled={isPending || !testEmail}>
              {isPending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Send className="mr-1 h-3 w-3" />}
              Send Test
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
