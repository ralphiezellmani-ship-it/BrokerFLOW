"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTenant } from "@/hooks/use-tenant";
import { LoadingSpinner } from "@/components/shared/loading-spinner";

export default function BillingPage() {
  const { tenant, loading } = useTenant();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner text="Laddar..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Fakturering</h1>
        <p className="text-muted-foreground">
          Hantera din prenumeration och betalning
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nuvarande plan</CardTitle>
          <CardDescription>Din aktiva prenumerationsplan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-sm">
              {tenant?.subscription_plan === "trial"
                ? "Provperiod"
                : tenant?.subscription_plan}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Stripe-integration konfigureras i en framtida version.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
