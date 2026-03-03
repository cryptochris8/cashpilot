"use client";

import { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const CURRENT_VERSION = "0.6.0";
const STORAGE_KEY = "cashpilot-last-seen-version";

const changelog = [
  {
    version: "0.6.0",
    date: "March 2026",
    changes: [
      "Help Center with searchable documentation",
      "Keyboard shortcuts for quick navigation",
      "In-app notification system",
      "Data export for GDPR compliance",
      "Security hardening with rate limiting and CSP headers",
      "Dashboard Quick Actions panel",
      "Floating support widget",
      "Print-optimized layouts",
      "Responsive design improvements",
    ],
  },
  {
    version: "0.5.0",
    date: "February 2026",
    changes: [
      "Customer detail pages with payment history",
      "Professional email templates with variable support",
      "Email analytics with delivery tracking",
      "Aging report with export to CSV",
      "Bulk actions on pipeline",
    ],
  },
  {
    version: "0.4.0",
    date: "January 2026",
    changes: [
      "Collections pipeline with drag-and-drop",
      "Reminder engine with cadence support",
      "Stripe billing integration",
      "Feature gating by plan tier",
      "Onboarding flow for new users",
    ],
  },
];

export function WhatsNew() {
  const [hasNew, setHasNew] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const lastSeen = localStorage.getItem(STORAGE_KEY);
    if (lastSeen !== CURRENT_VERSION) {
      setHasNew(true);
    }
  }, []);

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      localStorage.setItem(STORAGE_KEY, CURRENT_VERSION);
      setHasNew(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-2 rounded-md px-3 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors w-full">
          <Sparkles className="h-3.5 w-3.5" />
          <span>{"What's New"}</span>
          {hasNew && (
            <Badge variant="default" className="ml-auto h-4 px-1 text-[10px]">
              New
            </Badge>
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {"What's New in CashPilot"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-2">
          {changelog.map((release) => (
            <div key={release.version}>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={release.version === CURRENT_VERSION ? "default" : "secondary"}>
                  v{release.version}
                </Badge>
                <span className="text-xs text-muted-foreground">{release.date}</span>
              </div>
              <ul className="space-y-1.5">
                {release.changes.map((change, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {change}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
