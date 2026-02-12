"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import type { Generation } from "@/types/generation";
import { CheckCircle2, Clock } from "lucide-react";

interface ApprovalBarProps {
  generation: Generation;
  tenantId: string;
  userId: string;
  onApproved: () => void;
}

export function ApprovalBar({
  generation,
  tenantId,
  userId,
  onApproved,
}: ApprovalBarProps) {
  const [loading, setLoading] = useState(false);

  async function handleApprove() {
    setLoading(true);
    const supabase = createClient();

    await supabase
      .from("generations")
      .update({
        is_approved: true,
        approved_by: userId,
        approved_at: new Date().toISOString(),
      })
      .eq("id", generation.id);

    await supabase.from("audit_logs").insert({
      tenant_id: tenantId,
      actor_user_id: userId,
      action: "generation.approved",
      entity_type: "generation",
      entity_id: generation.id,
      metadata_json: {
        type: generation.type,
        had_edits: generation.edited_text != null,
      },
    });

    setLoading(false);
    onApproved();
  }

  if (generation.is_approved) {
    return (
      <div className="flex items-center gap-2">
        <Badge className="bg-green-100 text-green-700 border-green-200">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Godkänd
        </Badge>
        <span className="text-xs text-muted-foreground">
          Klar att använda
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
        <Clock className="mr-1 h-3 w-3" />
        UTKAST
      </Badge>
      <Button size="sm" onClick={handleApprove} disabled={loading}>
        {loading ? (
          <LoadingSpinner size="sm" text="Godkänner..." />
        ) : (
          <>
            <CheckCircle2 className="mr-1 h-4 w-4" />
            Godkänn
          </>
        )}
      </Button>
    </div>
  );
}
