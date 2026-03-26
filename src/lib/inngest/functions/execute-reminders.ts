import { inngest } from "../client";
import * as Sentry from "@sentry/nextjs";
import { evaluateReminders, executeReminders } from "@/lib/reminders/engine";
import prisma from "@/lib/db";
import pLimit from "p-limit";

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

    const limit = pLimit(5);

    async function processOrg(connection: (typeof connections)[number]): Promise<{
      orgId: string;
      success: boolean;
      sent?: number;
      failed?: number;
      error?: string;
    }> {
      try {
        const remindersToSend = await evaluateReminders(connection.organizationId);

        if (remindersToSend.length === 0) {
          return { orgId: connection.organizationId, success: true, sent: 0, failed: 0 };
        }

        const result = await executeReminders(remindersToSend);

        console.log(
          "[Reminders] Org " + connection.organizationId +
          ": sent=" + result.sent + ", failed=" + result.failed
        );

        return {
          orgId: connection.organizationId,
          success: true,
          sent: result.sent,
          failed: result.failed,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        Sentry.captureException(error);
        console.error("[Reminders] Failed for org " + connection.organizationId + ":", message);
        return {
          orgId: connection.organizationId,
          success: false,
          error: message,
        };
      }
    }

    const settled = await Promise.allSettled(
      connections.map((conn) => limit(() => processOrg(conn)))
    );

    const results = settled.map((outcome, i) => {
      if (outcome.status === "fulfilled") return outcome.value;
      // processOrg already catches its own errors, but handle unexpected rejections
      const message = outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason);
      Sentry.captureException(outcome.reason);
      console.error("[Reminders] Unexpected failure for org " + connections[i].organizationId + ":", message);
      return { orgId: connections[i].organizationId, success: false, error: message };
    });

    return {
      orgsProcessed: connections.length,
      results,
    };
  }
);
