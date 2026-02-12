import OpenAI from "openai";
import type {
  LLMProvider,
  LLMCompletionParams,
  LLMCompletionResult,
  LLMExtractionParams,
  LLMExtractionResult,
} from "./types";

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });
  }

  async complete(params: LLMCompletionParams): Promise<LLMCompletionResult> {
    const response = await this.client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: params.maxTokens || 4096,
      temperature: params.temperature ?? 0.1,
      messages: [
        { role: "system", content: params.systemPrompt },
        { role: "user", content: params.userPrompt },
      ],
    });

    const text = response.choices[0]?.message?.content || "";
    const tokenCount = response.usage?.total_tokens || 0;

    return { text, tokenCount };
  }

  async extractFromDocument(
    params: LLMExtractionParams,
  ): Promise<LLMExtractionResult> {
    const schemaDescription = Object.entries(params.extractionSchema)
      .map(([key, desc]) => `- "${key}": ${desc}`)
      .join("\n");

    const result = await this.complete({
      systemPrompt: `Du är en expert på att extrahera strukturerad data från svenska fastighetsdokument.
Extrahera fälten nedan och returnera resultatet som JSON med två nycklar:
"data" — ett objekt med extraherade värden
"confidence" — ett objekt med samma nycklar och confidence-score 0.0–1.0 per fält.

Fält att extrahera:
${schemaDescription}

Svara ENBART med valid JSON, inget annat.`,
      userPrompt: params.documentText,
      maxTokens: 4096,
      temperature: 0.1,
    });

    try {
      const parsed = JSON.parse(result.text);
      return {
        data: parsed.data || {},
        confidence: parsed.confidence || {},
      };
    } catch {
      return { data: {}, confidence: {} };
    }
  }
}
