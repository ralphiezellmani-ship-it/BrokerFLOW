import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getLLMProvider, getLLMProviderName, getLLMModelName } from "@/lib/ai/provider";
import {
  GENERATE_AD_PROMPT_VERSION,
  buildGenerateAdSystemPrompt,
  buildGenerateAdUserPrompt,
} from "@/lib/ai/prompts/generate-ad";
import {
  GENERATE_EMAIL_PROMPT_VERSION,
  buildGenerateEmailSystemPrompt,
  buildGenerateEmailUserPrompt,
  type EmailType,
} from "@/lib/ai/prompts/generate-email";
import {
  GENERATE_SETTLEMENT_PROMPT_VERSION,
  buildGenerateSettlementSystemPrompt,
  buildGenerateSettlementUserPrompt,
} from "@/lib/ai/prompts/generate-settlement";
import type { Json } from "@/types/database";

const BRF_APPLICATION_PROMPT_VERSION = "1.0.0";
const ACCESS_REQUEST_PROMPT_VERSION = "1.0.0";

function buildGenerateBrfApplicationSystemPrompt(): string {
  return `Du är en erfaren svensk fastighetsmäklare som upprättar medlemsansökningar till bostadsrättsföreningar.

Skapa en komplett BRF-ansökan (medlemsansökan) baserat på den givna datan.

Ansökan ska innehålla:
- Ämnesrad för e-postmeddelandet
- Formellt brev till BRF:ens styrelse
- Uppgifter om köparen (platshållare om data saknas)
- Information om vilken bostad det gäller
- Begäran om godkännande av medlemskap
- Mäklarens kontaktuppgifter (platshållare)

Returnera resultatet som JSON:
{
  "subject": "<ämnesrad>",
  "body": "<brödtext för ansökan>"
}

Regler:
- Skriv på svenska
- Formell och professionell ton
- Inkludera platshållare [KÖPARENS PERSONNUMMER] (aldrig riktigt personnummer)
- Inkludera platshållare [MÄKLARENS NAMN] och [MÄKLARENS TELEFON]
- Svara ENBART med valid JSON`;
}

function buildGenerateBrfApplicationUserPrompt(
  propertyData: Record<string, unknown>,
): string {
  const entries = Object.entries(propertyData)
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  return `Skapa BRF-ansökan för denna bostad:\n\n${entries}`;
}

function buildGenerateAccessRequestSystemPrompt(): string {
  return `Du är en erfaren svensk fastighetsmäklare som förbereder tillträden.

Skapa en tillträdesmall/bokningsförfrågan baserat på den givna datan. Mallen ska kunna användas för att boka tillträde via Tambur eller manuellt.

Mallen ska innehålla:
1. Rubrik
2. Sammanfattning av tillträdet (adress, datum, parter)
3. Checklista inför tillträde:
   - Handpenning erlagd
   - BRF-godkännande erhållet
   - Likvidavräkning upprättad
   - Nyckelöverlämning planerad
   - Avläsning av mätare (el, vatten, etc.)
4. Kontaktuppgifter till parterna (platshållare)
5. Praktisk information

Returnera resultatet som JSON:
{
  "title": "<rubrik>",
  "summary": "<sammanfattning>",
  "checklist": ["<punkt 1>", "<punkt 2>", ...],
  "contact_info": "<kontaktinfo med platshållare>",
  "practical_info": "<praktisk information>",
  "full_text": "<hela mallen som löpande text>"
}

Regler:
- Skriv på svenska
- Professionell ton
- Inkludera platshållare för saknad information
- Svara ENBART med valid JSON`;
}

function buildGenerateAccessRequestUserPrompt(
  propertyData: Record<string, unknown>,
  transactionData: {
    buyer_name: string | null;
    seller_name: string | null;
    access_date: string | null;
    contract_date: string | null;
  },
): string {
  const propEntries = Object.entries(propertyData)
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  const txEntries = Object.entries(transactionData)
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  return `Skapa tillträdesmall för denna bostad:

OBJEKTDATA:
${propEntries}

TRANSAKTIONSDATA:
${txEntries}`;
}

type GenerationType =
  | "ad_copy"
  | "email_brf"
  | "email_buyer"
  | "email_seller"
  | "brf_application"
  | "access_request"
  | "settlement_draft";

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
  const {
    assignment_id,
    type,
    tone = "professional",
  } = body as {
    assignment_id: string;
    type: GenerationType;
    tone?: string;
  };

  if (!assignment_id || !type) {
    return NextResponse.json(
      { error: "assignment_id and type required" },
      { status: 400 },
    );
  }

  // Fetch assignment with confirmed data
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

  // Build property data snapshot for generation input
  const propertyData: Record<string, unknown> = {
    address: assignment.address,
    city: assignment.city,
    postal_code: assignment.postal_code,
    property_type: assignment.property_type,
    rooms: assignment.rooms,
    living_area_sqm: assignment.living_area_sqm,
    floor: assignment.floor,
    build_year: assignment.build_year,
    monthly_fee: assignment.monthly_fee,
    asking_price: assignment.asking_price,
    seller_name: assignment.seller_name,
    association_name: assignment.association_name,
    association_org_number: assignment.association_org_number,
    ...(assignment.confirmed_property_data as Record<string, unknown> || {}),
  };

  try {
    const provider = getLLMProvider();
    const providerName = getLLMProviderName();
    const modelName = getLLMModelName();

    let systemPrompt: string;
    let userPrompt: string;
    let promptVersion: string;

    let maxTokens = 2048;

    if (type === "ad_copy") {
      systemPrompt = buildGenerateAdSystemPrompt(tone);
      userPrompt = buildGenerateAdUserPrompt(propertyData);
      promptVersion = GENERATE_AD_PROMPT_VERSION;
    } else if (type === "settlement_draft") {
      // Fetch transaction data for settlement
      const { data: transaction } = await supabase
        .from("transactions")
        .select("*")
        .eq("assignment_id", assignment_id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const txData: Record<string, unknown> = transaction
        ? {
            buyer_name: transaction.buyer_name,
            seller_name: transaction.seller_name,
            sale_price: transaction.sale_price,
            deposit_amount: transaction.deposit_amount,
            deposit_due_date: transaction.deposit_due_date,
            contract_date: transaction.contract_date,
            access_date: transaction.access_date,
          }
        : {};

      systemPrompt = buildGenerateSettlementSystemPrompt();
      userPrompt = buildGenerateSettlementUserPrompt(txData, propertyData);
      promptVersion = GENERATE_SETTLEMENT_PROMPT_VERSION;
      maxTokens = 3000;
    } else if (type === "brf_application") {
      systemPrompt = buildGenerateBrfApplicationSystemPrompt();
      userPrompt = buildGenerateBrfApplicationUserPrompt(propertyData);
      promptVersion = BRF_APPLICATION_PROMPT_VERSION;
    } else if (type === "access_request") {
      // Fetch transaction for access date
      const { data: transaction } = await supabase
        .from("transactions")
        .select("*")
        .eq("assignment_id", assignment_id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      systemPrompt = buildGenerateAccessRequestSystemPrompt();
      userPrompt = buildGenerateAccessRequestUserPrompt(propertyData, {
        buyer_name: transaction?.buyer_name || null,
        seller_name: transaction?.seller_name || null,
        access_date: transaction?.access_date || null,
        contract_date: transaction?.contract_date || null,
      });
      promptVersion = ACCESS_REQUEST_PROMPT_VERSION;
    } else {
      systemPrompt = buildGenerateEmailSystemPrompt(type as EmailType);
      userPrompt = buildGenerateEmailUserPrompt(
        propertyData,
        assignment.status,
      );
      promptVersion = GENERATE_EMAIL_PROMPT_VERSION;
    }

    const { text, tokenCount } = await provider.complete({
      systemPrompt,
      userPrompt,
      maxTokens,
      temperature: 0.7,
    });

    // Parse the generated JSON
    let outputText: string;
    let outputMetadata: Record<string, unknown> = {};

    try {
      const parsed = JSON.parse(text);
      outputMetadata = parsed;

      if (type === "ad_copy") {
        outputText = [
          `# ${parsed.headline || ""}`,
          "",
          parsed.intro || "",
          "",
          ...(parsed.highlights || []).map((h: string) => `• ${h}`),
          "",
          parsed.association_summary
            ? `**Föreningen:** ${parsed.association_summary}`
            : "",
          "",
          parsed.area_description || "",
        ]
          .filter(Boolean)
          .join("\n");
      } else if (type === "settlement_draft") {
        outputText = parsed.full_text || text;
      } else if (type === "brf_application") {
        outputText = `Ämne: ${parsed.subject || ""}\n\n${parsed.body || ""}`;
      } else if (type === "access_request") {
        outputText = parsed.full_text || text;
      } else {
        outputText = `Ämne: ${parsed.subject || ""}\n\n${parsed.body || ""}`;
      }
    } catch {
      outputText = text;
    }

    // Save generation
    const { data: generation } = await supabase
      .from("generations")
      .insert({
        tenant_id: profile.tenant_id,
        assignment_id,
        type,
        prompt_version: promptVersion,
        llm_provider: providerName,
        llm_model: modelName,
        output_text: outputText,
        output_metadata: outputMetadata as Json,
        tone,
        input_data_snapshot: propertyData as Json,
        token_count: tokenCount,
        is_approved: false,
      })
      .select("*")
      .single();

    // Audit log
    await supabase.from("audit_logs").insert({
      tenant_id: profile.tenant_id,
      actor_user_id: user.id,
      action: "generation.created",
      entity_type: "generation",
      entity_id: generation?.id,
      metadata_json: {
        type,
        tone,
        assignment_id,
        llm_provider: providerName,
        llm_model: modelName,
      },
    });

    return NextResponse.json({ generation });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Generation failed", details: errorMessage },
      { status: 500 },
    );
  }
}
