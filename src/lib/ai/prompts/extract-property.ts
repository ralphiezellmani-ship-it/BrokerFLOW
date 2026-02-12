export const EXTRACT_PROPERTY_PROMPT_VERSION = "1.0.0";

export const EXTRACTION_SCHEMA: Record<string, string> = {
  monthly_fee: "Månadsavgift i kronor (siffra)",
  living_area_sqm: "Boarea i kvadratmeter (siffra)",
  rooms: "Antal rum (siffra, t.ex. 3 eller 2.5)",
  floor: "Våningsplan (siffra)",
  total_floors: "Totalt antal våningar i huset (siffra)",
  build_year: "Byggår (fyrsiffrigt årtal)",
  association_name: "Bostadsrättsföreningens namn (text)",
  association_org_number: "Föreningens organisationsnummer (text, format 769XXX-XXXX)",
  renovation_info: "Renoveringsinformation — vad har renoverats och när (text)",
  economic_summary: "Ekonomisk sammanfattning av föreningen (text)",
  energy_class: "Energiklass (A-G)",
  parking: "Parkeringsmöjligheter (text)",
  balcony: "Balkong: finns det balkong? (ja/nej/text)",
  elevator: "Hiss: finns det hiss? (ja/nej)",
  upcoming_renovations: "Planerade renoveringar i föreningen (text)",
};

export const EXTRACT_PROPERTY_SYSTEM_PROMPT = `Du är en expert på att extrahera strukturerad data från svenska fastighetsdokument (mäklarbilder, årsredovisningar, stadgar, m.m.).

Extrahera följande fält från dokumenttexten nedan. Om ett fält inte hittas, utelämna det eller sätt till null.

Fält att extrahera:
${Object.entries(EXTRACTION_SCHEMA)
  .map(([key, desc]) => `- "${key}": ${desc}`)
  .join("\n")}

Svara ENBART med valid JSON i detta format:
{
  "data": {
    "<fältnamn>": <värde>,
    ...
  },
  "confidence": {
    "<fältnamn>": <0.0-1.0>,
    ...
  },
  "source_references": {
    "<fältnamn>": "<citat eller sidnummer där data hittades>",
    ...
  }
}

Regler:
- Numeriska värden ska vara tal, inte strängar
- Confidence 0.0 = gissning, 1.0 = säkert hittat i texten
- Inkludera source_references med korta citat som visar var data hittades
- Svara på svenska om text-fält`;

export function buildExtractPropertyUserPrompt(
  documentText: string,
): string {
  const truncated = documentText.slice(0, 12000);
  return `Extrahera fastighetsdata från detta dokument:\n\n---\n${truncated}\n---`;
}
