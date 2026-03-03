export interface TemplateVariables {
  customer_name: string;
  invoice_number: string;
  amount: string;
  balance: string;
  due_date: string;
  days_overdue: string;
  company_name: string;
  payment_link: string;
  [key: string]: string;
}

/**
 * Replace merge variables like {{customer_name}} with actual values.
 */
export function renderTemplate(
  template: string,
  variables: Partial<TemplateVariables>
): string {
  let rendered = template;
  for (const [key, value] of Object.entries(variables)) {
    if (value !== undefined) {
      rendered = rendered.replaceAll(`{{${key}}}`, value);
    }
  }
  return rendered;
}
