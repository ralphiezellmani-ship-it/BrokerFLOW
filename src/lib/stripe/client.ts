import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    stripeInstance = new Stripe(key, {
      typescript: true,
    });
  }
  return stripeInstance;
}

/**
 * Plan definitions matching CLAUDE.md section 12.
 * Prices are in SEK (öre for Stripe).
 */
export const PLANS = {
  starter: {
    name: "Starter",
    price: 990,
    priceLabel: "990 kr/mån",
    agents: 1,
    features: [
      "Dashboard & uppdragshantering",
      "Checklistor per uppdrag",
      "10 AI-genereringar/mån",
      "Dokumentuppladdning",
    ],
    limits: {
      ai_generations_per_month: 10,
      inbound_email: false,
      email_sending: false,
    },
  },
  pro: {
    name: "Pro",
    price: 1790,
    priceLabel: "1 790 kr/mån",
    agents: 1,
    features: [
      "Allt i Starter",
      "Obegränsade AI-genereringar",
      "Inbound e-post",
      "Workflow-automation",
      "E-postutskick",
    ],
    limits: {
      ai_generations_per_month: Infinity,
      inbound_email: true,
      email_sending: true,
    },
  },
  team: {
    name: "Team",
    price: 1490,
    priceLabel: "1 490 kr/mäklare/mån",
    agents: 10,
    features: [
      "Allt i Pro",
      "2–10 mäklare",
      "Team-hantering",
      "Delad mall-bank",
      "Admin-vy",
    ],
    limits: {
      ai_generations_per_month: Infinity,
      inbound_email: true,
      email_sending: true,
    },
  },
  enterprise: {
    name: "Enterprise",
    price: 0,
    priceLabel: "Offert",
    agents: -1,
    features: [
      "Allt i Team",
      "Anpassade workflows",
      "API-access",
      "SLA & dedicerad support",
    ],
    limits: {
      ai_generations_per_month: Infinity,
      inbound_email: true,
      email_sending: true,
    },
  },
} as const;

export type PlanId = keyof typeof PLANS;

/**
 * Map Stripe price IDs to plan names.
 * Configure these in .env — they must match your Stripe dashboard.
 */
export function getPlanFromPriceId(priceId: string): PlanId | null {
  const mapping: Record<string, PlanId> = {
    [process.env.STRIPE_PRICE_STARTER || ""]: "starter",
    [process.env.STRIPE_PRICE_PRO || ""]: "pro",
    [process.env.STRIPE_PRICE_TEAM || ""]: "team",
  };
  return mapping[priceId] || null;
}

/**
 * Get the Stripe price ID for a given plan.
 */
export function getStripePriceId(plan: PlanId): string | null {
  const mapping: Record<PlanId, string | undefined> = {
    starter: process.env.STRIPE_PRICE_STARTER,
    pro: process.env.STRIPE_PRICE_PRO,
    team: process.env.STRIPE_PRICE_TEAM,
    enterprise: undefined,
  };
  return mapping[plan] || null;
}
