"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ApprovalBar } from "@/components/generations/approval-bar";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import type { Generation } from "@/types/generation";
import { formatPrice } from "@/lib/utils/formatting";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface SettlementDraftProps {
  generation: Generation;
  tenantId: string;
  userId: string;
  onUpdated: () => void;
  onRegenerate: () => void;
  regenerating: boolean;
}

export function SettlementDraft({
  generation,
  tenantId,
  userId,
  onUpdated,
  onRegenerate,
  regenerating,
}: SettlementDraftProps) {
  const [editing, setEditing] = useState(false);
  const [editedText, setEditedText] = useState(
    generation.edited_text || generation.output_text,
  );
  const [saving, setSaving] = useState(false);

  const metadata = generation.output_metadata as Record<string, unknown> | null;
  const financialSummary = metadata?.financial_summary as
    | {
        sale_price?: number;
        deposit_amount?: number;
        remaining_amount?: number;
      }
    | undefined;

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();
    await supabase
      .from("generations")
      .update({ edited_text: editedText })
      .eq("id", generation.id);
    setSaving(false);
    setEditing(false);
    onUpdated();
  }

  return (
    <Card className="border-amber-200">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Likvidavräkning — UTKAST
            </CardTitle>
            <CardDescription>
              <Badge
                variant="outline"
                className="mt-1 border-red-300 bg-red-50 text-red-700"
              >
                EJ JURIDISKT BINDANDE
              </Badge>
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRegenerate}
              disabled={regenerating}
            >
              {regenerating ? (
                <LoadingSpinner size="sm" text="Genererar..." />
              ) : (
                <>
                  <RefreshCw className="mr-1 h-3.5 w-3.5" />
                  Generera om
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Financial summary */}
        {financialSummary && (
          <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
            <h4 className="text-sm font-medium">Ekonomisk sammanställning</h4>
            <div className="grid gap-1 text-sm">
              {financialSummary.sale_price != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Köpeskilling</span>
                  <span className="font-medium">
                    {formatPrice(financialSummary.sale_price)}
                  </span>
                </div>
              )}
              {financialSummary.deposit_amount != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Handpenning (avdras)
                  </span>
                  <span className="font-medium">
                    −{formatPrice(financialSummary.deposit_amount)}
                  </span>
                </div>
              )}
              {financialSummary.remaining_amount != null && (
                <>
                  <div className="my-1 border-t" />
                  <div className="flex justify-between font-medium">
                    <span>Kvar vid tillträde</span>
                    <span>{formatPrice(financialSummary.remaining_amount)}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Full text */}
        <div className="rounded-lg border bg-amber-50/50 p-3">
          <p className="mb-2 text-xs font-bold text-red-600">
            OBS: Detta dokument är ett automatiskt genererat utkast och är EJ
            JURIDISKT BINDANDE. Det ska granskas och verifieras av behörig
            person innan det används.
          </p>
        </div>

        {editing ? (
          <div className="space-y-2">
            <textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              rows={20}
              className="w-full rounded-md border bg-background p-3 font-mono text-sm"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? "Sparar..." : "Spara ändringar"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditedText(
                    generation.edited_text || generation.output_text,
                  );
                  setEditing(false);
                }}
              >
                Avbryt
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <pre className="whitespace-pre-wrap rounded-md border bg-background p-4 text-sm">
              {generation.edited_text || generation.output_text}
            </pre>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(true)}
            >
              Redigera
            </Button>
          </div>
        )}

        <ApprovalBar
          generation={generation}
          tenantId={tenantId}
          userId={userId}
          onApproved={onUpdated}
        />
      </CardContent>
    </Card>
  );
}
