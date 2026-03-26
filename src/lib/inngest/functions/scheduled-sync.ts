import { inngest } from "../client";
import * as Sentry from "@sentry/nextjs";
import { incrementalSync } from "@/lib/qbo/sync";
import prisma from "@/lib/db";
import pLimit from "p-limit";

/**
 * Inngest cron function: run incremental sync for all active QBO connections
 * every 15 minutes.
 */
export const scheduledSync = inngest.createFunction(
  {
    id: "scheduled-sync",
    name: "Scheduled QBO Sync",
    retries: 1,
  },
  { cron: "*/15 * * * *" },
  async () => {
    // Find all organizations with active QBO connections
    const connections = await prisma.quickBooksConnection.findMany({
      where: {
        syncStatus: { not: "disconnected" },
      },
      include: {
        organization: true,
      },
    });

    console.log("[Scheduled Sync] Found " + connections.length + " active connections");

    const limit = pLimit(5);

    async function processOrg(connection: (typeof connections)[number]): Promise<{
      orgId: string;
      success: boolean;
      error?: string;
    }> {
      if (!connection.lastSyncAt) {
        // Skip initial sync in scheduled runs - it should be triggered manually
        console.log("[Scheduled Sync] Skipping org " + connection.organizationId + " - needs initial sync");
        return {
          orgId: connection.organizationId,
          success: false,
          error: "needs_initial_sync",
        };
      }

      try {
        const result = await incrementalSync(connection.organizationId);
        console.log(
          "[Scheduled Sync] Org " + connection.organizationId +
          ": " + result.invoicesUpserted + " invoices, " +
          result.customersUpserted + " customers"
        );
        return { orgId: connection.organizationId, success: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        Sentry.captureException(error);
        console.error(
          "[Scheduled Sync] Failed for org " + connection.organizationId + ":",
          message
        );

        // Mark connection as error if sync fails
        try {
          await prisma.quickBooksConnection.update({
            where: { id: connection.id },
            data: {
              syncStatus: "error",
              syncError: message,
            },
          });
        } catch {
          // Ignore update errors
        }

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
      console.error("[Scheduled Sync] Unexpected failure for org " + connections[i].organizationId + ":", message);
      return { orgId: connections[i].organizationId, success: false, error: message };
    });

    return {
      connectionsProcessed: connections.length,
      results,
    };
  }
);
