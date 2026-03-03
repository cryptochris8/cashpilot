import { inngest } from "../client";
import { evaluateReminders, executeReminders } from "@/lib/reminders/engine";
import prisma from "@/lib/db";

/**
 * Inngest cron function: evaluate and execute reminders daily at 9:00 AM UTC.
 * Processes each org independently so one failure does not block others.
 */
export const executeRemindersJob = inngest.createFunction(
  {
    id: "execute-reminders",
    name: "Execute Daily Reminders",
    retries: 1,
  },
  { cron: "0 9 * * *" },
  async () => {
    // Find all orgs with active QBO connections
    const connections = await prisma.quickBooksConnection.findMany({
      where: { syncStatus: { not: "disconnected" } },
      include: { organization: true },
    });

    console.log("[Reminders] Processing " + connections.length + " organizations");

    const results: Array<{
      orgId: string;
      success: boolean;
      sent?: number;
      failed?: number;
      error?: string;
    }> = [];

    for (const connection of connections) {
      try {
        const remindersToSend = await evaluateReminders(connection.organizationId);

        if (remindersToSend.length === 0) {
          results.push({ orgId: connection.organizationId, success: true, sent: 0, failed: 0 });
          continue;
        }

        const result = await executeReminders(remindersToSend);

        console.log(
          "[Reminders] Org " + connection.organizationId +
          ": sent=" + result.sent + ", failed=" + result.failed
        );

        results.push({
          orgId: connection.organizationId,
          success: true,
          sent: result.sent,
          failed: result.failed,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[Reminders] Failed for org " + connection.organizationId + ":", message);
        results.push({
          orgId: connection.organizationId,
          success: false,
          error: message,
        });
      }
    }

    return {
      orgsProcessed: connections.length,
      results,
    };
  }
);
