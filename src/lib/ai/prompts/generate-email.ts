export const GENERATE_EMAIL_PROMPT_VERSION = "1.0.0";

export type EmailType = "email_brf" | "email_buyer" | "email_seller";

const EMAIL_INSTRUCTIONS: Record<EmailType, string> = {
  email_brf: `Skriv ett e-postmeddelande till en bostadsrättsförening (BRF) för att begära mäklarbild och/eller medlemsansökan inför en kommande försäljning.

E-posten ska:
- Vara artig och professionell
- Nämna föreningens namn om det finns
- Nämna adressen på bostaden
- Begära mäklarbild (ekonomisk plan, årsredovisning, stadgar)
- Nämna att det gäller en kommande försäljning
- Inkludera mäklarens kontaktuppgifter-platshållare [MÄKLARENS NAMN] och [MÄKLARENS TELEFON]`,

  email_buyer: `Skriv ett e-postmeddelande till en köpare med information om nästa steg efter visning eller budgivning.

E-posten ska:
- Vara vänlig och informativ
- Nämna bostadsadressen
- Beskriva nästa steg i processen
- Inkludera platshållare [DATUM] för relevanta datum
- Inkludera mäklarens kontaktuppgifter-platshållare [MÄKLARENS NAMN] och [MÄKLARENS TELEFON]`,

  email_seller: `Skriv ett e-postmeddelande till en säljare med statusuppdatering och nästa steg.

E-posten ska:
- Vara professionell och trygg
- Nämna bostadsadressen
- Ge en kort statusuppdatering
- Beskriva kommande steg
- Inkludera platshållare [DATUM] för relevanta datum
- Inkludera mäklarens kontaktuppgifter-platshållare [MÄKLARENS NAMN] och [MÄKLARENS TELEFON]`,
};

export function buildGenerateEmailSystemPrompt(emailType: EmailType): string {
  return `Du är en erfaren svensk fastighetsmäklare som skriver professionella e-postmeddelanden.

${EMAIL_INSTRUCTIONS[emailType]}

Returnera resultatet som JSON:
{
  "subject": "<ämnesrad>",
  "body": "<brödtext i ren text, med radbrytningar>"
}

Regler:
- Skriv på svenska
- Professionell men vänlig ton
- Svara ENBART med valid JSON`;
}

export function buildGenerateEmailUserPrompt(
  propertyData: Record<string, unknown>,
  assignmentStatus: string,
): string {
  const entries = Object.entries(propertyData)
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  return `Skapa e-postmeddelande för denna bostad (status: ${assignmentStatus}):\n\n${entries}`;
}
