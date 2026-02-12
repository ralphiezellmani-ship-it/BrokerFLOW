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
import { AlertCircle, CheckCircle2 } from "lucide-react";

export default function SettingsPage() {
  const { user, tenant, loading: tenantLoading, isAdmin } = useTenant();
  const [tenantName, setTenantName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (tenant) {
      setTenantName(tenant.name);
    }
  }, [tenant]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!tenant || !user) return;
    if (!isAdmin) {
      setError("Endast administratörer kan ändra inställningar.");
      return;
    }

    setError(null);
    setSuccess(false);
    setSaving(true);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("tenants")
      .update({ name: tenantName })
      .eq("id", tenant.id);

    if (updateError) {
      setError("Kunde inte spara: " + updateError.message);
    } else {
      // Log
      await supabase.from("audit_logs").insert({
        tenant_id: tenant.id,
        actor_user_id: user.id,
        action: "tenant.settings_changed",
        entity_type: "tenant",
        entity_id: tenant.id,
        metadata_json: { field: "name", new_value: tenantName },
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }

    setSaving(false);
  }

  if (tenantLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner text="Laddar inställningar..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Inställningar</h1>
        <p className="text-muted-foreground">
          Hantera din organisations inställningar
        </p>
      </div>

      <Card>
        <form onSubmit={handleSave}>
          <CardHeader>
            <CardTitle>Organisation</CardTitle>
            <CardDescription>
              Grundläggande information om din mäklarbyrå
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
              <Label htmlFor="tenant-name">Byråns namn</Label>
              <Input
                id="tenant-name"
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                disabled={!isAdmin || saving}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Prenumerationsplan</Label>
              <p className="text-sm text-muted-foreground">
                {tenant?.subscription_plan === "trial"
                  ? "Provperiod (14 dagar)"
                  : tenant?.subscription_plan}
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
    </div>
  );
}
