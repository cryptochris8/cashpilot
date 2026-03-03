import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { syncInvoices } from "@/lib/inngest/functions/sync-invoices";
import { scheduledSync } from "@/lib/inngest/functions/scheduled-sync";
import { executeRemindersJob } from "@/lib/inngest/functions/execute-reminders";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [syncInvoices, scheduledSync, executeRemindersJob],
});
