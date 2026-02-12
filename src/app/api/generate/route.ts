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
import type { Json } from "@/types/database";

type GenerationType =
  | "ad_copy"
  | "email_brf"
  | "email_buyer"
  | "email_seller";

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

    if (type === "ad_copy") {
      systemPrompt = buildGenerateAdSystemPrompt(tone);
      userPrompt = buildGenerateAdUserPrompt(propertyData);
      promptVersion = GENERATE_AD_PROMPT_VERSION;
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
      maxTokens: 2048,
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
