/**
 * Tests for handleResendEvent — the extracted core logic of the Resend
 * webhook handler.
 *
 * All Prisma calls are mocked so no real database connection is required.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleResendEvent, DELIVERY_STATUS_MAP } from "./webhook-handler";

// ---------------------------------------------------------------------------
// Hoist mock references so they are available inside vi.mock factories
// ---------------------------------------------------------------------------
const {
  mockUpdateMany,
  mockFindMany,
  mockInvoiceNoteCreate,
  mockInvoiceUpdate,
} = vi.hoisted(() => ({
  mockUpdateMany: vi.fn(),
  mockFindMany: vi.fn(),
  mockInvoiceNoteCreate: vi.fn(),
  mockInvoiceUpdate: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mock Prisma
// ---------------------------------------------------------------------------
vi.mock("@/lib/db", () => ({
  default: {
    reminderLog: {
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: mockUpdateMany,
      findMany: mockFindMany,
    },
    invoiceNote: { create: mockInvoiceNoteCreate },
    invoice: { update: mockInvoiceUpdate },
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeEvent(type: string, emailId: string, extra: object = {}) {
  return { type, data: { email_id: emailId, ...extra } };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks();
  // Default: updateMany succeeds with 1 row updated
  mockUpdateMany.mockResolvedValue({ count: 1 });
  mockFindMany.mockResolvedValue([]);
  mockInvoiceNoteCreate.mockResolvedValue({});
  mockInvoiceUpdate.mockResolvedValue({});
});

// ---------------------------------------------------------------------------
// DELIVERY_STATUS_MAP contract
// ---------------------------------------------------------------------------
describe("DELIVERY_STATUS_MAP", () => {
  it("maps all expected Resend event types", () => {
    expect(DELIVERY_STATUS_MAP["email.sent"]).toBe("SENT");
    expect(DELIVERY_STATUS_MAP["email.delivered"]).toBe("DELIVERED");
    expect(DELIVERY_STATUS_MAP["email.opened"]).toBe("OPENED");
    expect(DELIVERY_STATUS_MAP["email.bounced"]).toBe("BOUNCED");
    expect(DELIVERY_STATUS_MAP["email.delivery_delayed"]).toBe("QUEUED");
    expect(DELIVERY_STATUS_MAP["email.complained"]).toBe("FAILED");
  });
});

// ---------------------------------------------------------------------------
// email.delivered
// ---------------------------------------------------------------------------
describe("handleResendEvent — email.delivered", () => {
  it("updates deliveryStatus to DELIVERED", async () => {
    const result = await handleResendEvent(makeEvent("email.delivered", "msg_001"));

    expect(result.processed).toBe(true);
    expect(result.status).toBe("DELIVERED");
    expect(result.updatedCount).toBe(1);

    expect(mockUpdateMany).toHaveBeenCalledOnce();
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { resendMessageId: "msg_001" },
      data: { deliveryStatus: "DELIVERED" },
    });
  });

  it("does not call invoiceNote.create or invoice.update for a DELIVERED event", async () => {
    await handleResendEvent(makeEvent("email.delivered", "msg_001"));

    expect(mockInvoiceNoteCreate).not.toHaveBeenCalled();
    expect(mockInvoiceUpdate).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// email.opened
// ---------------------------------------------------------------------------
describe("handleResendEvent — email.opened", () => {
  it("updates deliveryStatus to OPENED", async () => {
    const result = await handleResendEvent(makeEvent("email.opened", "msg_002"));

    expect(result.processed).toBe(true);
    expect(result.status).toBe("OPENED");
    expect(result.updatedCount).toBe(1);

    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { resendMessageId: "msg_002" },
      data: { deliveryStatus: "OPENED" },
    });
  });

  it("does not create notes or pause reminders for an OPENED event", async () => {
    await handleResendEvent(makeEvent("email.opened", "msg_002"));

    expect(mockInvoiceNoteCreate).not.toHaveBeenCalled();
    expect(mockInvoiceUpdate).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// email.bounced
// ---------------------------------------------------------------------------
describe("handleResendEvent — email.bounced", () => {
  const BOUNCE_EMAIL_ID = "msg_bounced";
  const INVOICE_ID = "inv_abc";

  beforeEach(() => {
    mockFindMany.mockResolvedValue([{ invoiceId: INVOICE_ID }]);
  });

  it("updates deliveryStatus to BOUNCED", async () => {
    const result = await handleResendEvent(
      makeEvent("email.bounced", BOUNCE_EMAIL_ID, { bounce: { message: "User unknown" } })
    );

    expect(result.processed).toBe(true);
    expect(result.status).toBe("BOUNCED");
    expect(result.updatedCount).toBe(1);

    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { resendMessageId: BOUNCE_EMAIL_ID },
      data: { deliveryStatus: "BOUNCED" },
    });
  });

  it("fetches logs for the bounced email_id", async () => {
    await handleResendEvent(
      makeEvent("email.bounced", BOUNCE_EMAIL_ID, { bounce: { message: "User unknown" } })
    );

    expect(mockFindMany).toHaveBeenCalledWith({
      where: { resendMessageId: BOUNCE_EMAIL_ID },
      select: { invoiceId: true },
    });
  });

  it("creates a bounce InvoiceNote with the bounce message", async () => {
    await handleResendEvent(
      makeEvent("email.bounced", BOUNCE_EMAIL_ID, { bounce: { message: "Mailbox full" } })
    );

    expect(mockInvoiceNoteCreate).toHaveBeenCalledWith({
      data: {
        invoiceId: INVOICE_ID,
        authorId: "system",
        content: "Email bounced: Mailbox full",
        noteType: "GENERAL",
      },
    });
  });

  it("uses 'Unknown bounce reason' when bounce.message is absent", async () => {
    await handleResendEvent(makeEvent("email.bounced", BOUNCE_EMAIL_ID));

    expect(mockInvoiceNoteCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ content: "Email bounced: Unknown bounce reason" }),
      })
    );
  });

  it("sets pauseReminders=true on the invoice", async () => {
    await handleResendEvent(
      makeEvent("email.bounced", BOUNCE_EMAIL_ID, { bounce: { message: "Rejected" } })
    );

    expect(mockInvoiceUpdate).toHaveBeenCalledWith({
      where: { id: INVOICE_ID },
      data: { pauseReminders: true },
    });
  });

  it("creates a second InvoiceNote explaining auto-pause", async () => {
    await handleResendEvent(
      makeEvent("email.bounced", BOUNCE_EMAIL_ID, { bounce: { message: "Rejected" } })
    );

    // Two notes should be created: the bounce note and the auto-pause note
    expect(mockInvoiceNoteCreate).toHaveBeenCalledTimes(2);
    expect(mockInvoiceNoteCreate).toHaveBeenNthCalledWith(2, {
      data: {
        invoiceId: INVOICE_ID,
        authorId: "system",
        content: "Reminders auto-paused due to email bounce",
        noteType: "GENERAL",
      },
    });
  });

  it("returns the bounced invoice IDs in the result", async () => {
    const result = await handleResendEvent(
      makeEvent("email.bounced", BOUNCE_EMAIL_ID, { bounce: { message: "Rejected" } })
    );

    expect(result.bouncedInvoiceIds).toEqual([INVOICE_ID]);
  });

  it("handles multiple invoices affected by a single bounced email", async () => {
    mockFindMany.mockResolvedValue([
      { invoiceId: "inv_1" },
      { invoiceId: "inv_2" },
    ]);

    const result = await handleResendEvent(
      makeEvent("email.bounced", BOUNCE_EMAIL_ID, { bounce: { message: "Rejected" } })
    );

    expect(result.bouncedInvoiceIds).toEqual(["inv_1", "inv_2"]);
    // 2 invoices × 2 notes each = 4 note creates
    expect(mockInvoiceNoteCreate).toHaveBeenCalledTimes(4);
    // 2 invoice updates
    expect(mockInvoiceUpdate).toHaveBeenCalledTimes(2);
  });

  it("does NOT call findMany or create notes when updateMany returns count=0", async () => {
    // No matching reminder log for this email_id
    mockUpdateMany.mockResolvedValueOnce({ count: 0 });

    await handleResendEvent(
      makeEvent("email.bounced", "msg_unknown", { bounce: { message: "Rejected" } })
    );

    expect(mockFindMany).not.toHaveBeenCalled();
    expect(mockInvoiceNoteCreate).not.toHaveBeenCalled();
    expect(mockInvoiceUpdate).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Unknown event type
// ---------------------------------------------------------------------------
describe("handleResendEvent — unknown event type", () => {
  it("returns processed=false for an unrecognised event type", async () => {
    const result = await handleResendEvent(makeEvent("email.unknown_type", "msg_x"));

    expect(result.processed).toBe(false);
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Unknown resendMessageId (empty email_id)
// ---------------------------------------------------------------------------
describe("handleResendEvent — missing email_id", () => {
  it("returns processed=false when email_id is empty", async () => {
    const result = await handleResendEvent({ type: "email.delivered", data: { email_id: "" } });

    expect(result.processed).toBe(false);
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });
});
