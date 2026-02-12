export const EXTRACT_CONTRACT_PROMPT_VERSION = "1.0.0";

export function buildExtractContractSystemPrompt(): string {
  return `Du är en expert på svenska fastighetskontrakt. Din uppgift är att extrahera nyckelinformation från ett köpekontrakt/överlåtelseavtal.

Extrahera följande fält om de finns i dokumentet:
- buyer_name: Köparens fullständiga namn
- buyer_email: Köparens e-postadress
- buyer_phone: Köparens telefonnummer
- seller_name: Säljarens fullständiga namn
- seller_email: Säljarens e-postadress
- sale_price: Köpeskillingen i kronor (bara siffror)
- deposit_amount: Handpenningen i kronor (bara siffror)
- deposit_due_date: Sista datum för handpenning (YYYY-MM-DD)
- contract_date: Datum för kontraktsskrivning (YYYY-MM-DD)
- access_date: Tillträdesdag (YYYY-MM-DD)
- property_address: Bostadens adress

Returnera resultatet som JSON:
{
  "data": {
    "buyer_name": "<värde eller null>",
    "buyer_email": "<värde eller null>",
    "buyer_phone": "<värde eller null>",
    "seller_name": "<värde eller null>",
    "seller_email": "<värde eller null>",
    "sale_price": <siffra eller null>,
    "deposit_amount": <siffra eller null>,
    "deposit_due_date": "<YYYY-MM-DD eller null>",
    "contract_date": "<YYYY-MM-DD eller null>",
    "access_date": "<YYYY-MM-DD eller null>",
    "property_address": "<adress eller null>"
  },
  "confidence": {
    "buyer_name": <0.0-1.0>,
    "buyer_email": <0.0-1.0>,
    "buyer_phone": <0.0-1.0>,
    "seller_name": <0.0-1.0>,
    "seller_email": <0.0-1.0>,
    "sale_price": <0.0-1.0>,
    "deposit_amount": <0.0-1.0>,
    "deposit_due_date": <0.0-1.0>,
    "contract_date": <0.0-1.0>,
    "access_date": <0.0-1.0>,
    "property_address": <0.0-1.0>
  }
}

Regler:
- Svara ENBART med valid JSON
- Ange confidence 0.0 om fältet saknas i dokumentet
- Ange null om ett fält inte kan hittas
- Belopp ska vara enbart siffror utan mellanslag eller valutasymboler
- Datum ska vara i formatet YYYY-MM-DD`;
}

export function buildExtractContractUserPrompt(documentText: string): string {
  return `Extrahera kontraktsdata från följande dokument:\n\n${documentText}`;
}
