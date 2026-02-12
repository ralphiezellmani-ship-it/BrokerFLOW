"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { useTenant } from "@/hooks/use-tenant";
import { createAuditLog } from "@/lib/audit/log";
import { DeleteTenantData } from "@/components/settings/delete-tenant-data";
import { AlertCircle, CheckCircle2, ShieldAlert } from "lucide-react";

export default function RetentionPage() {
  const { user, tenant, loading: tenantLoading, isAdmin } = useTenant();
  const [rawDays, setRawDays] = useState(180);
  const [derivedDays, setDerivedDays] = useState(365);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (tenant) {
      setRawDays(tenant.retention_raw_days);
      setDerivedDays(tenant.retention_derived_days);
    }
  }, [tenant]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!tenant || !user || !isAdmin) return;

    setError(null);
    setSuccess(false);
    setSaving(true);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("tenants")
      .update({
        retention_raw_days: rawDays,
        retention_derived_days: derivedDays,
      })
      .eq("id", tenant.id);

    if (updateError) {
      setError("Kunde inte spara: " + updateError.message);
    } else {
      await createAuditLog(supabase, {
        tenantId: tenant.id,
        actorUserId: user.id,
        action: "tenant.settings_changed",
        entityType: "tenant",
        entityId: tenant.id,
        metadata: {
          field: "retention",
          retention_raw_days: rawDays,
          retention_derived_days: derivedDays,
        },
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }

    setSaving(false);
  }

  if (tenantLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner text="Laddar..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          GDPR & Datalagring
        </h1>
        <p className="text-muted-foreground">
          Konfigurera hur länge data sparas innan den raderas automatiskt
        </p>
      </div>

      <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertDescription>
          Revisionsloggar sparas alltid i minst 2 år enligt lagkrav,
          oavsett inställningarna nedan.
        </AlertDescription>
      </Alert>

      <Card>
        <form onSubmit={handleSave}>
          <CardHeader>
            <CardTitle>Lagringstider</CardTitle>
            <CardDescription>
              Ange antal dagar innan data tas bort automatiskt. Borttagen data
              kan inte återställas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>Inställningarna har sparats.</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="raw-days">
                Rådata (dokument, bilagor)
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="raw-days"
                  type="number"
                  min={30}
                  max={730}
                  value={rawDays}
                  onChange={(e) => setRawDays(Number(e.target.value))}
                  disabled={!isAdmin || saving}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">dagar</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Standard: 180 dagar. Gäller uppladdade dokument och bilagor.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="derived-days">
                Härledd data (AI-extraktioner, genererade texter)
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="derived-days"
                  type="number"
                  min={30}
                  max={730}
                  value={derivedDays}
                  onChange={(e) => setDerivedDays(Number(e.target.value))}
                  disabled={!isAdmin || saving}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">dagar</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Standard: 365 dagar. Gäller extraherad data och AI-genererade
                texter.
              </p>
            </div>
          </CardContent>
          {isAdmin && (
            <CardFooter>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <LoadingSpinner size="sm" text="Sparar..." />
                ) : (
                  "Spara ändringar"
                )}
              </Button>
            </CardFooter>
          )}
        </form>
      </Card>

      {/* Tenant data deletion — Issue 9.6 */}
      {tenant && (
        <DeleteTenantData tenantName={tenant.name} isAdmin={isAdmin} />
      )}
    </div>
  );
}
