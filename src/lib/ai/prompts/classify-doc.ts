export const CLASSIFY_DOC_PROMPT_VERSION = "1.0.0";

export const CLASSIFY_DOC_SYSTEM_PROMPT = `Du är en expert på att klassificera svenska fastighetsdokument.

Givet texten från ett dokument, klassificera det som en av följande typer:
- "maklarbild" — Mäklarbild / objektsbeskrivning från BRF
- "arsredovisning" — Årsredovisning från bostadsrättsförening
- "stadgar" — Stadgar för bostadsrättsförening
- "kontrakt" — Köpekontrakt / överlåtelseavtal
- "planritning" — Planritning / lägenhetsritning
- "energideklaration" — Energideklaration
- "ovrigt" — Allt annat

Svara ENBART med valid JSON i detta format:
{
  "doc_type": "<typ>",
  "confidence": <0.0-1.0>,
  "reasoning": "<kort motivering på svenska>"
}`;

export function buildClassifyDocUserPrompt(documentText: string): string {
  const truncated = documentText.slice(0, 8000);
  return `Klassificera följande dokument:\n\n---\n${truncated}\n---`;
}
