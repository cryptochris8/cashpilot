"use client";

import { useState } from "react";
import Link from "next/link";
import { HelpCircle, Search, Mail, BookOpen, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Floating support widget.
 *
 * TODO: Replace with Intercom/Crisp integration when ready.
 * For now, provides quick access to help articles and email support.
 */
export function SupportWidget() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  return (
    <div className="fixed bottom-6 right-6 z-50 print:hidden">
      {/* Panel */}
      {open && (
        <div className="mb-3 w-80 rounded-lg border bg-card shadow-lg">
          <div className="flex items-center justify-between border-b p-4">
            <h3 className="text-sm font-semibold">Need Help?</h3>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setOpen(false)}
              aria-label="Close support panel"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="p-4 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search help articles..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-9 pl-8 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && query.trim()) {
                    window.open("/help?q=" + encodeURIComponent(query), "_blank");
                  }
                }}
              />
            </div>

            {/* Links */}
            <div className="space-y-2">
              <Link
                href="/help"
                className="flex items-center gap-2 rounded-md p-2 text-sm hover:bg-muted transition-colors"
                onClick={() => setOpen(false)}
              >
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                Visit Help Center
              </Link>
              <a
                href="mailto:support@cashpilot.com?subject=CashPilot%20Support%20Request"
                className="flex items-center gap-2 rounded-md p-2 text-sm hover:bg-muted transition-colors"
              >
                <Mail className="h-4 w-4 text-muted-foreground" />
                Email us at support@cashpilot.com
              </a>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              We typically respond within 24 hours.
            </p>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <Button
        onClick={() => setOpen(!open)}
        size="lg"
        className="h-12 w-12 rounded-full shadow-lg"
        aria-label={open ? "Close support panel" : "Open support panel"}
        aria-expanded={open}
      >
        {open ? (
          <X className="h-5 w-5" />
        ) : (
          <HelpCircle className="h-5 w-5" />
        )}
      </Button>
    </div>
  );
}
