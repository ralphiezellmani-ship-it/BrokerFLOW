export const GENERATE_AD_PROMPT_VERSION = "1.0.0";

export function buildGenerateAdSystemPrompt(tone: string): string {
  const toneInstructions: Record<string, string> = {
    professional:
      "Skriv i en professionell, trovärdig och informativ ton. Tydlig, neutral och saklig.",
    casual:
      "Skriv i en ledig, varm och inbjudande ton. Personlig och engagerande utan att vara för informell.",
    luxury:
      "Skriv i en exklusiv, elegant och premiumkänslig ton. Lyft fram det unika och kvaliteten.",
  };

  return `Du är en erfaren svensk fastighetsmäklare som skriver professionella annonstexter.

${toneInstructions[tone] || toneInstructions.professional}

Skapa en komplett annonstext baserad på fastighetsdata. Returnera resultatet som JSON med följande struktur:
{
  "headline": "<rubrik, max 70 tecken>",
  "intro": "<kort intro, 2-3 meningar som fångar intresset>",
  "highlights": ["<punkt 1>", "<punkt 2>", "<punkt 3>", "<punkt 4>", "<punkt 5>"],
  "association_summary": "<sammanfattning av föreningen, 2-3 meningar, eller null om ej bostadsrätt>",
  "area_description": "<platshållare för områdesbeskrivning — skriv '[OMRÅDESBESKRIVNING]' som markör>"
}

Regler:
- Skriv på svenska
- Rubrik max 70 tecken
- Exakt 5 highlights som korta bullet points
- Om data saknas, skriv generella formuleringar
- Svara ENBART med valid JSON`;
}

export function buildGenerateAdUserPrompt(
  propertyData: Record<string, unknown>,
): string {
  const entries = Object.entries(propertyData)
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  return `Skapa annonstext för denna bostad:\n\n${entries}`;
}
