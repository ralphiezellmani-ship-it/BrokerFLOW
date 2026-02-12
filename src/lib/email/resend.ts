import { Resend } from "resend";

let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not set");
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

const FROM_ADDRESS =
  process.env.RESEND_FROM_ADDRESS || "BrokerFlow <noreply@brokerflow.se>";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(params: SendEmailParams) {
  const resend = getResendClient();

  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }

  return data;
}

export async function sendTaskReminderEmail(params: {
  to: string;
  recipientName: string;
  taskTitle: string;
  dueDate: string;
  assignmentAddress: string;
  assignmentUrl: string;
}) {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a1a1a;">Påminnelse: Uppgift med deadline</h2>
      <p>Hej ${params.recipientName},</p>
      <p>Du har en uppgift med deadline som närmar sig:</p>
      <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0 0 8px 0; font-weight: 600;">${params.taskTitle}</p>
        <p style="margin: 0 0 4px 0; color: #666;">Uppdrag: ${params.assignmentAddress}</p>
        <p style="margin: 0; color: #e74c3c; font-weight: 500;">Deadline: ${params.dueDate}</p>
      </div>
      <a href="${params.assignmentUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 500;">
        Visa uppdraget
      </a>
      <p style="color: #999; font-size: 12px; margin-top: 24px;">
        Detta är ett automatiskt meddelande från BrokerFlow.
      </p>
    </div>
  `;

  const text = `Påminnelse: ${params.taskTitle}\n\nUppdrag: ${params.assignmentAddress}\nDeadline: ${params.dueDate}\n\nVisa uppdraget: ${params.assignmentUrl}`;

  return sendEmail({
    to: params.to,
    subject: `Påminnelse: ${params.taskTitle} — deadline ${params.dueDate}`,
    html,
    text,
  });
}
