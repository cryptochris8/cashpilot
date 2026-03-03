
import os

def a(slug, title, cat, catLabel, content_lines, related):
    r = []
    r.append('  {')
    r.append('    slug: "' + slug + '",')
    r.append('    title: "' + title + '",')
    r.append('    category: "' + cat + '",')
    r.append('    categoryLabel: "' + catLabel + '",')
    r.append('    content: [')
    for cl in content_lines:
        escaped = cl.replace(chr(92), chr(92)+chr(92)).replace(chr(34), chr(92)+chr(34))
        r.append('      "' + escaped + '",')
    r.append('    ].join("' + chr(92) + 'n"),')
    rel = ', '.join(['"' + x + '"' for x in related])
    r.append('    relatedSlugs: [' + rel + '],')
    r.append('  },')
    return r

lines = []
lines.append("""/**
 * Help article data for CashPilot help center.
 * Self-contained - no external CMS needed.
 */

export interface HelpArticle {
  slug: string;
  title: string;
  category: string;
  categoryLabel: string;
  content: string;
  relatedSlugs: string[];
}

export const HELP_CATEGORIES = [
  { id: "getting-started", label: "Getting Started", description: "Learn the basics of CashPilot" },
  { id: "quickbooks", label: "QuickBooks Integration", description: "Connect and sync with QuickBooks Online" },
  { id: "reminders", label: "Managing Reminders", description: "Set up and manage payment reminders" },
  { id: "billing", label: "Billing & Account", description: "Manage your subscription and account" },
] as const;

export const helpArticles: HelpArticle[] = [""")

lines.extend(a("connecting-quickbooks", "Connecting QuickBooks", "getting-started", "Getting Started", [
    "## Connecting QuickBooks to CashPilot", "",
    "CashPilot integrates directly with QuickBooks Online to automatically import your invoices and customer data.", "",
    "### How to Connect", "",
    "1. Navigate to **Settings** from the dashboard sidebar.",
    "2. In the **QuickBooks Connection** card, click **Connect QuickBooks**.",
    "3. You will be redirected to the Intuit authorization page.",
    "4. Grant CashPilot permission to access your company data.",
    "5. You will be redirected back to CashPilot with a success message.", "",
    "### After Connecting", "",
    "Once connected, click **Sync Now** to import your invoices and customers for the first time.", "",
    "### What Permissions Are Needed?", "",
    "CashPilot requests read access to your invoices and customers. We do not modify any data in your QuickBooks account.", "",
    "### Troubleshooting", "",
    "If the connection fails, check that:",
    "- You are using QuickBooks **Online** (not Desktop)",
    "- You have admin access to your QuickBooks company",
    "- Pop-ups are not blocked in your browser",
], ["understanding-dashboard", "troubleshooting-sync", "what-data-we-sync"]))

print("Script running...")
