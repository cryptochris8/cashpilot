"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReminderList } from "@/components/reminders/reminder-list";
import { CadenceEditor } from "@/components/templates/cadence-editor";
import { getCadence, ensureDefaultCadence, updateCadence } from "@/app/actions/cadences";
import { getTemplates, ensureDefaultTemplates } from "@/app/actions/templates";
import { Loader2, Settings } from "lucide-react";

interface ReminderData {
  id: string;
  invoiceNumber: string | null;
  customerName: string;
  subject: string | null;
  sentAt: string;
  deliveryStatus: string;
  channel: string;
}

interface CadenceData {
  id: string;
  name: string;
  isActive: boolean;
  steps: Array<{
    id: string;
    templateId: string;
    daysRelativeToDue: number;
    template: { id: string; name: string };
  }>;
}

interface TemplateOption {
  id: string;
  name: string;
}

export default function RemindersPage() {
  const [reminders, setReminders] = useState<ReminderData[]>([]);
  const [cadence, setCadence] = useState<CadenceData | null>(null);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCadenceEditor, setShowCadenceEditor] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isPending, startTransition] = useTransition();

  const fetchData = useCallback(async () => {
    try {
      // Ensure defaults exist
      await ensureDefaultTemplates();
      await ensureDefaultCadence();

      // Fetch data in parallel
      const [remindersRes, cadenceResult, templatesResult] = await Promise.all([
        fetch("/api/reminders"),
        getCadence(),
        getTemplates(),
      ]);

      if (remindersRes.ok) {
        const remindersData = await remindersRes.json();
        setReminders(
          remindersData.map((r: { id: string; subject: string | null; sentAt: string; deliveryStatus: string; channel: string; invoice: { invoiceNumber: string | null; customer: { displayName: string } } }) => ({
            id: r.id,
            invoiceNumber: r.invoice?.invoiceNumber ?? null,
            customerName: r.invoice?.customer?.displayName ?? "Unknown",
            subject: r.subject,
            sentAt: r.sentAt,
            deliveryStatus: r.deliveryStatus,
            channel: r.channel,
          }))
        );
      }

      if ("data" in cadenceResult && cadenceResult.data && typeof cadenceResult.data === "object" && "id" in cadenceResult.data) {
        setCadence(cadenceResult.data as unknown as CadenceData);
      }

      if ("data" in templatesResult && templatesResult.data) {
        setTemplates(
          (templatesResult.data as Array<{ id: string; name: string }>).map((t) => ({
            id: t.id,
            name: t.name,
          }))
        );
      }
    } catch {
      // Handle error
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSaveCadence = async (steps: Array<{ templateId: string; daysRelativeToDue: number }>) => {
    if (!cadence) return;
    setSaving(true);
    await updateCadence(cadence.id, steps);
    setSaving(false);
    setShowCadenceEditor(false);
    await fetchData();
  };

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reminders</h1>
          <p className="text-muted-foreground">View reminder history and manage your collection cadence.</p>
        </div>
        <Button variant="outline" onClick={() => setShowCadenceEditor(!showCadenceEditor)}>
          <Settings className="mr-1 h-4 w-4" />
          {showCadenceEditor ? "Hide Cadence Settings" : "Cadence Settings"}
        </Button>
      </div>

      {showCadenceEditor && cadence && (
        <Card>
          <CardHeader>
            <CardTitle>Cadence Configuration</CardTitle>
            <CardDescription>Configure when reminders are sent relative to the invoice due date.</CardDescription>
          </CardHeader>
          <CardContent>
            <CadenceEditor
              steps={cadence.steps.map((s) => ({
                templateId: s.templateId,
                templateName: s.template.name,
                daysRelativeToDue: s.daysRelativeToDue,
              }))}
              templates={templates}
              onSave={handleSaveCadence}
              saving={saving}
            />
          </CardContent>
        </Card>
      )}

      {/* Active Cadence Summary */}
      {cadence && !showCadenceEditor && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Active Cadence: {cadence.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {cadence.steps.map((step) => (
                <Badge key={step.id} variant="outline" className="text-xs">
                  {step.daysRelativeToDue < 0
                    ? "Day " + step.daysRelativeToDue
                    : step.daysRelativeToDue === 0
                    ? "Day 0"
                    : "Day +" + step.daysRelativeToDue}
                  : {step.template.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reminder History */}
      <Card>
        <CardHeader>
          <CardTitle>Reminder History</CardTitle>
        </CardHeader>
        <CardContent>
          {reminders.length === 0 ? (
            <div className="flex h-[200px] items-center justify-center">
              <p className="text-sm text-muted-foreground">
                No reminders sent yet. Set up a cadence and the system will automatically send reminders.
              </p>
            </div>
          ) : (
            <ReminderList reminders={reminders} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
