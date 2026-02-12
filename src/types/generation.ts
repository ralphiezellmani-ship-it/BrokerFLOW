import type { Database } from "./database";

export type Generation = Database["public"]["Tables"]["generations"]["Row"];
export type GenerationInsert =
  Database["public"]["Tables"]["generations"]["Insert"];
export type GenerationUpdate =
  Database["public"]["Tables"]["generations"]["Update"];

export type GenerationType = Generation["type"];

export const GENERATION_TYPE_LABELS: Record<GenerationType, string> = {
  ad_copy: "Annonstext",
  email_brf: "E-post till BRF",
  email_buyer: "E-post till köpare",
  email_seller: "E-post till säljare",
  email_bank: "E-post till bank",
  settlement_draft: "Likvidavräkning (utkast)",
  brf_application: "BRF-ansökan",
  access_request: "Tillträdesmall",
  checklist: "Checklista",
};

export type Tone = "professional" | "casual" | "luxury";

export const TONE_LABELS: Record<Tone, string> = {
  professional: "Professionell",
  casual: "Ledig",
  luxury: "Lyxig",
};
