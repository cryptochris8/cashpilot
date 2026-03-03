// Re-export Prisma types for convenience
export type {
  Organization,
  QuickBooksConnection,
  Customer,
  Invoice,
  ReminderTemplate,
  ReminderCadence,
  CadenceStep,
  ReminderLog,
  InvoiceNote,
  Subscription,
} from "@prisma/client";

export {
  InvoiceStatus,
  PipelineStage,
  ReminderChannel,
  ReminderDeliveryStatus,
  NoteType,
  SubscriptionStatus,
} from "@prisma/client";

// Dashboard stats
export interface DashboardStats {
  expectedNext30Days: number;
  overdueTotal: number;
  collectedThisMonth: number;
  collectionEffectiveness: number;
}

export interface WeeklyExpectedReceipt {
  weekStart: string;
  amount: number;
}

export interface TopDebtor {
  customerId: string;
  customerName: string;
  totalOverdue: number;
  invoiceCount: number;
  oldestOverdueDays: number;
}

// Pipeline card
export interface PipelineCard {
  id: string;
  invoiceNumber: string | null;
  customerName: string;
  amount: number;
  balance: number;
  daysOverdue: number;
  pipelineStage: string;
}
