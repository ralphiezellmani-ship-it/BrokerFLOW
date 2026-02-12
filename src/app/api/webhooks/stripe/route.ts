import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, getPlanFromPriceId } from "@/lib/stripe/client";
import { createAuditLog } from "@/lib/audit/log";
import type Stripe from "stripe";

/**
 * POST /api/webhooks/stripe
 * Handles Stripe webhook events:
 * - checkout.session.completed → activate subscription
 * - customer.subscription.updated → plan change
 * - customer.subscription.deleted → cancel subscription
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: "Missing signature or webhook secret" },
      { status: 400 },
    );
  }

  const stripe = getStripe();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json(
      { error: `Webhook verification failed: ${message}` },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const tenantId = session.metadata?.tenant_id;
      const plan = session.metadata?.plan;

      if (tenantId && plan && session.subscription) {
        await supabase
          .from("tenants")
          .update({
            subscription_plan: plan,
            stripe_subscription_id:
              typeof session.subscription === "string"
                ? session.subscription
                : session.subscription.id,
          })
          .eq("id", tenantId);

        await createAuditLog(supabase, {
          tenantId,
          action: "tenant.settings_changed",
          entityType: "tenant",
          entityId: tenantId,
          metadata: {
            field: "subscription",
            event: "checkout.session.completed",
            plan,
          },
        });
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;

      const { data: tenant } = await supabase
        .from("tenants")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .single();

      if (tenant) {
        const priceId = subscription.items.data[0]?.price?.id;
        const newPlan = priceId ? getPlanFromPriceId(priceId) : null;

        if (newPlan) {
          await supabase
            .from("tenants")
            .update({
              subscription_plan: newPlan,
              stripe_subscription_id: subscription.id,
            })
            .eq("id", tenant.id);

          await createAuditLog(supabase, {
            tenantId: tenant.id,
            action: "tenant.settings_changed",
            entityType: "tenant",
            entityId: tenant.id,
            metadata: {
              field: "subscription",
              event: "customer.subscription.updated",
              plan: newPlan,
              status: subscription.status,
            },
          });
        }
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;

      const { data: tenant } = await supabase
        .from("tenants")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .single();

      if (tenant) {
        await supabase
          .from("tenants")
          .update({
            subscription_plan: "trial",
            stripe_subscription_id: null,
          })
          .eq("id", tenant.id);

        await createAuditLog(supabase, {
          tenantId: tenant.id,
          action: "tenant.settings_changed",
          entityType: "tenant",
          entityId: tenant.id,
          metadata: {
            field: "subscription",
            event: "customer.subscription.deleted",
            reverted_to: "trial",
          },
        });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
