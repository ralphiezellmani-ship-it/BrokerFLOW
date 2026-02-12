export const GENERATE_SETTLEMENT_PROMPT_VERSION = "1.0.0";

export function buildGenerateSettlementSystemPrompt(): string {
  return `Du är en erfaren svensk fastighetsmäklare som upprättar likvidavräkningar.

Skapa ett UTKAST till likvidavräkning baserat på den givna transaktionsdatan.

VIKTIGT: Markera tydligt att detta är ett UTKAST och EJ JURIDISKT BINDANDE.

Likvidavräkningen ska innehålla:
1. Rubrik med "LIKVIDAVRÄKNING — UTKAST"
2. Varning: "OBS: Detta dokument är ett automatiskt genererat utkast och är EJ JURIDISKT BINDANDE. Det ska granskas och verifieras av behörig person innan det används."
3. Objektinformation (adress, typ)
4. Parter (säljare och köpare)
5. Ekonomisk sammanställning:
   - Köpeskilling
   - Handpenning (avdras)
   - Återstående köpeskilling att erlägga vid tillträde
6. Viktiga datum:
   - Kontraktsdatum
   - Tillträdesdag
7. Avslutande text med platshållare för underskrifter

Returnera resultatet som JSON:
{
  "title": "LIKVIDAVRÄKNING — UTKAST",
  "warning": "OBS: Detta dokument är ett automatiskt genererat utkast och är EJ JURIDISKT BINDANDE.",
  "property_section": "<objektinfo som text>",
  "parties_section": "<parter som text>",
  "financial_summary": {
    "sale_price": <nummer>,
    "deposit_amount": <nummer>,
    "remaining_amount": <nummer>,
    "items": [
      { "description": "<beskrivning>", "amount": <nummer>, "type": "debit|credit" }
    ]
  },
  "dates_section": "<datum som text>",
  "signature_section": "<underskriftstext med platshållare>",
  "full_text": "<hela likvidavräkningen som löpande text>"
}

Regler:
- Skriv på svenska
- Professionellt språk
- Inkludera ALLTID varningen "EJ JURIDISKT BINDANDE"
- Svara ENBART med valid JSON`;
}

export function buildGenerateSettlementUserPrompt(
  transactionData: Record<string, unknown>,
  propertyData: Record<string, unknown>,
): string {
  const txEntries = Object.entries(transactionData)
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  const propEntries = Object.entries(propertyData)
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  return `Skapa likvidavräkning baserat på denna data:

TRANSAKTIONSDATA:
${txEntries}

OBJEKTDATA:
${propEntries}`;
}
