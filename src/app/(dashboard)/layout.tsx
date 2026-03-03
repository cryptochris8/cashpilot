"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Kanban, FileText, Users, Mail, Bell, Settings, DollarSign, BarChart3, Clock,
  Menu, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { SupportWidget } from "@/components/support/support-widget";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { ShortcutsDialog } from "@/components/ui/shortcuts-dialog";
import { WhatsNew } from "@/components/ui/whats-new";
import { useKeyboardShortcuts } from "@/lib/hooks/use-keyboard-shortcuts";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Pipeline", href: "/pipeline", icon: Kanban },
  { label: "Invoices", href: "/invoices", icon: FileText },
  { label: "Customers", href: "/customers", icon: Users },
  { label: "Aging", href: "/aging", icon: Clock },
  { label: "Templates", href: "/templates", icon: Mail },
  { label: "Reminders", href: "/reminders", icon: Bell },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useKeyboardShortcuts({
    onShowHelp: () => setShortcutsOpen(true),
  });

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-col border-r bg-muted/40 md:flex print:hidden">
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <DollarSign className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold">CashPilot</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors", isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <Separator />
        <div className="p-3 space-y-1">
          <WhatsNew />
          <button
            onClick={() => setShortcutsOpen(true)}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors w-full"
          >
            <kbd className="inline-flex h-4 min-w-4 items-center justify-center rounded border bg-muted px-1 font-mono text-[9px]">?</kbd>
            <span>Keyboard Shortcuts</span>
          </button>
        </div>
        <div className="px-4 pb-3 text-xs text-muted-foreground">CashPilot v0.6.0</div>
      </aside>

      {/* Mobile Header */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b px-4 md:justify-end print:hidden">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
          >
            {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          <div className="flex items-center gap-1 md:hidden">
            <DollarSign className="h-5 w-5 text-primary" />
            <span className="font-bold">CashPilot</span>
          </div>

          {/* Header right side */}
          <div className="flex items-center gap-2">
            <NotificationBell />
          </div>
        </header>

        {/* Mobile Navigation */}
        {mobileNavOpen && (
          <nav className="border-b bg-muted/40 p-3 md:hidden print:hidden">
            <div className="space-y-1">
              {navItems.map((item) => {
                const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileNavOpen(false)}
                    className={cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors", isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground")}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6">{children}</div>
        </main>
      </div>

      {/* Support Widget */}
      <SupportWidget />

      {/* Shortcuts Dialog */}
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  );
}
