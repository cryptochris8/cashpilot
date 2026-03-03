import { Resend } from "resend";
import prisma from "@/lib/db";
import crypto from "crypto";

// Re-export from render.ts for backward compatibility
export { renderTemplate, type TemplateVariables } from "./render";

function getResendClient(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return new Resend("re_placeholder");
  }
  return new Resend(key);
}

/**
 * Generate a unique unsubscribe token for a customer.
 */
export function generateUnsubscribeToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Get or create an unsubscribe token for a customer.
 */
export async function getOrCreateUnsubscribeToken(
  customerId: string
): Promise<string> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });

  if (!customer) throw new Error("Customer not found");

  if (customer.unsubscribeToken) {
    return customer.unsubscribeToken;
  }

  const token = generateUnsubscribeToken();
  await prisma.customer.update({
    where: { id: customerId },
    data: { unsubscribeToken: token },
  });

  return token;
}

/**
 * Build the CAN-SPAM compliant email footer.
 */
function buildEmailFooter(
  unsubscribeUrl: string,
  customFooter?: string | null
): string {
  const parts: string[] = [];

  if (customFooter) {
    parts.push(customFooter);
  }

  parts.push(
    "\n\n---\nIf you no longer wish to receive these reminders, you can unsubscribe here: " +
      unsubscribeUrl
  );

  return parts.join("\n");
}

/**
 * Detect if the body contains HTML tags.
 */
function isHtml(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text);
}

interface SendReminderOptions {
  to: string;
  subject: string;
  body: string;
  orgId?: string;
  customerId?: string;
}

/**
 * Send a reminder email via Resend.
 * Uses custom sender settings if available and includes CAN-SPAM unsubscribe link.
 * Supports both plain text and HTML email bodies.
 * Returns the Resend message ID on success.
 */
export async function sendReminder(
  toOrOptions: string | SendReminderOptions,
  subjectArg?: string,
  bodyArg?: string
): Promise<{ messageId: string | null; error: string | null }> {
  try {
    const resend = getResendClient();

    let to: string;
    let subject: string;
    let body: string;
    let orgId: string | undefined;
    let customerId: string | undefined;

    if (typeof toOrOptions === "string") {
      to = toOrOptions;
      subject = subjectArg || "";
      body = bodyArg || "";
    } else {
      to = toOrOptions.to;
      subject = toOrOptions.subject;
      body = toOrOptions.body;
      orgId = toOrOptions.orgId;
      customerId = toOrOptions.customerId;
    }

    // Fetch custom sender settings if orgId provided
    let fromAddress = "CashPilot <reminders@cashpilot.app>";
    let replyTo: string | undefined;
    let customFooter: string | null = null;

    if (orgId) {
      const emailSettings = await prisma.emailSettings.findUnique({
        where: { organizationId: orgId },
      });

      if (emailSettings) {
        if (emailSettings.senderName) {
          fromAddress = emailSettings.senderName + " <reminders@cashpilot.app>";
        }
        if (emailSettings.replyToEmail) {
          replyTo = emailSettings.replyToEmail;
        }
        customFooter = emailSettings.emailFooter;
      }
    }

    const htmlMode = isHtml(body);

    // Add unsubscribe footer if customerId provided (only for plain text)
    if (customerId && !htmlMode) {
      try {
        const token = await getOrCreateUnsubscribeToken(customerId);
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const unsubscribeUrl = baseUrl + "/api/unsubscribe/" + token;
        body += buildEmailFooter(unsubscribeUrl, customFooter);
      } catch {
        if (customFooter) {
          body += "\n\n" + customFooter;
        }
      }
    } else if (customFooter && !htmlMode) {
      body += "\n\n" + customFooter;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result: { data: any; error: any };

    if (htmlMode) {
      result = await resend.emails.send({
        from: fromAddress,
        to: [to],
        subject,
        html: body,
        ...(replyTo ? { reply_to: replyTo } : {}),
      });
    } else {
      result = await resend.emails.send({
        from: fromAddress,
        to: [to],
        subject,
        text: body,
        ...(replyTo ? { reply_to: replyTo } : {}),
      });
    }

    const { data, error } = result;

    if (error) {
      return { messageId: null, error: error.message };
    }

    return { messageId: data?.id ?? null, error: null };
  } catch (err) {
    return { messageId: null, error: String(err) };
  }
}
