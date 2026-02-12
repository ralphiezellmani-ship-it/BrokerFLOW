"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { useTenant } from "@/hooks/use-tenant";
import { PLANS, type PlanId } from "@/lib/stripe/client";
import { getPlanLabel } from "@/lib/stripe/feature-gate";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Sparkles,
} from "lucide-react";

const PLAN_ORDER: PlanId[] = ["starter", "pro", "team", "enterprise"];

export default function BillingPage() {
  const { tenant, loading, isAdmin } = useTenant();
  const searchParams = useSearchParams();
  const [checkoutLoading, setCheckoutLoading] = useState<PlanId | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const success = searchParams.get("success") === "true";
  const canceled = searchParams.get("canceled") === "true";

  async function handleCheckout(plan: PlanId) {
    setError(null);
    setCheckoutLoading(plan);

    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Kunde inte starta checkout");
      setCheckoutLoading(null);
      return;
    }

    window.location.href = data.url;
  }

  async function handlePortal() {
    setError(null);
    setPortalLoading(true);

    const res = await fetch("/api/stripe/portal", {
      method: "POST",
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Kunde inte öppna kundportalen");
      setPortalLoading(false);
      return;
    }

    window.location.href = data.url;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner text="Laddar..." />
      </div>
    );
  }

  const currentPlan = tenant?.subscription_plan || "trial";
  const hasSubscription = !!tenant?.stripe_subscription_id;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Fakturering</h1>
        <p className="text-muted-foreground">
          Hantera din prenumeration och betalning
        </p>
      </div>

      {success && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            Prenumerationen är aktiverad! Tack för ditt köp.
          </AlertDescription>
        </Alert>
      )}

      {canceled && (
        <Alert>
          <AlertDescription>
            Checkout avbröts. Ingen betalning har gjorts.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Current plan */}
      <Card>
        <CardHeader>
          <CardTitle>Nuvarande plan</CardTitle>
          <CardDescription>Din aktiva prenumerationsplan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Badge
              variant={currentPlan === "trial" ? "secondary" : "default"}
              className="text-sm"
            >
              {getPlanLabel(currentPlan)}
            </Badge>
            {currentPlan === "trial" && (
              <span className="text-sm text-muted-foreground">
                14 dagars provperiod — full Pro-funktionalitet
              </span>
            )}
          </div>
        </CardContent>
        {hasSubscription && isAdmin && (
          <CardFooter>
            <Button
              variant="outline"
              onClick={handlePortal}
              disabled={portalLoading}
            >
              {portalLoading ? (
                <LoadingSpinner size="sm" text="Öppnar..." />
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Hantera prenumeration
                  <ExternalLink className="ml-2 h-3 w-3" />
                </>
              )}
            </Button>
          </CardFooter>
        )}
      </Card>

      {/* Pricing cards */}
      {isAdmin && (
        <div>
          <h2 className="mb-4 text-lg font-semibold">Tillgängliga planer</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PLAN_ORDER.map((planId) => {
              const plan = PLANS[planId];
              const isCurrent = currentPlan === planId;
              const isPopular = planId === "pro";

              return (
                <Card
                  key={planId}
                  className={cn(
                    "relative flex flex-col",
                    isPopular && "border-primary shadow-md",
                  )}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="gap-1">
                        <Sparkles className="h-3 w-3" />
                        Populärast
                      </Badge>
                    </div>
                  )}
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <div className="text-2xl font-bold">
                      {plan.price > 0 ? (
                        <>
                          {plan.priceLabel.split("/")[0]}
                          <span className="text-sm font-normal text-muted-foreground">
                            /{plan.priceLabel.split("/")[1]}
                          </span>
                        </>
                      ) : (
                        <span className="text-lg">{plan.priceLabel}</span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <ul className="space-y-2">
                      {plan.features.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-start gap-2 text-sm"
                        >
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-500" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    {isCurrent ? (
                      <Button variant="outline" className="w-full" disabled>
                        Nuvarande plan
                      </Button>
                    ) : planId === "enterprise" ? (
                      <a href="mailto:kontakt@brokerflow.se" className="w-full">
                        <Button variant="outline" className="w-full">
                          Kontakta oss
                        </Button>
                      </a>
                    ) : (
                      <Button
                        className="w-full"
                        variant={isPopular ? "default" : "outline"}
                        onClick={() => handleCheckout(planId)}
                        disabled={checkoutLoading !== null}
                      >
                        {checkoutLoading === planId ? (
                          <LoadingSpinner size="sm" text="Laddar..." />
                        ) : (
                          `Välj ${plan.name}`
                        )}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
