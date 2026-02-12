import crypto from "crypto";

interface ParsedInboundEmail {
  from: string;
  subject: string;
  recipient: string;
  bodyPlain: string;
  attachments: InboundAttachment[];
  token: string;
  timestamp: string;
  signature: string;
}

interface InboundAttachment {
  filename: string;
  contentType: string;
  data: Buffer;
  size: number;
}

export function parseMailgunWebhook(formData: FormData): ParsedInboundEmail {
  const from = (formData.get("from") as string) || "";
  const subject = (formData.get("subject") as string) || "";
  const recipient = (formData.get("recipient") as string) || "";
  const bodyPlain = (formData.get("body-plain") as string) || "";
  const token = (formData.get("token") as string) || "";
  const timestamp = (formData.get("timestamp") as string) || "";
  const signature = (formData.get("signature") as string) || "";

  // Collect file attachments
  const attachments: InboundAttachment[] = [];
  // Mailgun sends attachments as attachment-1, attachment-2, etc.
  for (let i = 1; i <= 10; i++) {
    const file = formData.get(`attachment-${i}`) as File | null;
    if (!file) break;
    attachments.push({
      filename: file.name,
      contentType: file.type,
      data: Buffer.from([]), // populated later from file.arrayBuffer()
      size: file.size,
    });
  }

  return {
    from,
    subject,
    recipient,
    bodyPlain,
    attachments,
    token,
    timestamp,
    signature,
  };
}

export function verifyMailgunSignature(params: {
  signingKey: string;
  token: string;
  timestamp: string;
  signature: string;
}): boolean {
  const { signingKey, token, timestamp, signature } = params;
  if (!signingKey || !token || !timestamp || !signature) return false;

  const hmac = crypto
    .createHmac("sha256", signingKey)
    .update(timestamp + token)
    .digest("hex");

  return hmac === signature;
}

/**
 * Extract the alias token from the recipient email.
 * E.g. "kontoret+abc123@in.brokerflow.se" -> "kontoret+abc123"
 */
export function extractAliasFromRecipient(recipient: string): string {
  const match = recipient.match(/^([^@]+)@/);
  return match ? match[1] : "";
}

/**
 * Try to find an assignment ID from the subject line.
 * Convention: subject contains [BF-<assignment_id>] tag.
 */
export function extractAssignmentIdFromSubject(
  subject: string,
): string | null {
  const match = subject.match(
    /\[BF-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\]/i,
  );
  return match ? match[1] : null;
}
