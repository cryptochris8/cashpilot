/**
 * Professional HTML email templates for invoice reminders.
 * All styles are inlined for maximum email client compatibility.
 */

interface EmailTemplateData {
  customerName: string;
  invoiceNumber: string;
  amount: string;
  balance: string;
  dueDate: string;
  daysOverdue: string;
  companyName: string;
  paymentLink?: string;
  unsubscribeUrl?: string;
}

function baseLayout(bodyContent: string, data: EmailTemplateData): string {
  const year = new Date().getFullYear();
  const companyLabel = data.companyName || "CashPilot";
  let payBtn = "";
  if (data.paymentLink) {
    payBtn = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:8px 0 16px;"><a href="' + data.paymentLink + '" style="display:inline-block;background-color:#2563eb;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:6px;line-height:1;">Pay Now</a></td></tr></table>';
  }
  let unsub = "";
  if (data.unsubscribeUrl) {
    unsub = '<p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;"><a href="' + data.unsubscribeUrl + '" style="color:#94a3b8;text-decoration:underline;">Unsubscribe from reminders</a></p>';
  }
  return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /><title>Invoice Reminder</title></head>'
    + '<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif;">'
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;">'
    + '<tr><td align="center" style="padding:24px 16px;">'
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">'
    + '<tr><td style="background-color:#1e293b;padding:24px 32px;text-align:center;"><h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">' + companyLabel + '</h1></td></tr>'
    + '<tr><td style="padding:32px;">'
    + bodyContent
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;">'
    + '<tr style="background-color:#f8fafc;"><td style="padding:12px 16px;font-size:13px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Invoice</td><td style="padding:12px 16px;font-size:13px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;text-align:right;">Amount</td></tr>'
    + '<tr><td style="padding:12px 16px;font-size:15px;color:#1e293b;border-top:1px solid #e2e8f0;">#' + data.invoiceNumber + '</td><td style="padding:12px 16px;font-size:15px;color:#1e293b;border-top:1px solid #e2e8f0;text-align:right;font-weight:600;">' + data.balance + '</td></tr>'
    + '<tr><td style="padding:12px 16px;font-size:13px;color:#64748b;border-top:1px solid #e2e8f0;">Due Date</td><td style="padding:12px 16px;font-size:13px;color:#64748b;border-top:1px solid #e2e8f0;text-align:right;">' + data.dueDate + '</td></tr>'
    + '</table>'
    + payBtn
    + '<p style="margin:24px 0 0;font-size:14px;color:#64748b;line-height:1.6;">If you have already sent payment, please disregard this message. If you have any questions, simply reply to this email.</p>'
    + '</td></tr>'
    + '<tr><td style="background-color:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;">'
    + '<p style="margin:0 0 8px;font-size:12px;color:#94a3b8;text-align:center;">' + companyLabel + ' - Powered by CashPilot</p>'
    + unsub
    + '<p style="margin:8px 0 0;font-size:11px;color:#cbd5e1;text-align:center;">Copyright ' + year + ' All rights reserved.</p>'
    + '</td></tr>'
    + '</table></td></tr></table></body></html>';
}

function buildBody(greeting: string, name: string, message: string): string {
  return '<p style="margin:0 0 16px;font-size:16px;color:#1e293b;line-height:1.6;">' + greeting + ' ' + name + ',</p>'
    + '<p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">' + message + '</p>';
}

export function friendlyReminder(data: EmailTemplateData): string {
  const content = buildBody("Hi", data.customerName,
    "Just a friendly heads-up that invoice <strong>#" + data.invoiceNumber + "</strong> for <strong>" + data.balance + "</strong> is coming due on <strong>" + data.dueDate + "</strong>. We wanted to give you a quick reminder so you can plan accordingly.");
  return baseLayout(content, data);
}

export function dueToday(data: EmailTemplateData): string {
  const content = buildBody("Hi", data.customerName,
    "This is a reminder that invoice <strong>#" + data.invoiceNumber + "</strong> for <strong>" + data.balance + "</strong> is <strong>due today</strong>. Please arrange payment at your earliest convenience.");
  return baseLayout(content, data);
}

export function firstFollowUp(data: EmailTemplateData): string {
  const content = buildBody("Hi", data.customerName,
    "We wanted to follow up regarding invoice <strong>#" + data.invoiceNumber + "</strong> for <strong>" + data.balance + "</strong>, which was due on <strong>" + data.dueDate + "</strong>. This invoice is now <strong>" + data.daysOverdue + " days past due</strong>. If payment has already been sent, thank you!");
  return baseLayout(content, data);
}

export function secondFollowUp(data: EmailTemplateData): string {
  const content = buildBody("Hi", data.customerName,
    "We have not received payment for invoice <strong>#" + data.invoiceNumber + "</strong> in the amount of <strong>" + data.balance + "</strong>. This invoice was due on <strong>" + data.dueDate + "</strong> and is now <strong>" + data.daysOverdue + " days overdue</strong>. We kindly ask that you prioritize this payment.");
  return baseLayout(content, data);
}

export function escalation(data: EmailTemplateData): string {
  const content = buildBody("Dear", data.customerName,
    "This matter requires your <strong>immediate attention</strong>. Invoice <strong>#" + data.invoiceNumber + "</strong> for <strong>" + data.balance + "</strong> is now <strong>" + data.daysOverdue + " days past the due date</strong> of " + data.dueDate + ". Please arrange payment immediately or contact us to discuss.");
  return baseLayout(content, data);
}

export type TemplateName = "friendlyReminder" | "dueToday" | "firstFollowUp" | "secondFollowUp" | "escalation";

export const templateRenderers: Record<TemplateName, (data: EmailTemplateData) => string> = {
  friendlyReminder,
  dueToday,
  firstFollowUp,
  secondFollowUp,
  escalation,
};

export const templateLabels: Record<TemplateName, string> = {
  friendlyReminder: "Friendly Reminder",
  dueToday: "Due Today",
  firstFollowUp: "First Follow-Up",
  secondFollowUp: "Second Follow-Up",
  escalation: "Escalation",
};

export type { EmailTemplateData };
