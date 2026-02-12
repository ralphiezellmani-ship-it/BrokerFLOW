import { AnthropicProvider } from "./anthropic";
import { OpenAIProvider } from "./openai";
import type { LLMProvider } from "./types";

export type LLMProviderName = "anthropic" | "openai";

export function getLLMProvider(providerName?: string): LLMProvider {
  const provider = (providerName ||
    process.env.LLM_PROVIDER ||
    "anthropic") as LLMProviderName;

  switch (provider) {
    case "anthropic":
      return new AnthropicProvider();
    case "openai":
      return new OpenAIProvider();
    default:
      throw new Error(`Unknown LLM provider: ${provider}`);
  }
}

export function getLLMProviderName(): LLMProviderName {
  return (process.env.LLM_PROVIDER || "anthropic") as LLMProviderName;
}

export function getLLMModelName(providerName?: LLMProviderName): string {
  const provider = providerName || getLLMProviderName();
  switch (provider) {
    case "anthropic":
      return "claude-sonnet-4-20250514";
    case "openai":
      return "gpt-4o";
    default:
      return "unknown";
  }
}
