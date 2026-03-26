import { describe, it, expect } from "vitest";
import { InvoiceStatus, PipelineStage } from "@prisma/client";
import { mapQboInvoiceToLocal } from "./sync";
import type { QboInvoice } from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeInvoice(overrides: Partial<QboInvoice> = {}): QboInvoice {
  return {
    Id: "INV-001",
    DocNumber: "1001",
    TxnDate: "2025-01-01",
    DueDate: "2025-06-01",        // future by default → OPEN
    TotalAmt: 500,
    Balance: 250,
    CustomerRef: { value: "cust-1" },
    ...overrides,
  };
}

const ORG_ID = "org-abc";
const CUSTOMER_ID = "cust-local-1";

// Past date (always overdue)
const PAST_DUE = "2020-01-01";
// Future date (always open)
const FUTURE_DUE = "2099-12-31";

// ---------------------------------------------------------------------------
// Status derivation
// ---------------------------------------------------------------------------

describe("mapQboInvoiceToLocal – status", () => {
  it("1. returns PAID status when Balance <= 0", () => {
    const invoice = makeInvoice({ Balance: 0, DueDate: PAST_DUE });
    const result = mapQboInvoiceToLocal(invoice, ORG_ID, CUSTOMER_ID);
    expect(result.status).toBe(InvoiceStatus.PAID);
  });

  it("2. returns OVERDUE status when past due date and Balance > 0", () => {
    const invoice = makeInvoice({ Balance: 100, DueDate: PAST_DUE });
    const result = mapQboInvoiceToLocal(invoice, ORG_ID, CUSTOMER_ID);
    expect(result.status).toBe(InvoiceStatus.OVERDUE);
  });

  it("3. returns OPEN status when future due date and Balance > 0", () => {
    const invoice = makeInvoice({ Balance: 100, DueDate: FUTURE_DUE });
    const result = mapQboInvoiceToLocal(invoice, ORG_ID, CUSTOMER_ID);
    expect(result.status).toBe(InvoiceStatus.OPEN);
  });
});

// ---------------------------------------------------------------------------
// Pipeline stage derivation
// ---------------------------------------------------------------------------

describe("mapQboInvoiceToLocal – pipeline stage", () => {
  it("4. preserves existing ESCALATED stage for an OVERDUE invoice", () => {
    const invoice = makeInvoice({ Balance: 100, DueDate: PAST_DUE });
    const result = mapQboInvoiceToLocal(invoice, ORG_ID, CUSTOMER_ID, PipelineStage.ESCALATED);
    expect(result.pipelineStage).toBe(PipelineStage.ESCALATED);
  });

  it("5. preserves existing FOLLOW_UP stage for an OVERDUE invoice", () => {
    const invoice = makeInvoice({ Balance: 100, DueDate: PAST_DUE });
    const result = mapQboInvoiceToLocal(invoice, ORG_ID, CUSTOMER_ID, PipelineStage.FOLLOW_UP);
    expect(result.pipelineStage).toBe(PipelineStage.FOLLOW_UP);
  });

  it("6. preserves existing REMINDER_SENT stage for an OVERDUE invoice", () => {
    const invoice = makeInvoice({ Balance: 100, DueDate: PAST_DUE });
    const result = mapQboInvoiceToLocal(invoice, ORG_ID, CUSTOMER_ID, PipelineStage.REMINDER_SENT);
    expect(result.pipelineStage).toBe(PipelineStage.REMINDER_SENT);
  });

  it("7. new OVERDUE invoice with no existing stage defaults to FOLLOW_UP", () => {
    const invoice = makeInvoice({ Balance: 100, DueDate: PAST_DUE });
    const result = mapQboInvoiceToLocal(invoice, ORG_ID, CUSTOMER_ID);
    expect(result.pipelineStage).toBe(PipelineStage.FOLLOW_UP);
  });

  it("8. PAID invoice always resolves to RESOLVED stage regardless of existing stage", () => {
    const invoice = makeInvoice({ Balance: 0, DueDate: PAST_DUE });
    // Try with every possible existing stage to confirm RESOLVED always wins
    const stages = Object.values(PipelineStage);
    for (const stage of stages) {
      const result = mapQboInvoiceToLocal(invoice, ORG_ID, CUSTOMER_ID, stage);
      expect(result.pipelineStage).toBe(PipelineStage.RESOLVED);
    }
    // Also without an existing stage
    const resultNoStage = mapQboInvoiceToLocal(invoice, ORG_ID, CUSTOMER_ID);
    expect(resultNoStage.pipelineStage).toBe(PipelineStage.RESOLVED);
  });

  it("9. new OPEN invoice with no existing stage defaults to NEW", () => {
    const invoice = makeInvoice({ Balance: 100, DueDate: FUTURE_DUE });
    const result = mapQboInvoiceToLocal(invoice, ORG_ID, CUSTOMER_ID);
    expect(result.pipelineStage).toBe(PipelineStage.NEW);
  });

  it("10. OPEN invoice preserves an existing stage", () => {
    const invoice = makeInvoice({ Balance: 100, DueDate: FUTURE_DUE });
    const result = mapQboInvoiceToLocal(invoice, ORG_ID, CUSTOMER_ID, PipelineStage.REMINDER_SENT);
    expect(result.pipelineStage).toBe(PipelineStage.REMINDER_SENT);
  });
});

// ---------------------------------------------------------------------------
// Field mapping sanity checks
// ---------------------------------------------------------------------------

describe("mapQboInvoiceToLocal – field mapping", () => {
  it("maps core fields to the correct output shape", () => {
    const invoice = makeInvoice({ Balance: 100, DueDate: FUTURE_DUE });
    const result = mapQboInvoiceToLocal(invoice, ORG_ID, CUSTOMER_ID);

    expect(result.organizationId).toBe(ORG_ID);
    expect(result.customerId).toBe(CUSTOMER_ID);
    expect(result.qboInvoiceId).toBe(invoice.Id);
    expect(result.invoiceNumber).toBe(invoice.DocNumber ?? null);
    expect(result.issueDate).toEqual(new Date(invoice.TxnDate));
    expect(result.dueDate).toEqual(new Date(invoice.DueDate));
    expect(result.totalAmount).toBe(invoice.TotalAmt);
    expect(result.balance).toBe(invoice.Balance);
  });

  it("sets invoiceNumber to null when DocNumber is absent", () => {
    const invoice = makeInvoice({ DocNumber: undefined, Balance: 100, DueDate: FUTURE_DUE });
    const result = mapQboInvoiceToLocal(invoice, ORG_ID, CUSTOMER_ID);
    expect(result.invoiceNumber).toBeNull();
  });
});
