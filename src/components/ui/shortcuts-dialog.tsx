"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const shortcuts = [
  { category: "Navigation", items: [
    { keys: ["g", "d"], description: "Go to Dashboard" },
    { keys: ["g", "i"], description: "Go to Invoices" },
    { keys: ["g", "p"], description: "Go to Pipeline" },
    { keys: ["g", "c"], description: "Go to Customers" },
    { keys: ["g", "a"], description: "Go to Aging Report" },
  ]},
  { category: "Actions", items: [
    { keys: ["s"], description: "Trigger QuickBooks Sync" },
    { keys: ["?"], description: "Show Keyboard Shortcuts" },
  ]},
];

function KeyBadge({ children }: { children: string }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
      {children}
    </kbd>
  );
}

export function ShortcutsDialog({ open, onOpenChange }: ShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-2">
          {shortcuts.map((group) => (
            <div key={group.category}>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.category}
              </h3>
              <div className="space-y-2">
                {group.items.map((item) => (
                  <div
                    key={item.description}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm">{item.description}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((key, i) => (
                        <span key={i} className="flex items-center gap-1">
                          {i > 0 && (
                            <span className="text-xs text-muted-foreground">
                              then
                            </span>
                          )}
                          <KeyBadge>{key}</KeyBadge>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
