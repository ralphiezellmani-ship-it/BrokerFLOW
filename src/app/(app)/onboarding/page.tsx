"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createAuditLog } from "@/lib/audit/log";
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
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  Building2,
  User,
  FileText,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

type Step = "org" | "profile" | "first-assignment";

const STEPS: { id: Step; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "org", label: "Organisation", icon: Building2 },
  { id: "profile", label: "Din profil", icon: User },
  { id: "first-assignment", label: "Första uppdraget", icon: FileText },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("org");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Step 1: Org
  const [tenantName, setTenantName] = useState("");

  // Step 2: Profile
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  // Step 3: First assignment
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");

  // Internal state
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  async function handleCreateOrg(e: React.FormEvent) {
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

    // Pre-fill name from auth metadata
    const name =
      user.user_metadata?.full_name || user.email?.split("@")[0] || "";

    const { error: userError } = await supabase.from("users").insert({
      id: user.id,
      tenant_id: tenant.id,
      role: "admin",
      full_name: name || "Användare",
      email: user.email!,
    });

    if (userError) {
      await supabase.from("tenants").delete().eq("id", tenant.id);
      setError("Kunde inte skapa användarprofil: " + userError.message);
      setLoading(false);
      return;
    }

    // Create defaults
    await supabase.from("tenant_preferences").insert({ tenant_id: tenant.id });

    const token = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
    await supabase.from("inbound_aliases").insert({
      tenant_id: tenant.id,
      email_alias: `kontoret+${token}`,
      secret_token: crypto.randomUUID(),
    });

    await createAuditLog(supabase, {
      tenantId: tenant.id,
      actorUserId: user.id,
      action: "tenant.settings_changed",
      entityType: "tenant",
      entityId: tenant.id,
      metadata: { event: "tenant_created", tenant_name: tenantName },
    });

    setTenantId(tenant.id);
    setUserId(user.id);
    setFullName(name);
    setLoading(false);
    setStep("profile");
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId || !userId) return;

    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("users")
      .update({
        full_name: fullName,
        phone: phone || null,
      })
      .eq("id", userId);

    if (updateError) {
      setError("Kunde inte uppdatera profil: " + updateError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    setStep("first-assignment");
  }

  async function handleCreateAssignment(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId || !userId) return;

    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data: assignment, error: assignmentError } = await supabase
      .from("assignments")
      .insert({
        tenant_id: tenantId,
        created_by: userId,
        assigned_to: userId,
        address,
        city,
        property_type: "bostadsratt",
        status: "draft",
      })
      .select()
      .single();

    if (assignmentError) {
      setError("Kunde inte skapa uppdrag: " + assignmentError.message);
      setLoading(false);
      return;
    }

    await createAuditLog(supabase, {
      tenantId,
      actorUserId: userId,
      action: "assignment.created",
      entityType: "assignment",
      entityId: assignment.id,
      metadata: { address, city, source: "onboarding" },
    });

    setLoading(false);
    router.push(`/assignments/${assignment.id}`);
    router.refresh();
  }

  function handleSkip() {
    router.push("/dashboard");
    router.refresh();
  }

  const currentStepIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2">
          {STEPS.map((s, i) => {
            const isDone = i < currentStepIndex;
            const isCurrent = i === currentStepIndex;
            return (
              <div key={s.id} className="flex items-center gap-2">
                {i > 0 && (
                  <div
                    className={cn(
                      "h-px w-8",
                      isDone ? "bg-primary" : "bg-border",
                    )}
                  />
                )}
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors",
                    isDone
                      ? "bg-primary text-primary-foreground"
                      : isCurrent
                        ? "border-2 border-primary text-primary"
                        : "border border-border text-muted-foreground",
                  )}
                >
                  {isDone ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <s.icon className="h-4 w-4" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Steg {currentStepIndex + 1} av {STEPS.length}:{" "}
          {STEPS[currentStepIndex].label}
        </p>

        {/* Step 1: Create org */}
        {step === "org" && (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">
                Välkommen till BrokerFlow
              </CardTitle>
              <CardDescription>
                Skapa din organisation för att komma igång.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleCreateOrg}>
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
                    Du kan ändra detta senare i inställningarna.
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full gap-2" disabled={loading}>
                  {loading ? (
                    <LoadingSpinner size="sm" text="Skapar..." />
                  ) : (
                    <>
                      Skapa organisation
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        )}

        {/* Step 2: Profile */}
        {step === "profile" && (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <User className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-xl">Din profil</CardTitle>
              <CardDescription>
                Bekräfta ditt namn och lägg till telefonnummer.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleUpdateProfile}>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="full-name">Fullständigt namn</Label>
                  <Input
                    id="full-name"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    disabled={loading}
                    minLength={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefonnummer (valfritt)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="070-123 45 67"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1"
                  onClick={() => setStep("first-assignment")}
                  disabled={loading}
                >
                  Hoppa över
                </Button>
                <Button type="submit" className="flex-1 gap-2" disabled={loading}>
                  {loading ? (
                    <LoadingSpinner size="sm" text="Sparar..." />
                  ) : (
                    <>
                      Fortsätt
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        )}

        {/* Step 3: First assignment */}
        {step === "first-assignment" && (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-xl">Skapa ditt första uppdrag</CardTitle>
              <CardDescription>
                Ange adressen för att komma igång direkt, eller gå till
                dashboarden.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleCreateAssignment}>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="address">Adress</Label>
                  <Input
                    id="address"
                    type="text"
                    placeholder="T.ex. Storgatan 12, lgh 1001"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Ort</Label>
                  <Input
                    id="city"
                    type="text"
                    placeholder="T.ex. Stockholm"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1"
                  onClick={handleSkip}
                  disabled={loading}
                >
                  Gå till dashboard
                </Button>
                <Button type="submit" className="flex-1 gap-2" disabled={loading}>
                  {loading ? (
                    <LoadingSpinner size="sm" text="Skapar..." />
                  ) : (
                    <>
                      Skapa uppdrag
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}
