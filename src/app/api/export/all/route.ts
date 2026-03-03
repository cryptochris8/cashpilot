import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

/**
 * GET /api/export/all
 * Export all organization data as JSON for GDPR/data portability compliance.
 */
export async function GET() {
  const { orgId } = await auth();

  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await prisma.organization.findUnique({
    where: { clerkOrgId: orgId },
    include: {
      qboConnection: {
        select: {
          realmId: true,
          lastSyncAt: true,
          syncStatus: true,
          createdAt: true,
        },
      },
      customers: {
        select: {
          id: true,
          qboCustomerId: true,
          displayName: true,
          email: true,
          phone: true,
          notes: true,
          unsubscribed: true,
          createdAt: true,
        },
      },
      invoices: {
        select: {
          id: true,
          qboInvoiceId: true,
          invoiceNumber: true,
          issueDate: true,
          dueDate: true,
          totalAmount: true,
          balance: true,
          status: true,
          pipelineStage: true,
          lastReminderSentAt: true,
          pauseReminders: true,
          createdAt: true,
          reminderLogs: {
            select: {
              id: true,
              sentAt: true,
              channel: true,
              deliveryStatus: true,
              subject: true,
              createdAt: true,
            },
          },
          invoiceNotes: {
            select: {
              id: true,
              authorId: true,
              content: true,
              noteType: true,
              createdAt: true,
            },
          },
        },
      },
      templates: {
        select: {
          id: true,
          name: true,
          subject: true,
          body: true,
          isDefault: true,
          createdAt: true,
        },
      },
      cadences: {
        select: {
          id: true,
          name: true,
          isDefault: true,
          isActive: true,
          createdAt: true,
          steps: {
            select: {
              id: true,
              templateId: true,
              daysRelativeToDue: true,
              order: true,
            },
          },
        },
      },
      subscription: {
        select: {
          status: true,
          currentPeriodEnd: true,
          trialEnd: true,
          createdAt: true,
        },
      },
    },
  });

  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const exportData = {
    exportedAt: new Date().toISOString(),
    organization: {
      id: org.id,
      name: org.name,
      createdAt: org.createdAt,
    },
    quickbooksConnection: org.qboConnection,
    customers: org.customers,
    invoices: org.invoices,
    templates: org.templates,
    cadences: org.cadences,
    subscription: org.subscription,
  };

  const json = JSON.stringify(exportData, null, 2);

  return new NextResponse(json, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": "attachment; filename=\"cashpilot-export-" + new Date().toISOString().split("T")[0] + ".json\"",
    },
  });
}
