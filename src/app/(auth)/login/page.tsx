"use client";

import { useState } from "react";
import Link from "next/link";
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
import { AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(
        authError.message === "Invalid login credentials"
          ? "Felaktig e-postadress eller lösenord."
          : authError.message,
      );
      setLoading(false);
      return;
    }

    // Check client-side if user has completed onboarding
    // This avoids depending on middleware DB queries + redirect chains
    const { data: profile } = await supabase
      .from("users")
      .select("tenant_id")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profile?.tenant_id) {
      window.location.href = "/dashboard";
    } else {
      window.location.href = "/onboarding";
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">BrokerFlow</CardTitle>
        <CardDescription>
          Logga in för att hantera dina förmedlingsuppdrag
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
            <Label htmlFor="email">E-postadress</Label>
            <Input
              id="email"
              type="email"
              placeholder="namn@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Lösenord</Label>
            <Input
              id="password"
              type="password"
              placeholder="Ditt lösenord"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              disabled={loading}
              minLength={6}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <LoadingSpinner size="sm" text="Loggar in..." />
            ) : (
              "Logga in"
            )}
          </Button>
          <p className="text-sm text-muted-foreground">
            Har du inget konto?{" "}
            <Link
              href="/register"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Registrera dig
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
