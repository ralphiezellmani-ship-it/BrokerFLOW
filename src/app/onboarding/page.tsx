"use client";

import { useState, useEffect } from "react";
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
  LogIn,
  RefreshCw,
} from "lucide-react";

type PageState = "loading" | "ready" | "error" | "no-session";
type Step = "org" | "profile" | "first-assignment";

const STEPS: {
  id: Step;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "org", label: "Organisation", icon: Building2 },
  { id: "profile", label: "Din profil", icon: User },
  { id: "first-assignment", label: "Första uppdraget", icon: FileText },
];

export default function OnboardingPage() {
  const [pageState, setPageState] = useState<PageState>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
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

  // Client-side auth + tenant check on mount
  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      try {
        const supabase = createClient();

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (cancelled) return;

        if (authError) {
          console.error("[onboarding] Auth error:", authError.message);
          setErrorMessage(`Autentiseringsfel: ${authError.message}`);
          setPageState("error");
          return;
        }

        if (!user) {
          // No session — show a message with login link (don't auto-redirect
          // to avoid potential redirect loops)
          setPageState("no-session");
          return;
        }

        // Check if user already has a tenant (already onboarded)
        const { data: profile, error: profileError } = await supabase
          .from("users")
          .select("tenant_id")
          .eq("id", user.id)
          .maybeSingle();

        if (cancelled) return;

        if (profileError) {
          console.error("[onboarding] Profile check error:", profileError.message);
          // Don't treat this as fatal — the user might just not have a profile yet
          // which is expected for new users
        }

        if (profile?.tenant_id) {
          // Already onboarded — go to dashboard
          window.location.href = "/dashboard";
          return;
        }

        // New user — show onboarding form
        const name =
          user.user_metadata?.full_name || user.email?.split("@")[0] || "";
        setFullName(name);
        setPageState("ready");
      } catch (err) {
        if (cancelled) return;
        console.error("[onboarding] Unexpected error:", err);
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Ett oväntat fel uppstod. Försök ladda om sidan."
        );
        setPageState("error");
      }
    }

    checkAuth();

    // Timeout: if auth check takes too long, show error
    const timeout = setTimeout(() => {
      if (cancelled) return;
      setPageState((prev) => {
        if (prev === "loading") {
          setErrorMessage("Det tog för lång tid att verifiera din session. Försök ladda om sidan.");
          return "error";
        }
        return prev;
      });
    }, 10000);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, []);

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

    // Generate tenant ID client-side to avoid needing a SELECT policy
    const newTenantId = crypto.randomUUID();

    const { error: tenantError } = await supabase
      .from("tenants")
      .insert({ id: newTenantId, name: tenantName, slug });

    if (tenantError) {
      setError("Kunde inte skapa organisation: " + tenantError.message);
      setLoading(false);
      return;
    }

    const name = fullName || user.user_metadata?.full_name || "Användare";

    const { error: userError } = await supabase.from("users").insert({
      id: user.id,
      tenant_id: newTenantId,
      role: "admin",
      full_name: name,
      email: user.email!,
    });

    if (userError) {
      // Rollback tenant if user creation fails
      await supabase.from("tenants").delete().eq("id", newTenantId);
      setError("Kunde inte skapa användarprofil: " + userError.message);
      setLoading(false);
      return;
    }

    // Create defaults (user row now exists, so auth.tenant_id() works)
    await supabase
      .from("tenant_preferences")
      .insert({ tenant_id: newTenantId });

    const token = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
    await supabase.from("inbound_aliases").insert({
      tenant_id: newTenantId,
      email_alias: `kontoret+${token}`,
      secret_token: crypto.randomUUID(),
    });

    await createAuditLog(supabase, {
      tenantId: newTenantId,
      actorUserId: user.id,
      action: "tenant.settings_changed",
      entityType: "tenant",
      entityId: newTenantId,
      metadata: { event: "tenant_created", tenant_name: tenantName },
    });

    setTenantId(newTenantId);
    setUserId(user.id);
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

    window.location.href = `/assignments/${assignment.id}`;
  }

  function handleSkip() {
    window.location.href = "/dashboard";
  }

  // ─── Page states ───────────────────────────────────────────────

  if (pageState === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
        <Card className="w-full max-w-sm">
          <CardContent className="flex flex-col items-center gap-3 pt-6 pb-6">
            <LoadingSpinner size="lg" />
            <p className="text-sm text-muted-foreground">
              Verifierar din session...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (pageState === "no-session") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
              <LogIn className="h-6 w-6 text-orange-600" />
            </div>
            <CardTitle>Ingen aktiv session</CardTitle>
            <CardDescription>
              Du behöver logga in eller skapa ett konto för att fortsätta.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => (window.location.href = "/login")}
            >
              Logga in
            </Button>
            <Button
              className="flex-1"
              onClick={() => (window.location.href = "/register")}
            >
              Skapa konto
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (pageState === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle>Något gick fel</CardTitle>
            <CardDescription>{errorMessage}</CardDescription>
          </CardHeader>
          <CardFooter className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => (window.location.href = "/login")}
            >
              Gå till login
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="h-4 w-4" />
              Ladda om
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // ─── Onboarding form (pageState === "ready") ──────────────────

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
                <Button
                  type="submit"
                  className="w-full gap-2"
                  disabled={loading}
                >
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
                <Button
                  type="submit"
                  className="flex-1 gap-2"
                  disabled={loading}
                >
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
              <CardTitle className="text-xl">
                Skapa ditt första uppdrag
              </CardTitle>
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
                <Button
                  type="submit"
                  className="flex-1 gap-2"
                  disabled={loading}
                >
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
