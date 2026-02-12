import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getLLMProvider,
  getLLMProviderName,
  getLLMModelName,
} from "@/lib/ai/provider";
import {
  EXTRACT_CONTRACT_PROMPT_VERSION,
  buildExtractContractSystemPrompt,
  buildExtractContractUserPrompt,
} from "@/lib/ai/prompts/extract-contract";
import { extractTextFromPdf } from "@/lib/extraction/pdf-parser";
import type { Json } from "@/types/database";

interface ContractData {
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  seller_name: string | null;
  seller_email: string | null;
  sale_price: number | null;
  deposit_amount: number | null;
  deposit_due_date: string | null;
  contract_date: string | null;
  access_date: string | null;
  property_address: string | null;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();

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

  // Fetch assignment
  const { data: assignment } = await supabase
    .from("assignments")
    .select("*")
    .eq("id", assignment_id)
    .eq("tenant_id", profile.tenant_id)
    .single();

  if (!assignment) {
    return NextResponse.json(
      { error: "Assignment not found" },
      { status: 404 },
    );
  }

  try {
    // Download file from storage
    const admin = createAdminClient();
    const { data: fileData, error: downloadError } = await admin.storage
      .from("documents")
      .download(doc.storage_path);

    if (downloadError || !fileData) {
      return NextResponse.json(
        { error: "Failed to download document" },
        { status: 500 },
      );
    }

    // Extract text from PDF
    const buffer = await fileData.arrayBuffer();
    const pdfResult = await extractTextFromPdf(Buffer.from(buffer));

    if (!pdfResult.text.trim()) {
      return NextResponse.json(
        { error: "Could not extract text from document" },
        { status: 422 },
      );
    }

    // Extract contract data via LLM
    const provider = getLLMProvider();
    const providerName = getLLMProviderName();
    const modelName = getLLMModelName();
    const startTime = Date.now();

    const systemPrompt = buildExtractContractSystemPrompt();
    const userPrompt = buildExtractContractUserPrompt(pdfResult.text);

    const { text, tokenCount } = await provider.complete({
      systemPrompt,
      userPrompt,
      maxTokens: 2048,
      temperature: 0.1,
    });

    const processingTime = Date.now() - startTime;

    // Parse LLM response
    let contractData: ContractData = {
      buyer_name: null,
      buyer_email: null,
      buyer_phone: null,
      seller_name: null,
      seller_email: null,
      sale_price: null,
      deposit_amount: null,
      deposit_due_date: null,
      contract_date: null,
      access_date: null,
      property_address: null,
    };
    let confidence: Record<string, number> = {};

    try {
      const parsed = JSON.parse(text);
      contractData = { ...contractData, ...parsed.data };
      confidence = parsed.confidence || {};
    } catch {
      // If JSON parsing fails, still continue with empty data
    }

    // Save extraction
    await supabase.from("extractions").insert({
      tenant_id: profile.tenant_id,
      assignment_id,
      document_id,
      schema_version: "1.0",
      llm_provider: providerName,
      llm_model: modelName,
      prompt_version: EXTRACT_CONTRACT_PROMPT_VERSION,
      extracted_json: contractData as unknown as Json,
      confidence_json: confidence as unknown as Json,
      status: "completed",
      processing_time_ms: processingTime,
      token_count: tokenCount,
    });

    // Update document status and type
    await supabase
      .from("documents")
      .update({
        processing_status: "extracted",
        doc_type: "kontrakt",
        doc_type_confidence: 1.0,
      })
      .eq("id", document_id);

    // Create or update transaction
    const { data: existingTx } = await supabase
      .from("transactions")
      .select("id")
      .eq("assignment_id", assignment_id)
      .is("deleted_at", null)
      .maybeSingle();

    let transaction;
    if (existingTx) {
      // Update existing transaction
      const { data: updated } = await supabase
        .from("transactions")
        .update({
          buyer_name: contractData.buyer_name,
          buyer_email: contractData.buyer_email,
          buyer_phone: contractData.buyer_phone,
          seller_name:
            contractData.seller_name || assignment.seller_name,
          seller_email:
            contractData.seller_email || assignment.seller_email,
          sale_price: contractData.sale_price,
          deposit_amount: contractData.deposit_amount,
          deposit_due_date: contractData.deposit_due_date,
          contract_date: contractData.contract_date,
          access_date: contractData.access_date,
          status: "contract_signed",
        })
        .eq("id", existingTx.id)
        .select("*")
        .single();
      transaction = updated;
    } else {
      // Create new transaction
      const { data: created } = await supabase
        .from("transactions")
        .insert({
          tenant_id: profile.tenant_id,
          assignment_id,
          buyer_name: contractData.buyer_name,
          buyer_email: contractData.buyer_email,
          buyer_phone: contractData.buyer_phone,
          seller_name:
            contractData.seller_name || assignment.seller_name,
          seller_email:
            contractData.seller_email || assignment.seller_email,
          sale_price: contractData.sale_price,
          deposit_amount: contractData.deposit_amount,
          deposit_due_date: contractData.deposit_due_date,
          contract_date: contractData.contract_date,
          access_date: contractData.access_date,
          status: "contract_signed",
        })
        .select("*")
        .single();
      transaction = created;
    }

    // Update assignment status to under_contract if not already
    if (
      assignment.status === "draft" ||
      assignment.status === "active"
    ) {
      await supabase
        .from("assignments")
        .update({ status: "under_contract" })
        .eq("id", assignment_id);
    }

    // Audit log
    await supabase.from("audit_logs").insert({
      tenant_id: profile.tenant_id,
      actor_user_id: user.id,
      action: "contract.processed",
      entity_type: "transaction",
      entity_id: transaction?.id,
      metadata_json: {
        document_id,
        assignment_id,
        extracted_fields: Object.keys(contractData).filter(
          (k) => contractData[k as keyof ContractData] != null,
        ),
      },
    });

    return NextResponse.json({ transaction, contractData, confidence });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";

    // Update document status to error
    await supabase
      .from("documents")
      .update({
        processing_status: "error",
        processing_error: errorMessage,
      })
      .eq("id", document_id);

    return NextResponse.json(
      { error: "Contract processing failed", details: errorMessage },
      { status: 500 },
    );
  }
}
