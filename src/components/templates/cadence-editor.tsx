"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Save, Loader2, ArrowUp, ArrowDown } from "lucide-react";

interface TemplateOption {
  id: string;
  name: string;
}

interface CadenceStepData {
  templateId: string;
  templateName?: string;
  daysRelativeToDue: number;
}

interface CadenceEditorProps {
  steps: CadenceStepData[];
  templates: TemplateOption[];
  onSave: (steps: Array<{ templateId: string; daysRelativeToDue: number }>) => Promise<void>;
  saving?: boolean;
}

function formatDayOffset(days: number): string {
  if (days < 0) return Math.abs(days) + " days before due";
  if (days === 0) return "On due date";
  return days + " days after due";
}

export function CadenceEditor({ steps: initialSteps, templates, onSave, saving }: CadenceEditorProps) {
  const [steps, setSteps] = useState<CadenceStepData[]>(initialSteps);

  const addStep = () => {
    if (templates.length === 0) return;
    setSteps([...steps, { templateId: templates[0].id, templateName: templates[0].name, daysRelativeToDue: 0 }]);
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, field: keyof CadenceStepData, value: string | number) => {
    const newSteps = [...steps];
    if (field === "templateId") {
      newSteps[index] = { ...newSteps[index], templateId: value as string, templateName: templates.find((t) => t.id === value)?.name };
    } else if (field === "daysRelativeToDue") {
      newSteps[index] = { ...newSteps[index], daysRelativeToDue: Number(value) };
    }
    setSteps(newSteps);
  };

  const moveStep = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= steps.length) return;
    const newSteps = [...steps];
    [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];
    setSteps(newSteps);
  };

  const handleSave = async () => {
    await onSave(steps.map((s) => ({ templateId: s.templateId, daysRelativeToDue: s.daysRelativeToDue })));
  };

  const sortedForTimeline = [...steps].sort((a, b) => a.daysRelativeToDue - b.daysRelativeToDue);

  return (
    <div className="space-y-6">
      {/* Visual Timeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Cadence Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedForTimeline.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No steps configured. Add a step below.</p>
          ) : (
            <div className="relative">
              <div className="absolute left-4 top-0 h-full w-0.5 bg-border" />
              <div className="space-y-4">
                {sortedForTimeline.map((step, i) => (
                  <div key={i} className="relative flex items-center gap-3 pl-10">
                    <div className="absolute left-2.5 h-3 w-3 rounded-full border-2 border-primary bg-background" />
                    <Badge variant={step.daysRelativeToDue <= 0 ? "secondary" : "destructive"} className="text-xs">
                      {step.daysRelativeToDue < 0 ? "Day " + step.daysRelativeToDue : step.daysRelativeToDue === 0 ? "Day 0" : "Day +" + step.daysRelativeToDue}
                    </Badge>
                    <span className="text-sm">{step.templateName || "Unknown Template"}</span>
                    <span className="text-xs text-muted-foreground">({formatDayOffset(step.daysRelativeToDue)})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step Editor */}
      <div className="space-y-3">
        <Label>Cadence Steps</Label>
        {steps.map((step, index) => (
          <div key={index} className="flex items-center gap-2 rounded-md border p-3">
            <div className="flex flex-col gap-1">
              <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => moveStep(index, -1)} disabled={index === 0}>
                <ArrowUp className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => moveStep(index, 1)} disabled={index === steps.length - 1}>
                <ArrowDown className="h-3 w-3" />
              </Button>
            </div>
            <Select value={step.templateId} onValueChange={(v) => updateStep(index, "templateId", v)}>
              <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1">
              <Label className="text-xs whitespace-nowrap">Day offset:</Label>
              <Input
                type="number"
                value={step.daysRelativeToDue}
                onChange={(e) => updateStep(index, "daysRelativeToDue", parseInt(e.target.value) || 0)}
                className="w-20 h-8 text-xs"
              />
            </div>
            <Button variant="ghost" size="sm" onClick={() => removeStep(index)}>
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        ))}

        <Button variant="outline" size="sm" onClick={addStep}>
          <Plus className="mr-1 h-3 w-3" />Add Step
        </Button>
      </div>

      <Button onClick={handleSave} disabled={saving || steps.length === 0}>
        {saving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Save className="mr-1 h-3 w-3" />}
        Save Cadence
      </Button>
    </div>
  );
}
