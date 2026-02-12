import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  verifyMailgunSignature,
  extractAliasFromRecipient,
  extractAssignmentIdFromSubject,
} from "@/lib/email/inbound-parser";

export async function POST(req: NextRequest) {
  const supabase = createAdminClient();

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid form data" },
      { status: 400 },
    );
  }

  // Extract Mailgun fields
  const from = (formData.get("from") as string) || "";
  const subject = (formData.get("subject") as string) || "";
  const recipient = (formData.get("recipient") as string) || "";
  const token = (formData.get("token") as string) || "";
  const timestamp = (formData.get("timestamp") as string) || "";
  const signature = (formData.get("signature") as string) || "";

  // Verify Mailgun signature
  const signingKey = process.env.MAILGUN_WEBHOOK_SIGNING_KEY;
  if (signingKey) {
    const valid = verifyMailgunSignature({
      signingKey,
      token,
      timestamp,
      signature,
    });
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 403 },
      );
    }
  }

  // Find tenant via inbound alias
  const alias = extractAliasFromRecipient(recipient);
  if (!alias) {
    return NextResponse.json(
      { error: "No alias found in recipient" },
      { status: 400 },
    );
  }

  const { data: aliasRecord } = await supabase
    .from("inbound_aliases")
    .select("*")
    .eq("email_alias", alias)
    .eq("is_active", true)
    .single();

  if (!aliasRecord) {
    return NextResponse.json(
      { error: "Unknown alias" },
      { status: 404 },
    );
  }

  const tenantId = aliasRecord.tenant_id;

  // Try to match assignment from subject
  const assignmentId = extractAssignmentIdFromSubject(subject);

  // Process file attachments
  const attachmentKeys: string[] = [];
  for (const [key] of formData.entries()) {
    if (key.startsWith("attachment-")) {
      attachmentKeys.push(key);
    }
  }

  if (attachmentKeys.length === 0) {
    // No attachments — still log it
    await supabase.from("audit_logs").insert({
      tenant_id: tenantId,
      action: "email.received_no_attachments",
      entity_type: "inbound_email",
      metadata_json: { from, subject, recipient },
    });
    return NextResponse.json({ message: "No attachments to process" });
  }

  const createdDocumentIds: string[] = [];

  for (const key of attachmentKeys) {
    const file = formData.get(key) as File | null;
    if (!file) continue;

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop() || "bin";
    const storagePath = `${tenantId}/${assignmentId || "unmatched"}/${crypto.randomUUID()}.${ext}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError.message);
      continue;
    }

    // Create document record
    const { data: doc } = await supabase
      .from("documents")
      .insert({
        tenant_id: tenantId,
        assignment_id: assignmentId,
        filename: file.name,
        storage_path: storagePath,
        file_size_bytes: file.size,
        mime_type: file.type,
        source: "email" as const,
        source_email_from: from,
        source_email_subject: subject,
        processing_status: "uploaded" as const,
      })
      .select("id")
      .single();

    if (doc) {
      createdDocumentIds.push(doc.id);
    }
  }

  // Audit log
  await supabase.from("audit_logs").insert({
    tenant_id: tenantId,
    action: "email.received",
    entity_type: "inbound_email",
    metadata_json: {
      from,
      subject,
      recipient,
      attachment_count: createdDocumentIds.length,
      assignment_id: assignmentId,
      document_ids: createdDocumentIds,
    },
  });

  return NextResponse.json({
    message: "Processed",
    documents_created: createdDocumentIds.length,
  });
}
