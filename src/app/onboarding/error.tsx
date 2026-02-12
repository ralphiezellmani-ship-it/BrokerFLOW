"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function OnboardingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[onboarding] Error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-md space-y-4 text-center">
        <h2 className="text-xl font-semibold">Något gick fel</h2>
        <p className="text-sm text-muted-foreground">{error.message}</p>
        <Button onClick={reset}>Försök igen</Button>
      </div>
    </div>
  );
}
