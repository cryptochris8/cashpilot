"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

const routeLabels: Record<string, string> = {
  "": "Dashboard",
  pipeline: "Pipeline",
  invoices: "Invoices",
  customers: "Customers",
  templates: "Templates",
  reminders: "Reminders",
  analytics: "Analytics",
  settings: "Settings",
  aging: "Aging Report",
};

export function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  const crumbs: Array<{ label: string; href: string }> = [
    { label: "Dashboard", href: "/" },
  ];

  let currentPath = "";
  for (const segment of segments) {
    currentPath += "/" + segment;
    const label = routeLabels[segment] || segment;
    crumbs.push({ label, href: currentPath });
  }

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
      {crumbs.map((crumb, i) => (
        <span key={crumb.href} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="h-3 w-3" />}
          {i === crumbs.length - 1 ? (
            <span className="font-medium text-foreground">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="hover:text-foreground transition-colors">
              {i === 0 ? <Home className="h-3.5 w-3.5" /> : crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
