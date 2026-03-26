import { describe, it, expect } from "vitest";
import { renderTemplate } from "./render";

describe("renderTemplate", () => {
  it("replaces a single variable correctly", () => {
    const result = renderTemplate("Hello, {{customer_name}}!", {
      customer_name: "Alice",
    });
    expect(result).toBe("Hello, Alice!");
  });

  it("replaces multiple different variables", () => {
    const result = renderTemplate(
      "Invoice {{invoice_number}} for {{customer_name}} — amount due: {{amount}}",
      {
        invoice_number: "INV-001",
        customer_name: "Bob",
        amount: "$500.00",
      }
    );
    expect(result).toBe(
      "Invoice INV-001 for Bob — amount due: $500.00"
    );
  });

  it("replaces multiple occurrences of the same variable", () => {
    const result = renderTemplate(
      "Dear {{customer_name}}, your balance is {{balance}}. Thank you, {{customer_name}}.",
      {
        customer_name: "Carol",
        balance: "$0.00",
      }
    );
    expect(result).toBe(
      "Dear Carol, your balance is $0.00. Thank you, Carol."
    );
  });

  it("leaves template unchanged when no variables match", () => {
    const template = "Hello, {{customer_name}}!";
    const result = renderTemplate(template, { company_name: "Acme" });
    expect(result).toBe("Hello, {{customer_name}}!");
  });

  it("leaves unknown placeholder as-is when variable is not provided", () => {
    const result = renderTemplate("Link: {{payment_link}} — {{unknown}}", {
      payment_link: "https://pay.example.com",
    });
    expect(result).toBe("Link: https://pay.example.com — {{unknown}}");
  });

  it("returns empty string for empty template", () => {
    const result = renderTemplate("", { customer_name: "Dave" });
    expect(result).toBe("");
  });

  it("returns original text when template has no placeholders", () => {
    const text = "No placeholders here.";
    const result = renderTemplate(text, { customer_name: "Eve" });
    expect(result).toBe("No placeholders here.");
  });

  it("substitutes variables correctly in an HTML template", () => {
    const template =
      "<p>Dear {{customer_name}},</p><p>Your invoice <strong>{{invoice_number}}</strong> of <em>{{amount}}</em> is due on {{due_date}}.</p>";
    const result = renderTemplate(template, {
      customer_name: "Frank",
      invoice_number: "INV-042",
      amount: "$1,200.00",
      due_date: "2026-04-01",
    });
    expect(result).toBe(
      "<p>Dear Frank,</p><p>Your invoice <strong>INV-042</strong> of <em>$1,200.00</em> is due on 2026-04-01.</p>"
    );
  });

  it("handles values containing special regex characters without errors", () => {
    // Values like '$', '.', '(', ')' are common in payment links and amounts
    const result = renderTemplate(
      "Amount: {{amount}}, Link: {{payment_link}}",
      {
        amount: "$1.00 (USD)",
        payment_link: "https://pay.example.com/checkout?ref=abc&foo=bar",
      }
    );
    expect(result).toBe(
      "Amount: $1.00 (USD), Link: https://pay.example.com/checkout?ref=abc&foo=bar"
    );
  });
});
