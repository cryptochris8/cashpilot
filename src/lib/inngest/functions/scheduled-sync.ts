import { inngest } from "../client";
import { incrementalSync } from "@/lib/qbo/sync";
import prisma from "@/lib/db";

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

    const results: Array<{
      orgId: string;
      success: boolean;
      error?: string;
    }> = [];

    for (const connection of connections) {
      try {
        if (!connection.lastSyncAt) {
          // Skip initial sync in scheduled runs - it should be triggered manually
          console.log("[Scheduled Sync] Skipping org " + connection.organizationId + " - needs initial sync");
          results.push({
            orgId: connection.organizationId,
            success: false,
            error: "needs_initial_sync",
          });
          continue;
        }

        const result = await incrementalSync(connection.organizationId);
        console.log(
          "[Scheduled Sync] Org " + connection.organizationId +
          ": " + result.invoicesUpserted + " invoices, " +
          result.customersUpserted + " customers"
        );
        results.push({ orgId: connection.organizationId, success: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
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

        results.push({
          orgId: connection.organizationId,
          success: false,
          error: message,
        });
      }
    }

    return {
      connectionsProcessed: connections.length,
      results,
    };
  }
);
