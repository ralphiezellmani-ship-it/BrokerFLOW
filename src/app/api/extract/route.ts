import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractTextFromPdf } from "@/lib/extraction/pdf-parser";
import { classifyDocument } from "@/lib/extraction/doc-classifier";
import { extractFields } from "@/lib/extraction/field-extractor";
import { getLLMProviderName, getLLMModelName } from "@/lib/ai/provider";
import type { Json } from "@/types/database";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const admin = createAdminClient();

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("tenant_id")
    .eq("id", user.id)
    .single();
  if (!profile) {
    return NextResponse.json({ error: "No profile" }, { status: 401 });
  }

  const body = await req.json();
  const { document_id, assignment_id } = body as {
    document_id: string;
    assignment_id: string;
  };

  if (!document_id || !assignment_id) {
    return NextResponse.json(
      { error: "document_id and assignment_id required" },
      { status: 400 },
    );
  }

  // Fetch document
  const { data: doc } = await supabase
    .from("documents")
    .select("*")
    .eq("id", document_id)
    .eq("tenant_id", profile.tenant_id)
    .single();

  if (!doc) {
    return NextResponse.json(
      { error: "Document not found" },
      { status: 404 },
    );
  }

  // Mark as processing
  await supabase
    .from("documents")
    .update({ processing_status: "processing" })
    .eq("id", document_id);

  const startTime = Date.now();

  try {
    // Download file from Storage
    const { data: fileData, error: downloadError } = await admin.storage
      .from("documents")
      .download(doc.storage_path);

    if (downloadError || !fileData) {
      await supabase
        .from("documents")
        .update({
          processing_status: "error",
          processing_error: "Kunde inte ladda ner fil från Storage",
        })
        .eq("id", document_id);
      return NextResponse.json(
        { error: "Failed to download file" },
        { status: 500 },
      );
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());

    // Check if PDF
    if (doc.mime_type !== "application/pdf") {
      await supabase
        .from("documents")
        .update({
          processing_status: "error",
          processing_error: "Bara PDF-filer kan extraheras just nu",
        })
        .eq("id", document_id);
      return NextResponse.json(
        { error: "Only PDF files supported", is_image: true },
        { status: 422 },
      );
    }

    // Extract text from PDF
    const pdfResult = await extractTextFromPdf(buffer);

    if (pdfResult.isScannedImage) {
      await supabase
        .from("documents")
        .update({
          processing_status: "error",
          processing_error:
            "Dokumentet verkar vara en inskannad bild. OCR-stöd är inte tillgängligt ännu.",
        })
        .eq("id", document_id);
      return NextResponse.json(
        {
          error: "Scanned image detected — OCR not yet available",
          is_scanned: true,
        },
        { status: 422 },
      );
    }

    // Classify document type
    const classification = await classifyDocument(pdfResult.text);

    // Update document with classification
    await supabase
      .from("documents")
      .update({
        doc_type: classification.docType,
        doc_type_confidence: classification.confidence,
      })
      .eq("id", document_id);

    // Extract fields
    const extraction = await extractFields(pdfResult.text);

    const processingTimeMs = Date.now() - startTime;
    const providerName = getLLMProviderName();
    const modelName = getLLMModelName();
    const totalTokens =
      classification.tokenCount + extraction.tokenCount;

    // Mark any existing extractions for this document as superseded
    await supabase
      .from("extractions")
      .update({ status: "superseded" })
      .eq("document_id", document_id)
      .eq("status", "completed");

    // Save extraction
    const { data: savedExtraction } = await supabase
      .from("extractions")
      .insert({
        tenant_id: profile.tenant_id,
        assignment_id,
        document_id,
        schema_version: "1.0",
        llm_provider: providerName,
        llm_model: modelName,
        prompt_version: extraction.promptVersion,
        extracted_json: extraction.extractedJson as Json,
        confidence_json: extraction.confidenceJson as Json,
        source_references: extraction.sourceReferences as Json,
        status: "completed",
        processing_time_ms: processingTimeMs,
        token_count: totalTokens,
      })
      .select("id")
      .single();

    // Update document status
    await supabase
      .from("documents")
      .update({ processing_status: "extracted" })
      .eq("id", document_id);

    // Audit log
    await supabase.from("audit_logs").insert({
      tenant_id: profile.tenant_id,
      actor_user_id: user.id,
      action: "extraction.completed",
      entity_type: "extraction",
      entity_id: savedExtraction?.id,
      metadata_json: {
        document_id,
        assignment_id,
        doc_type: classification.docType,
        doc_type_confidence: classification.confidence,
        field_count: Object.keys(extraction.extractedJson).length,
        processing_time_ms: processingTimeMs,
        llm_provider: providerName,
        llm_model: modelName,
      },
    });

    return NextResponse.json({
      extraction_id: savedExtraction?.id,
      doc_type: classification.docType,
      doc_type_confidence: classification.confidence,
      extracted_fields: Object.keys(extraction.extractedJson).length,
      processing_time_ms: processingTimeMs,
    });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";
    await supabase
      .from("documents")
      .update({
        processing_status: "error",
        processing_error: errorMessage,
      })
      .eq("id", document_id);

    return NextResponse.json(
      { error: "Extraction failed", details: errorMessage },
      { status: 500 },
    );
  }
}
