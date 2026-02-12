import { getLLMProvider } from "@/lib/ai/provider";
import {
  CLASSIFY_DOC_SYSTEM_PROMPT,
  CLASSIFY_DOC_PROMPT_VERSION,
  buildClassifyDocUserPrompt,
} from "@/lib/ai/prompts/classify-doc";
import type { DocType } from "@/types/document";

const VALID_DOC_TYPES: DocType[] = [
  "maklarbild",
  "arsredovisning",
  "stadgar",
  "kontrakt",
  "planritning",
  "energideklaration",
  "ovrigt",
];

interface ClassificationResult {
  docType: DocType;
  confidence: number;
  reasoning: string;
  promptVersion: string;
  tokenCount: number;
}

export async function classifyDocument(
  documentText: string,
): Promise<ClassificationResult> {
  const provider = getLLMProvider();

  const { text, tokenCount } = await provider.complete({
    systemPrompt: CLASSIFY_DOC_SYSTEM_PROMPT,
    userPrompt: buildClassifyDocUserPrompt(documentText),
    maxTokens: 500,
    temperature: 0.1,
  });

  try {
    const parsed = JSON.parse(text);
    const docType = VALID_DOC_TYPES.includes(parsed.doc_type)
      ? (parsed.doc_type as DocType)
      : "ovrigt";

    return {
      docType,
      confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0)),
      reasoning: parsed.reasoning || "",
      promptVersion: CLASSIFY_DOC_PROMPT_VERSION,
      tokenCount,
    };
  } catch {
    return {
      docType: "ovrigt",
      confidence: 0,
      reasoning: "Kunde inte tolka klassificeringsresultat",
      promptVersion: CLASSIFY_DOC_PROMPT_VERSION,
      tokenCount,
    };
  }
}
