import { describe, it, expect } from "vitest";
import {
  invoiceNoteSchema,
  invoicePatchSchema,
  invoiceRemindSchema,
  invoiceRemindersSchema,
  invoiceBulkSchema,
  customerNotesSchema,
  templatePreviewSchema,
  billingCheckoutSchema,
} from "./api";

describe("invoiceNoteSchema", () => {
  it("accepts valid input with default noteType", () => {
    const result = invoiceNoteSchema.parse({ content: "test note" });
    expect(result.content).toBe("test note");
    expect(result.noteType).toBe("GENERAL");
  });

  it("accepts explicit noteType", () => {
    const result = invoiceNoteSchema.parse({ content: "dispute", noteType: "DISPUTE" });
    expect(result.noteType).toBe("DISPUTE");
  });

  it("rejects empty content", () => {
    expect(() => invoiceNoteSchema.parse({ content: "" })).toThrow();
  });

  it("rejects content over 5000 chars", () => {
    expect(() => invoiceNoteSchema.parse({ content: "x".repeat(5001) })).toThrow();
  });

  it("rejects invalid noteType", () => {
    expect(() => invoiceNoteSchema.parse({ content: "ok", noteType: "BAD" })).toThrow();
  });
});

describe("invoicePatchSchema", () => {
  it("accepts empty object (all fields optional)", () => {
    const result = invoicePatchSchema.parse({});
    expect(result).toEqual({});
  });

  it("accepts valid pipelineStage", () => {
    const result = invoicePatchSchema.parse({ pipelineStage: "ESCALATED" });
    expect(result.pipelineStage).toBe("ESCALATED");
  });

  it("accepts pauseReminders boolean", () => {
    const result = invoicePatchSchema.parse({ pauseReminders: true });
    expect(result.pauseReminders).toBe(true);
  });

  it("rejects invalid pipelineStage", () => {
    expect(() => invoicePatchSchema.parse({ pipelineStage: "INVALID" })).toThrow();
  });
});

describe("invoiceRemindSchema", () => {
  it("accepts undefined (whole schema is optional)", () => {
    const result = invoiceRemindSchema.parse(undefined);
    expect(result).toBeUndefined();
  });

  it("accepts empty object", () => {
    const result = invoiceRemindSchema.parse({});
    expect(result).toEqual({});
  });

  it("accepts templateId", () => {
    const result = invoiceRemindSchema.parse({ templateId: "tmpl_123" });
    expect(result?.templateId).toBe("tmpl_123");
  });
});

describe("invoiceRemindersSchema", () => {
  it("accepts empty object", () => {
    const result = invoiceRemindersSchema.parse({});
    expect(result).toEqual({});
  });

  it("rejects subject over 500 chars", () => {
    expect(() => invoiceRemindersSchema.parse({ subject: "x".repeat(501) })).toThrow();
  });

  it("rejects body over 10000 chars", () => {
    expect(() => invoiceRemindersSchema.parse({ body: "x".repeat(10001) })).toThrow();
  });
});

describe("invoiceBulkSchema", () => {
  it("accepts valid input", () => {
    const result = invoiceBulkSchema.parse({
      action: "sendReminder",
      invoiceIds: ["inv_1", "inv_2"],
    });
    expect(result.action).toBe("sendReminder");
    expect(result.invoiceIds).toHaveLength(2);
  });

  it("rejects empty invoiceIds", () => {
    expect(() =>
      invoiceBulkSchema.parse({ action: "sendReminder", invoiceIds: [] })
    ).toThrow();
  });

  it("rejects invalid action", () => {
    expect(() =>
      invoiceBulkSchema.parse({ action: "delete", invoiceIds: ["inv_1"] })
    ).toThrow();
  });

  it("accepts optional stage for changeStage action", () => {
    const result = invoiceBulkSchema.parse({
      action: "changeStage",
      invoiceIds: ["inv_1"],
      stage: "FOLLOW_UP",
    });
    expect(result.stage).toBe("FOLLOW_UP");
  });
});

describe("customerNotesSchema", () => {
  it("accepts nullable notes", () => {
    const result = customerNotesSchema.parse({ notes: null });
    expect(result.notes).toBeNull();
  });

  it("accepts string notes", () => {
    const result = customerNotesSchema.parse({ notes: "important customer" });
    expect(result.notes).toBe("important customer");
  });

  it("rejects notes over 10000 chars", () => {
    expect(() => customerNotesSchema.parse({ notes: "x".repeat(10001) })).toThrow();
  });
});

describe("templatePreviewSchema", () => {
  it("defaults to friendlyReminder", () => {
    const result = templatePreviewSchema.parse({});
    expect(result.template).toBe("friendlyReminder");
  });

  it("accepts valid template name", () => {
    const result = templatePreviewSchema.parse({ template: "escalation" });
    expect(result.template).toBe("escalation");
  });

  it("rejects invalid template name", () => {
    expect(() => templatePreviewSchema.parse({ template: "badTemplate" })).toThrow();
  });
});

describe("billingCheckoutSchema", () => {
  it("accepts valid priceId", () => {
    const result = billingCheckoutSchema.parse({ priceId: "price_123" });
    expect(result.priceId).toBe("price_123");
  });

  it("rejects empty priceId", () => {
    expect(() => billingCheckoutSchema.parse({ priceId: "" })).toThrow();
  });

  it("rejects missing priceId", () => {
    expect(() => billingCheckoutSchema.parse({})).toThrow();
  });
});
