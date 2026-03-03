"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createNote } from "@/app/actions/notes";
import { Loader2, Plus } from "lucide-react";
import type { NoteType } from "@prisma/client";

interface NoteData {
  id: string;
  authorId: string;
  content: string;
  noteType: string;
  createdAt: string | Date;
}

interface InvoiceNotesProps {
  invoiceId: string;
  notes: NoteData[];
  onNoteAdded?: () => void;
}

const noteTypeColors: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  GENERAL: "secondary",
  DISPUTE: "destructive",
  PROMISE_TO_PAY: "default",
  ESCALATION: "destructive",
};

const noteTypeLabels: Record<string, string> = {
  GENERAL: "General",
  DISPUTE: "Dispute",
  PROMISE_TO_PAY: "Promise to Pay",
  ESCALATION: "Escalation",
};

function formatNoteDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function InvoiceNotes({
  invoiceId,
  notes,
  onNoteAdded,
}: InvoiceNotesProps) {
  const [content, setContent] = useState("");
  const [noteType, setNoteType] = useState<NoteType>("GENERAL");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    startTransition(async () => {
      await createNote(invoiceId, content.trim(), noteType);
      setContent("");
      onNoteAdded?.();
    });
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold">Notes</h4>

      {/* Notes list */}
      <div className="max-h-[300px] space-y-2 overflow-y-auto">
        {notes.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            No notes yet
          </p>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className="rounded-md border p-3 text-sm"
            >
              <div className="mb-1 flex items-center gap-2">
                <span className="text-xs font-medium">
                  {note.authorId === "system" ? "System" : "User"}
                </span>
                <Badge
                  variant={noteTypeColors[note.noteType] ?? "outline"}
                  className="text-[10px]"
                >
                  {noteTypeLabels[note.noteType] ?? note.noteType}
                </Badge>
                <span className="ml-auto text-[10px] text-muted-foreground">
                  {formatNoteDate(note.createdAt)}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-xs text-muted-foreground">
                {note.content}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Add note form */}
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <div className="flex-1 space-y-1">
          <Select
            value={noteType}
            onValueChange={(v) => setNoteType(v as NoteType)}
          >
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GENERAL">General</SelectItem>
              <SelectItem value="DISPUTE">Dispute</SelectItem>
              <SelectItem value="PROMISE_TO_PAY">Promise to Pay</SelectItem>
              <SelectItem value="ESCALATION">Escalation</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Add a note..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
        <Button type="submit" size="sm" disabled={isPending || !content.trim()}>
          {isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Plus className="h-3 w-3" />
          )}
        </Button>
      </form>
    </div>
  );
}
