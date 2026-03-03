import prisma from "@/lib/db";
import { QBOClient } from "./client";
import { QBOSyncError } from "./errors";
import type { QboInvoice, SyncResult } from "./types";
import { InvoiceStatus, PipelineStage } from "@prisma/client";

/**
 * Derive the local InvoiceStatus from a QBO invoice.
 */
function deriveInvoiceStatus(qboInvoice: QboInvoice): InvoiceStatus {
  if (qboInvoice.Balance <= 0) return InvoiceStatus.PAID;
  const dueDate = new Date(qboInvoice.DueDate);
  const now = new Date();
  return dueDate < now ? InvoiceStatus.OVERDUE : InvoiceStatus.OPEN;
}

/**
 * Derive the pipeline stage for an invoice.
 */
function derivePipelineStage(
  status: InvoiceStatus,
  existingStage?: PipelineStage
): PipelineStage {
  if (status === InvoiceStatus.PAID) return PipelineStage.RESOLVED;
  if (status === InvoiceStatus.OVERDUE) {
    // If already in a later stage, keep it
    if (
      existingStage === PipelineStage.ESCALATED ||
      existingStage === PipelineStage.REMINDER_SENT ||
      existingStage === PipelineStage.FOLLOW_UP
    ) {
      return existingStage;
    }
    return PipelineStage.FOLLOW_UP;
  }
  // OPEN invoice
  if (existingStage) return existingStage;
  return PipelineStage.NEW;
}

/**
 * Calculate days overdue from a due date. Returns 0 if not yet due.
 */
function calculateDaysOverdue(dueDate: Date): number {
  const now = new Date();
  const diffMs = now.getTime() - dueDate.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, days);
}

/**
 * Map a QBO invoice to the shape expected by our local database.
 */
export function mapQboInvoiceToLocal(
  qboInvoice: QboInvoice,
  orgId: string,
  customerId: string,
  existingStage?: PipelineStage
) {
  const status = deriveInvoiceStatus(qboInvoice);
  const pipelineStage = derivePipelineStage(status, existingStage);
  const _daysOverdue = calculateDaysOverdue(new Date(qboInvoice.DueDate));

  return {
    organizationId: orgId,
    customerId,
    qboInvoiceId: qboInvoice.Id,
    invoiceNumber: qboInvoice.DocNumber ?? null,
    issueDate: new Date(qboInvoice.TxnDate),
    dueDate: new Date(qboInvoice.DueDate),
    totalAmount: qboInvoice.TotalAmt,
    balance: qboInvoice.Balance,
    status,
    pipelineStage,
  };
}

/**
 * Initial sync: fetch ALL open/overdue invoices and active customers from QBO.
 */
export async function initialSync(orgId: string): Promise<SyncResult> {
  const errors: string[] = [];
  let customersUpserted = 0;
  let invoicesUpserted = 0;
  let invoicesPaid = 0;

  const connection = await prisma.quickBooksConnection.findUnique({
    where: { organizationId: orgId },
  });

  if (!connection) {
    throw new QBOSyncError("QuickBooks is not connected for this organization.");
  }

  await prisma.quickBooksConnection.update({
    where: { id: connection.id },
    data: { syncStatus: "syncing", syncError: null },
  });

  try {
    const client = new QBOClient(orgId);

    // Fetch all active customers
    const qboCustomers = await client.fetchCustomers();
    for (const qboCustomer of qboCustomers) {
      try {
        await prisma.customer.upsert({
          where: {
            organizationId_qboCustomerId: {
              organizationId: orgId,
              qboCustomerId: qboCustomer.Id,
            },
          },
          create: {
            organizationId: orgId,
            qboCustomerId: qboCustomer.Id,
            displayName: qboCustomer.DisplayName,
            email: qboCustomer.PrimaryEmailAddr?.Address ?? null,
            phone: qboCustomer.PrimaryPhone?.FreeFormNumber ?? null,
          },
          update: {
            displayName: qboCustomer.DisplayName,
            email: qboCustomer.PrimaryEmailAddr?.Address ?? null,
            phone: qboCustomer.PrimaryPhone?.FreeFormNumber ?? null,
          },
        });
        customersUpserted++;
      } catch (err) {
        errors.push("Failed to upsert customer " + qboCustomer.Id + ": " + String(err));
      }
    }

    // Fetch all open invoices (Balance > 0)
    const qboInvoices = await client.fetchInvoices({ openOnly: true });

    for (const qboInvoice of qboInvoices) {
      try {
        const customer = await prisma.customer.findUnique({
          where: {
            organizationId_qboCustomerId: {
              organizationId: orgId,
              qboCustomerId: qboInvoice.CustomerRef.value,
            },
          },
        });

        if (!customer) {
          errors.push("Customer not found for invoice " + qboInvoice.Id);
          continue;
        }

        const mapped = mapQboInvoiceToLocal(qboInvoice, orgId, customer.id);

        await prisma.invoice.upsert({
          where: {
            organizationId_qboInvoiceId: {
              organizationId: orgId,
              qboInvoiceId: qboInvoice.Id,
            },
          },
          create: mapped,
          update: {
            customerId: mapped.customerId,
            invoiceNumber: mapped.invoiceNumber,
            issueDate: mapped.issueDate,
            dueDate: mapped.dueDate,
            totalAmount: mapped.totalAmount,
            balance: mapped.balance,
            status: mapped.status,
            pipelineStage: mapped.pipelineStage,
          },
        });
        invoicesUpserted++;
      } catch (err) {
        errors.push("Failed to upsert invoice " + qboInvoice.Id + ": " + String(err));
      }
    }

    await prisma.quickBooksConnection.update({
      where: { id: connection.id },
      data: {
        syncStatus: "idle",
        lastSyncAt: new Date(),
        syncError: errors.length > 0 ? errors.join("; ") : null,
      },
    });
  } catch (err) {
    await prisma.quickBooksConnection.update({
      where: { id: connection.id },
      data: { syncStatus: "error", syncError: String(err) },
    });
    throw err;
  }

  return { customersUpserted, invoicesUpserted, invoicesPaid, errors };
}

/**
 * Incremental sync: fetch only invoices updated since lastSyncAt.
 */
export async function incrementalSync(orgId: string): Promise<SyncResult> {
  const errors: string[] = [];
  let customersUpserted = 0;
  let invoicesUpserted = 0;
  let invoicesPaid = 0;

  const connection = await prisma.quickBooksConnection.findUnique({
    where: { organizationId: orgId },
  });

  if (!connection) {
    throw new QBOSyncError("QuickBooks is not connected for this organization.");
  }

  if (!connection.lastSyncAt) {
    return initialSync(orgId);
  }

  await prisma.quickBooksConnection.update({
    where: { id: connection.id },
    data: { syncStatus: "syncing", syncError: null },
  });

  try {
    const client = new QBOClient(orgId);

    // Fetch invoices updated since last sync (includes paid, voided, etc.)
    const qboInvoices = await client.fetchInvoicesUpdatedSince(connection.lastSyncAt);

    // Collect unique customer IDs from changed invoices
    const customerIds = new Set<string>();
    for (const inv of qboInvoices) {
      customerIds.add(inv.CustomerRef.value);
    }

    // Fetch and upsert customers for changed invoices
    if (customerIds.size > 0) {
      const qboCustomers = await client.fetchCustomers();
      const relevantCustomers = qboCustomers.filter((c) => customerIds.has(c.Id));
      for (const qboCustomer of relevantCustomers) {
        try {
          await prisma.customer.upsert({
            where: {
              organizationId_qboCustomerId: {
                organizationId: orgId,
                qboCustomerId: qboCustomer.Id,
              },
            },
            create: {
              organizationId: orgId,
              qboCustomerId: qboCustomer.Id,
              displayName: qboCustomer.DisplayName,
              email: qboCustomer.PrimaryEmailAddr?.Address ?? null,
              phone: qboCustomer.PrimaryPhone?.FreeFormNumber ?? null,
            },
            update: {
              displayName: qboCustomer.DisplayName,
              email: qboCustomer.PrimaryEmailAddr?.Address ?? null,
              phone: qboCustomer.PrimaryPhone?.FreeFormNumber ?? null,
            },
          });
          customersUpserted++;
        } catch (err) {
          errors.push("Failed to upsert customer " + qboCustomer.Id + ": " + String(err));
        }
      }
    }

    // Upsert changed invoices
    for (const qboInvoice of qboInvoices) {
      try {
        const customer = await prisma.customer.findUnique({
          where: {
            organizationId_qboCustomerId: {
              organizationId: orgId,
              qboCustomerId: qboInvoice.CustomerRef.value,
            },
          },
        });

        if (!customer) {
          errors.push("Customer not found for invoice " + qboInvoice.Id);
          continue;
        }

        // Check if invoice already exists locally for pipeline stage preservation
        const existingInvoice = await prisma.invoice.findUnique({
          where: {
            organizationId_qboInvoiceId: {
              organizationId: orgId,
              qboInvoiceId: qboInvoice.Id,
            },
          },
        });

        const mapped = mapQboInvoiceToLocal(
          qboInvoice,
          orgId,
          customer.id,
          existingInvoice?.pipelineStage
        );

        // Track paid invoices
        if (mapped.status === InvoiceStatus.PAID && existingInvoice?.status !== InvoiceStatus.PAID) {
          invoicesPaid++;
        }

        await prisma.invoice.upsert({
          where: {
            organizationId_qboInvoiceId: {
              organizationId: orgId,
              qboInvoiceId: qboInvoice.Id,
            },
          },
          create: mapped,
          update: {
            customerId: mapped.customerId,
            invoiceNumber: mapped.invoiceNumber,
            issueDate: mapped.issueDate,
            dueDate: mapped.dueDate,
            totalAmount: mapped.totalAmount,
            balance: mapped.balance,
            status: mapped.status,
            pipelineStage: mapped.pipelineStage,
          },
        });
        invoicesUpserted++;
      } catch (err) {
        errors.push("Failed to upsert invoice " + qboInvoice.Id + ": " + String(err));
      }
    }

    await prisma.quickBooksConnection.update({
      where: { id: connection.id },
      data: {
        syncStatus: "idle",
        lastSyncAt: new Date(),
        syncError: errors.length > 0 ? errors.join("; ") : null,
      },
    });
  } catch (err) {
    await prisma.quickBooksConnection.update({
      where: { id: connection.id },
      data: { syncStatus: "error", syncError: String(err) },
    });
    throw err;
  }

  return { customersUpserted, invoicesUpserted, invoicesPaid, errors };
}
