import { getLLMProvider } from "@/lib/ai/provider";
import {
  EXTRACT_PROPERTY_SYSTEM_PROMPT,
  EXTRACT_PROPERTY_PROMPT_VERSION,
  buildExtractPropertyUserPrompt,
} from "@/lib/ai/prompts/extract-property";

interface FieldExtractionResult {
  extractedJson: Record<string, unknown>;
  confidenceJson: Record<string, number>;
  sourceReferences: Record<string, string>;
  promptVersion: string;
  tokenCount: number;
}

export async function extractFields(
  documentText: string,
): Promise<FieldExtractionResult> {
  const provider = getLLMProvider();

  const { text, tokenCount } = await provider.complete({
    systemPrompt: EXTRACT_PROPERTY_SYSTEM_PROMPT,
    userPrompt: buildExtractPropertyUserPrompt(documentText),
    maxTokens: 4096,
    temperature: 0.1,
  });

  try {
    const parsed = JSON.parse(text);
    return {
      extractedJson: parsed.data || {},
      confidenceJson: parsed.confidence || {},
      sourceReferences: parsed.source_references || {},
      promptVersion: EXTRACT_PROPERTY_PROMPT_VERSION,
      tokenCount,
    };
  } catch {
    return {
      extractedJson: {},
      confidenceJson: {},
      sourceReferences: {},
      promptVersion: EXTRACT_PROPERTY_PROMPT_VERSION,
      tokenCount,
    };
  }
}
