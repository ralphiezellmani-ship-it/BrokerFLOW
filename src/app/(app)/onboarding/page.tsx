"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { AlertCircle, Building2 } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const [tenantName, setTenantName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Du måste vara inloggad.");
      setLoading(false);
      return;
    }

    // Create tenant
    const slug = tenantName
      .toLowerCase()
      .replace(/[åä]/g, "a")
      .replace(/ö/g, "o")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .insert({ name: tenantName, slug })
      .select()
      .single();

    if (tenantError) {
      setError("Kunde inte skapa organisation: " + tenantError.message);
      setLoading(false);
      return;
    }

    // Create user profile linked to tenant
    const fullName =
      user.user_metadata?.full_name || user.email?.split("@")[0] || "Användare";

    const { error: userError } = await supabase.from("users").insert({
      id: user.id,
      tenant_id: tenant.id,
      role: "admin",
      full_name: fullName,
      email: user.email!,
    });

    if (userError) {
      // Clean up tenant if user creation fails
      await supabase.from("tenants").delete().eq("id", tenant.id);
      setError("Kunde inte skapa användarprofil: " + userError.message);
      setLoading(false);
      return;
    }

    // Create default tenant preferences
    await supabase.from("tenant_preferences").insert({
      tenant_id: tenant.id,
    });

    // Create inbound email alias
    const token = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
    await supabase.from("inbound_aliases").insert({
      tenant_id: tenant.id,
      email_alias: `kontoret+${token}`,
      secret_token: crypto.randomUUID(),
    });

    // Log the event
    await supabase.from("audit_logs").insert({
      tenant_id: tenant.id,
      actor_user_id: user.id,
      action: "tenant.created",
      entity_type: "tenant",
      entity_id: tenant.id,
      metadata_json: { tenant_name: tenantName },
    });

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Välkommen till BrokerFlow</CardTitle>
          <CardDescription>
            Skapa din organisation för att komma igång. Du kan bjuda in kollegor
            senare.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="tenant-name">Namn på mäklarbyrå</Label>
              <Input
                id="tenant-name"
                type="text"
                placeholder="T.ex. Andersson Mäkleri AB"
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                required
                disabled={loading}
                minLength={2}
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">
                Detta kan ändras senare i inställningarna.
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <LoadingSpinner size="sm" text="Skapar organisation..." />
              ) : (
                "Skapa organisation"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
