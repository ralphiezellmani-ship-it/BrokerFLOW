import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/client";

/**
 * POST /api/stripe/portal
 * Creates a Stripe Customer Portal session so the user can manage
 * their subscription, update payment method, or cancel.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("tenant_id, role")
    .eq("id", authUser.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return NextResponse.json(
      { error: "Bara administratörer kan hantera fakturering" },
      { status: 403 },
    );
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("stripe_customer_id")
    .eq("id", profile.tenant_id)
    .single();

  if (!tenant?.stripe_customer_id) {
    return NextResponse.json(
      { error: "Ingen aktiv Stripe-kund. Välj en plan först." },
      { status: 400 },
    );
  }

  const stripe = getStripe();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const session = await stripe.billingPortal.sessions.create({
    customer: tenant.stripe_customer_id,
    return_url: `${appUrl}/settings/billing`,
  });

  return NextResponse.json({ url: session.url });
}
