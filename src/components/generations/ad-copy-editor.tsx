"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ApprovalBar } from "./approval-bar";
import { formatRelativeTime } from "@/lib/utils/formatting";
import type { Generation } from "@/types/generation";
import { Edit3, Save, X, RotateCcw } from "lucide-react";

interface AdCopyEditorProps {
  generation: Generation;
  tenantId: string;
  userId: string;
  onUpdated: () => void;
  onRegenerate: () => void;
  regenerating: boolean;
}

export function AdCopyEditor({
  generation,
  tenantId,
  userId,
  onUpdated,
  onRegenerate,
  regenerating,
}: AdCopyEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);

  const displayText = generation.edited_text || generation.output_text;

  function startEditing() {
    setEditText(displayText);
    setIsEditing(true);
  }

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();
    await supabase
      .from("generations")
      .update({ edited_text: editText })
      .eq("id", generation.id);
    setSaving(false);
    setIsEditing(false);
    onUpdated();
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">Annonstext</CardTitle>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant="outline" className="text-[10px]">
                {generation.tone === "casual"
                  ? "Ledig"
                  : generation.tone === "luxury"
                    ? "Lyxig"
                    : "Professionell"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatRelativeTime(generation.created_at)}
              </span>
            </div>
          </div>
          <div className="flex gap-1">
            {!isEditing && !generation.is_approved && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={startEditing}
                >
                  <Edit3 className="mr-1 h-3.5 w-3.5" />
                  Redigera
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRegenerate}
                  disabled={regenerating}
                >
                  <RotateCcw className="mr-1 h-3.5 w-3.5" />
                  Generera om
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={15}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <Save className="mr-1 h-3.5 w-3.5" />
                Spara
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditing(false)}
              >
                <X className="mr-1 h-3.5 w-3.5" />
                Avbryt
              </Button>
            </div>
          </div>
        ) : (
          <div className="whitespace-pre-wrap rounded-md bg-muted/30 p-4 text-sm leading-relaxed">
            {displayText}
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
