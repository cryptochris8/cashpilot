import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { formatCurrency, formatDate, daysOverdue } from "./format";

describe("formatCurrency", () => {
  it("formats $0", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });

  it("formats a positive integer value", () => {
    expect(formatCurrency(100)).toBe("$100.00");
  });

  it("formats a positive decimal value", () => {
    expect(formatCurrency(9.99)).toBe("$9.99");
  });

  it("formats a large number with thousands separator", () => {
    expect(formatCurrency(1_000_000)).toBe("$1,000,000.00");
  });

  it("preserves two decimal places of precision", () => {
    expect(formatCurrency(1234.56)).toBe("$1,234.56");
  });

  it("rounds to two decimal places", () => {
    // Intl.NumberFormat uses banker's rounding; 1.005 may round to $1.00 or $1.01
    // depending on floating-point representation — we just verify the format shape.
    const result = formatCurrency(1.005);
    expect(result).toMatch(/^\$\d+\.\d{2}$/);
  });

  it("formats a negative value", () => {
    expect(formatCurrency(-50)).toBe("-$50.00");
  });
});

describe("formatDate", () => {
  it("formats a Date object", () => {
    // Use a fixed UTC date and construct via local parts to avoid TZ drift.
    const date = new Date(2024, 0, 15); // Jan 15 2024 local time
    expect(formatDate(date)).toBe("Jan 15, 2024");
  });

  it("formats a date string (YYYY-MM-DD)", () => {
    // new Date('2024-06-01') is parsed as UTC midnight; toLocaleDateString in
    // en-US may render as May 31 in UTC-N timezones. We derive the expected
    // value the same way the implementation does to stay timezone-agnostic.
    const input = "2024-06-01";
    const expected = new Date(input).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    expect(formatDate(input)).toBe(expected);
  });

  it("formats a full ISO 8601 string", () => {
    const input = "2023-12-25T00:00:00.000Z";
    const expected = new Date(input).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    expect(formatDate(input)).toBe(expected);
  });

  it("includes month, day, and year in the output", () => {
    const date = new Date(2025, 6, 4); // Jul 4 2025 local time
    const result = formatDate(date);
    expect(result).toContain("2025");
    expect(result).toContain("Jul");
    expect(result).toContain("4");
  });
});

describe("daysOverdue", () => {
  beforeEach(() => {
    // Fix "now" to 2024-03-15T12:00:00.000Z so tests are deterministic.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-03-15T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns a positive number for a past due date", () => {
    const pastDate = new Date("2024-03-05T12:00:00.000Z"); // 10 days ago
    expect(daysOverdue(pastDate)).toBe(10);
  });

  it("returns a positive number when given a past date string", () => {
    expect(daysOverdue("2024-03-05T12:00:00.000Z")).toBe(10);
  });

  it("returns a negative number for a future due date", () => {
    const futureDate = new Date("2024-03-25T12:00:00.000Z"); // 10 days from now
    expect(daysOverdue(futureDate)).toBe(-10);
  });

  it("returns 0 for today's date (same moment)", () => {
    const today = new Date("2024-03-15T12:00:00.000Z");
    expect(daysOverdue(today)).toBe(0);
  });

  it("returns 0 for today's date (beginning of same day)", () => {
    // Less than 24 hours have passed so Math.floor yields 0.
    const sod = new Date("2024-03-15T00:00:00.000Z");
    expect(daysOverdue(sod)).toBe(0);
  });

  it("uses Math.floor so partial days are not rounded up", () => {
    // 1 day and 23 hours ago → should be 1, not 2
    const almostTwoDaysAgo = new Date("2024-03-13T13:00:00.000Z");
    expect(daysOverdue(almostTwoDaysAgo)).toBe(1);
  });
});
