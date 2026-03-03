/**
 * Default email reminder templates.
 *
 * Merge variables:
 *   {{customer_name}}, {{invoice_number}}, {{amount}},
 *   {{due_date}}, {{days_overdue}}, {{company_name}}
 */

export interface DefaultTemplate {
  name: string;
  subject: string;
  body: string;
  daysRelativeToDue: number;
}

export const DEFAULT_TEMPLATES: DefaultTemplate[] = [
  {
    name: "Friendly Pre-Due Reminder",
    subject: "Upcoming invoice {{invoice_number}} due on {{due_date}}",
    body: `Hi {{customer_name}},

This is a friendly reminder that invoice {{invoice_number}} for {{amount}} is due on {{due_date}}.

If you have already sent the payment, please disregard this message. Otherwise, we would appreciate it if you could arrange payment before the due date.

Thank you for your business!

Best regards,
{{company_name}}`,
    daysRelativeToDue: -3,
  },
  {
    name: "Due Today Reminder",
    subject: "Invoice {{invoice_number}} is due today",
    body: `Hi {{customer_name}},

Just a quick reminder that invoice {{invoice_number}} for {{amount}} is due today, {{due_date}}.

Please arrange payment at your earliest convenience. If you have any questions about this invoice, feel free to reach out.

Thank you!

Best regards,
{{company_name}}`,
    daysRelativeToDue: 0,
  },
  {
    name: "7-Day Overdue Notice",
    subject: "Invoice {{invoice_number}} is 7 days past due",
    body: `Hi {{customer_name}},

Our records show that invoice {{invoice_number}} for {{amount}} was due on {{due_date}} and is now {{days_overdue}} days past due.

We understand that oversights happen. Could you please look into this and arrange payment as soon as possible?

If you have already sent the payment, please let us know so we can update our records.

Thank you,
{{company_name}}`,
    daysRelativeToDue: 7,
  },
  {
    name: "14-Day Overdue Follow-Up",
    subject: "Follow-up: Invoice {{invoice_number}} is {{days_overdue}} days overdue",
    body: `Hi {{customer_name}},

We are following up regarding invoice {{invoice_number}} for {{amount}}, which was due on {{due_date}} and is now {{days_overdue}} days past due.

We would greatly appreciate your prompt attention to this matter. If there are any issues with the invoice or if you need to discuss payment arrangements, please do not hesitate to contact us.

Thank you for your cooperation.

Best regards,
{{company_name}}`,
    daysRelativeToDue: 14,
  },
  {
    name: "30-Day Escalation Notice",
    subject: "Urgent: Invoice {{invoice_number}} is {{days_overdue}} days overdue",
    body: `Hi {{customer_name}},

This is an urgent notice regarding invoice {{invoice_number}} for {{amount}}, which was due on {{due_date}} and is now {{days_overdue}} days past due.

Despite our previous reminders, we have not yet received payment for this invoice. We value our relationship and would like to resolve this matter promptly.

Please contact us within the next 5 business days to discuss payment or to let us know if there is an issue we should be aware of.

Thank you for your immediate attention.

Best regards,
{{company_name}}`,
    daysRelativeToDue: 30,
  },
];
