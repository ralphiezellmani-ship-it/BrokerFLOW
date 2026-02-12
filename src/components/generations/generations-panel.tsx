"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { ToneSelector } from "./tone-selector";
import { AdCopyEditor } from "./ad-copy-editor";
import { EmailDraftViewer } from "./email-draft-viewer";
import type { Generation, GenerationType, Tone } from "@/types/generation";
import { GENERATION_TYPE_LABELS } from "@/types/generation";
import { Sparkles, Mail, FileText } from "lucide-react";

interface GenerationsPanelProps {
  assignmentId: string;
  tenantId: string;
  userId: string;
}

const EMAIL_TYPES: { type: GenerationType; icon: typeof Mail }[] = [
  { type: "email_brf", icon: Mail },
  { type: "email_buyer", icon: Mail },
  { type: "email_seller", icon: Mail },
];

export function GenerationsPanel({
  assignmentId,
  tenantId,
  userId,
}: GenerationsPanelProps) {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [tone, setTone] = useState<Tone>("professional");
  const [generating, setGenerating] = useState<Record<string, boolean>>({});

  const fetchGenerations = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("generations")
      .select("*")
      .eq("assignment_id", assignmentId)
      .order("created_at", { ascending: false });
    setGenerations(data || []);
    setLoading(false);
  }, [assignmentId]);

  useEffect(() => {
    fetchGenerations();
  }, [fetchGenerations]);

  async function handleGenerate(type: GenerationType) {
    setGenerating((prev) => ({ ...prev, [type]: true }));
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignment_id: assignmentId,
          type,
          tone,
        }),
      });
      if (res.ok) {
        await fetchGenerations();
      }
    } finally {
      setGenerating((prev) => ({ ...prev, [type]: false }));
    }
  }

  async function handleRegenerate(type: GenerationType) {
    await handleGenerate(type);
  }

  const adCopyGenerations = generations.filter((g) => g.type === "ad_copy");
  const emailGenerations = generations.filter((g) =>
    ["email_brf", "email_buyer", "email_seller"].includes(g.type),
  );

  if (loading) {
    return <LoadingSpinner text="Laddar utkast..." />;
  }

  return (
    <div className="space-y-6">
      {/* Tone selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tonval</CardTitle>
          <CardDescription>
            Välj ton för AI-genererade texter. Påverkar nya genereringar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ToneSelector value={tone} onChange={setTone} />
        </CardContent>
      </Card>

      {/* Ad copy section */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" />
                Annonstext
              </CardTitle>
              <CardDescription>
                AI-genererad annonstext med rubrik, intro och highlights.
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => handleGenerate("ad_copy")}
              disabled={generating.ad_copy}
            >
              {generating.ad_copy ? (
                <LoadingSpinner size="sm" text="Genererar..." />
              ) : (
                <>
                  <Sparkles className="mr-1 h-4 w-4" />
                  Generera annonstext
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {adCopyGenerations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ingen annonstext har genererats ännu. Klicka &quot;Generera
              annonstext&quot; för att skapa ett utkast.
            </p>
          ) : (
            <div className="space-y-4">
              {adCopyGenerations.map((gen) => (
                <AdCopyEditor
                  key={gen.id}
                  generation={gen}
                  tenantId={tenantId}
                  userId={userId}
                  onUpdated={fetchGenerations}
                  onRegenerate={() => handleRegenerate("ad_copy")}
                  regenerating={generating.ad_copy || false}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email drafts section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4" />
            E-postutkast
          </CardTitle>
          <CardDescription>
            Generera e-postutkast till BRF, köpare eller säljare.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {EMAIL_TYPES.map(({ type }) => (
              <Button
                key={type}
                variant="outline"
                size="sm"
                onClick={() => handleGenerate(type)}
                disabled={generating[type]}
              >
                {generating[type] ? (
                  <LoadingSpinner size="sm" text="Genererar..." />
                ) : (
                  <>
                    <Sparkles className="mr-1 h-3.5 w-3.5" />
                    {GENERATION_TYPE_LABELS[type]}
                  </>
                )}
              </Button>
            ))}
          </div>

          {emailGenerations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Inga e-postutkast har genererats ännu. Klicka på en knapp ovan
              för att skapa ett utkast.
            </p>
          ) : (
            <div className="space-y-4">
              {emailGenerations.map((gen) => (
                <EmailDraftViewer
                  key={gen.id}
                  generation={gen}
                  tenantId={tenantId}
                  userId={userId}
                  onUpdated={fetchGenerations}
                  onRegenerate={() =>
                    handleRegenerate(gen.type as GenerationType)
                  }
                  regenerating={generating[gen.type] || false}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
