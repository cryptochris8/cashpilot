/**
 * Shared badge variant maps for invoice status and pipeline stage.
 * Import these instead of redefining them locally in each component.
 */

export type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

/** Maps InvoiceStatus → Badge variant */
export const invoiceStatusVariant: Record<string, BadgeVariant> = {
  OPEN: "default",
  OVERDUE: "destructive",
  PAID: "secondary",
  DISPUTED: "outline",
  WRITTEN_OFF: "outline",
};

/** Maps PipelineStage → Badge variant */
export const stageVariant: Record<string, BadgeVariant> = {
  NEW: "default",
  REMINDER_SENT: "secondary",
  FOLLOW_UP: "default",
  ESCALATED: "destructive",
  RESOLVED: "secondary",
};

/** Maps reminder/email delivery status → Badge variant */
export const deliveryStatusVariant: Record<string, BadgeVariant> = {
  QUEUED: "outline",
  SENT: "default",
  DELIVERED: "secondary",
  OPENED: "secondary",
  BOUNCED: "destructive",
  FAILED: "destructive",
};
