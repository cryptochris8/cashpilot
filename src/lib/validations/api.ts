import { z } from "zod/v4";

// POST /api/invoices/[id]/notes
export const invoiceNoteSchema = z.object({
  content: z.string().min(1).max(5000),
  noteType: z
    .enum(["GENERAL", "DISPUTE", "PROMISE_TO_PAY", "ESCALATION"])
    .optional()
    .default("GENERAL"),
});

// PATCH /api/invoices/[id]
export const invoicePatchSchema = z.object({
  pipelineStage: z
    .enum(["NEW", "REMINDER_SENT", "FOLLOW_UP", "ESCALATED", "RESOLVED"])
    .optional(),
  pauseReminders: z.boolean().optional(),
  status: z
    .enum(["OPEN", "OVERDUE", "PAID", "DISPUTED", "WRITTEN_OFF"])
    .optional(),
});

// POST /api/invoices/[id]/remind
export const invoiceRemindSchema = z
  .object({
    templateId: z.string().optional(),
  })
  .optional();

// POST /api/invoices/[id]/reminders
export const invoiceRemindersSchema = z.object({
  subject: z.string().max(500).optional(),
  body: z.string().max(10000).optional(),
});

// POST /api/invoices/bulk
export const invoiceBulkSchema = z.object({
  action: z.enum([
    "sendReminder",
    "changeStage",
    "pauseReminders",
    "resumeReminders",
  ]),
  invoiceIds: z.array(z.string()).min(1),
  stage: z
    .enum(["NEW", "REMINDER_SENT", "FOLLOW_UP", "ESCALATED", "RESOLVED"])
    .optional(),
});

// PATCH /api/customers/[id]/notes
export const customerNotesSchema = z.object({
  notes: z.string().max(10000).nullable(),
});

// POST /api/templates/preview
export const templatePreviewSchema = z.object({
  template: z
    .enum([
      "friendlyReminder",
      "dueToday",
      "firstFollowUp",
      "secondFollowUp",
      "escalation",
    ])
    .optional()
    .default("friendlyReminder"),
});

// POST /api/billing
export const billingCheckoutSchema = z.object({
  priceId: z.string().min(1, "Price ID is required"),
});
