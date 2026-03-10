import { inngest } from "../client";
import * as Sentry from "@sentry/nextjs";
import { incrementalSync, initialSync } from "@/lib/qbo/sync";
import prisma from "@/lib/db";

/**
 * Inngest function: sync invoices for a specific organization.
 * Triggered by the "qbo/sync.requested" event.
 */
export const syncInvoices = inngest.createFunction(
  {
    id: "sync-invoices",
    name: "Sync QBO Invoices",
    retries: 2,
  },
  { event: "qbo/sync.requested" },
  async ({ event }) => {
    const { orgId } = event.data as { orgId: string };

    const connection = await prisma.quickBooksConnection.findUnique({
      where: { organizationId: orgId },
    });

    if (!connection) {
      console.log("[Sync] No QBO connection for org: " + orgId);
      return { skipped: true, reason: "no_connection" };
    }

    if (connection.syncStatus === "disconnected") {
      console.log("[Sync] QBO disconnected for org: " + orgId);
      return { skipped: true, reason: "disconnected" };
    }

    try {
      let result;
      if (!connection.lastSyncAt) {
        result = await initialSync(orgId);
      } else {
        result = await incrementalSync(orgId);
      }

      console.log("[Sync] Completed for org " + orgId + ": " + JSON.stringify(result));
      return result;
    } catch (error) {
      Sentry.captureException(error);
      console.error("[Sync] Failed for org " + orgId + ":", error);
      throw error;
    }
  }
);
