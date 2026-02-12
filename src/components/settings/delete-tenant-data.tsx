"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { AlertTriangle, Trash2 } from "lucide-react";

interface DeleteTenantDataProps {
  tenantName: string;
  isAdmin: boolean;
}

export function DeleteTenantData({ tenantName, isAdmin }: DeleteTenantDataProps) {
  const [step, setStep] = useState<"idle" | "first" | "second">("idle");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleFinalDelete() {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/tenant/delete-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: true }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Kunde inte radera data");
      setLoading(false);
      return;
    }

    setLoading(false);
    setStep("idle");
    router.push("/login");
  }

  if (!isAdmin) return null;

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="text-destructive">Radera all data</CardTitle>
        <CardDescription>
          Radera permanent all data kopplad till din organisation. Denna åtgärd
          kan inte ångras.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Detta raderar permanent alla uppdrag, dokument, extraktioner,
            AI-genererade texter, uppgifter, transaktioner och e-postloggar.
            Revisionsloggar behålls enligt lagkrav.
          </AlertDescription>
        </Alert>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button
          variant="destructive"
          onClick={() => setStep("first")}
          disabled={loading}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Radera all tenant-data
        </Button>

        {/* Step 1: Initial confirmation */}
        <ConfirmDialog
          open={step === "first"}
          onOpenChange={(open) => {
            if (!open) setStep("idle");
          }}
          title="Steg 1: Bekräfta radering"
          description="Du är på väg att radera ALL data för din organisation. Denna åtgärd kan inte ångras. Vill du fortsätta?"
          confirmLabel="Ja, fortsätt"
          variant="destructive"
          onConfirm={() => setStep("second")}
        />

        {/* Step 2: Type confirmation */}
        <ConfirmDialog
          open={step === "second"}
          onOpenChange={(open) => {
            if (!open) setStep("idle");
          }}
          title="Steg 2: Slutgiltig bekräftelse"
          description={`Skriv organisationsnamnet "${tenantName}" nedan för att bekräfta permanent radering av all data.`}
          confirmText={tenantName}
          confirmLabel="Radera all data permanent"
          variant="destructive"
          loading={loading}
          onConfirm={handleFinalDelete}
        />
      </CardContent>
    </Card>
  );
}
