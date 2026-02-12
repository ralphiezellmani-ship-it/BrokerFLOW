import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe, getStripePriceId, type PlanId } from "@/lib/stripe/client";

/**
 * POST /api/stripe/checkout
 * Creates a Stripe Checkout session for the given plan.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("id, tenant_id, role, email")
    .eq("id", authUser.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return NextResponse.json(
      { error: "Bara administratörer kan ändra prenumeration" },
      { status: 403 },
    );
  }

  const body = await req.json();
  const plan = body.plan as PlanId;

  if (!plan || !["starter", "pro", "team"].includes(plan)) {
    return NextResponse.json(
      { error: "Ogiltig plan" },
      { status: 400 },
    );
  }

  const priceId = getStripePriceId(plan);
  if (!priceId) {
    return NextResponse.json(
      { error: "Stripe-pris ej konfigurerat för denna plan" },
      { status: 400 },
    );
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, stripe_customer_id")
    .eq("id", profile.tenant_id)
    .single();

  if (!tenant) {
    return NextResponse.json(
      { error: "Organisation hittades inte" },
      { status: 404 },
    );
  }

  const stripe = getStripe();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Reuse existing Stripe customer or create a new one
  let customerId = tenant.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile.email,
      metadata: {
        tenant_id: tenant.id,
        user_id: profile.id,
      },
    });
    customerId = customer.id;

    await supabase
      .from("tenants")
      .update({ stripe_customer_id: customerId })
      .eq("id", tenant.id);
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/settings/billing?success=true`,
    cancel_url: `${appUrl}/settings/billing?canceled=true`,
    metadata: {
      tenant_id: tenant.id,
      plan,
    },
  });

  return NextResponse.json({ url: session.url });
}
