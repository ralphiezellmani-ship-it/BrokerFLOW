import { PLANS, type PlanId } from "./client";

/**
 * Feature gate helper. Checks whether a tenant's plan includes
 * a specific feature or is within usage limits.
 */

const PLAN_HIERARCHY: PlanId[] = ["starter", "pro", "team", "enterprise"];

function planIndex(plan: string): number {
  const idx = PLAN_HIERARCHY.indexOf(plan as PlanId);
  return idx >= 0 ? idx : -1;
}

/** Check if the tenant plan is at least the required level */
export function hasPlanLevel(
  currentPlan: string,
  requiredPlan: PlanId,
): boolean {
  // Trial gets starter-level access
  const effective = currentPlan === "trial" ? "starter" : currentPlan;
  return planIndex(effective) >= planIndex(requiredPlan);
}

/** Check if the tenant can use inbound email */
export function canUseInboundEmail(plan: string): boolean {
  return hasPlanLevel(plan, "pro");
}

/** Check if the tenant can send emails via the platform */
export function canSendEmails(plan: string): boolean {
  return hasPlanLevel(plan, "pro");
}

/** Check if the tenant can add team members */
export function canManageTeam(plan: string): boolean {
  return hasPlanLevel(plan, "team");
}

/** Get AI generation limit for the plan */
export function getAiGenerationLimit(plan: string): number {
  const effective = (plan === "trial" ? "starter" : plan) as PlanId;
  const config = PLANS[effective];
  if (!config) return 10;
  return config.limits.ai_generations_per_month;
}

/** Get the user-facing label for a plan */
export function getPlanLabel(plan: string): string {
  if (plan === "trial") return "Provperiod";
  const config = PLANS[plan as PlanId];
  return config?.name || plan;
}
