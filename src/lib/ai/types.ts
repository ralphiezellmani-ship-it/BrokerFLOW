export interface LLMCompletionParams {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMCompletionResult {
  text: string;
  tokenCount: number;
}

export interface LLMExtractionParams {
  documentText: string;
  extractionSchema: Record<string, string>;
}

export interface LLMExtractionResult {
  data: Record<string, unknown>;
  confidence: Record<string, number>;
}

export interface LLMProvider {
  complete(params: LLMCompletionParams): Promise<LLMCompletionResult>;
  extractFromDocument(
    params: LLMExtractionParams,
  ): Promise<LLMExtractionResult>;
}
