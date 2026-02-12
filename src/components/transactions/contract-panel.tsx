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
import { TransactionView } from "./transaction-view";
import { SettlementDraft } from "./settlement-draft";
import { ApprovalBar } from "@/components/generations/approval-bar";
import type { Transaction } from "@/types/transaction";
import type { Generation, GenerationType } from "@/types/generation";
import type { Document } from "@/types/document";
import {
  FileText,
  Sparkles,
  Upload,
  Mail,
  Key,
  Calculator,
} from "lucide-react";

interface ContractPanelProps {
  assignmentId: string;
  tenantId: string;
  userId: string;
  documents: Document[];
  onAssignmentUpdated: () => void;
}

export function ContractPanel({
  assignmentId,
  tenantId,
  userId,
  documents,
  onAssignmentUpdated,
}: ContractPanelProps) {
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [generating, setGenerating] = useState<Record<string, boolean>>({});

  const contractDocs = documents.filter((d) => d.doc_type === "kontrakt");
  const unprocessedContracts = contractDocs.filter(
    (d) => d.processing_status === "uploaded" || d.processing_status === "error",
  );

  const fetchTransaction = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("transactions")
      .select("*")
      .eq("assignment_id", assignmentId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setTransaction(data);
  }, [assignmentId]);

  const fetchGenerations = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("generations")
      .select("*")
      .eq("assignment_id", assignmentId)
      .in("type", ["brf_application", "access_request", "settlement_draft"])
      .order("created_at", { ascending: false });
    setGenerations(data || []);
  }, [assignmentId]);

  useEffect(() => {
    Promise.all([fetchTransaction(), fetchGenerations()]).then(() =>
      setLoading(false),
    );
  }, [fetchTransaction, fetchGenerations]);

  async function handleProcessContract(documentId: string) {
    setProcessing(true);
    try {
      const res = await fetch("/api/contract/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_id: documentId,
          assignment_id: assignmentId,
        }),
      });
      if (res.ok) {
        await fetchTransaction();
        onAssignmentUpdated();
      }
    } finally {
      setProcessing(false);
    }
  }

  async function handleGenerate(type: GenerationType) {
    setGenerating((prev) => ({ ...prev, [type]: true }));
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignment_id: assignmentId,
          type,
          tone: "professional",
        }),
      });
      if (res.ok) {
        await fetchGenerations();
      }
    } finally {
      setGenerating((prev) => ({ ...prev, [type]: false }));
    }
  }

  const brfApplications = generations.filter(
    (g) => g.type === "brf_application",
  );
  const accessRequests = generations.filter(
    (g) => g.type === "access_request",
  );
  const settlementDrafts = generations.filter(
    (g) => g.type === "settlement_draft",
  );

  if (loading) {
    return <LoadingSpinner text="Laddar kontraktsflöde..." />;
  }

  return (
    <div className="space-y-6">
      {/* Contract processing */}
      {unprocessedContracts.length > 0 && (
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Upload className="h-4 w-4" />
              Bearbeta kontrakt
            </CardTitle>
            <CardDescription>
              {unprocessedContracts.length} kontrakt väntar på bearbetning.
              Extrahera köpare, pris och datum automatiskt.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {unprocessedContracts.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{doc.filename}</span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleProcessContract(doc.id)}
                    disabled={processing}
                  >
                    {processing ? (
                      <LoadingSpinner size="sm" text="Bearbetar..." />
                    ) : (
                      <>
                        <Sparkles className="mr-1 h-3.5 w-3.5" />
                        Extrahera data
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaction view */}
      {transaction ? (
        <TransactionView
          transaction={transaction}
          tenantId={tenantId}
          userId={userId}
          onUpdated={() => {
            fetchTransaction();
            onAssignmentUpdated();
          }}
        />
      ) : (
        <Card>
          <CardHeader className="items-center text-center">
            <FileText className="h-8 w-8 text-muted-foreground" />
            <CardTitle className="text-base">Ingen transaktion ännu</CardTitle>
            <CardDescription>
              Ladda upp ett kontrakt i dokumentfliken och bearbeta det för att
              skapa en transaktion.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Post-contract generation buttons */}
      {transaction && (
        <div className="space-y-6">
          {/* BRF Application */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Mail className="h-4 w-4" />
                    BRF-ansökan
                  </CardTitle>
                  <CardDescription>
                    AI-genererad medlemsansökan till bostadsrättsföreningen.
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleGenerate("brf_application")}
                  disabled={generating.brf_application}
                >
                  {generating.brf_application ? (
                    <LoadingSpinner size="sm" text="Genererar..." />
                  ) : (
                    <>
                      <Sparkles className="mr-1 h-4 w-4" />
                      Generera BRF-ansökan
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {brfApplications.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Ingen BRF-ansökan har genererats ännu.
                </p>
              ) : (
                <div className="space-y-4">
                  {brfApplications.map((gen) => (
                    <GenerationPreview
                      key={gen.id}
                      generation={gen}
                      tenantId={tenantId}
                      userId={userId}
                      onUpdated={fetchGenerations}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Access request / Tillträdesmall */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Key className="h-4 w-4" />
                    Tillträdesmall
                  </CardTitle>
                  <CardDescription>
                    Mall för tillträdesbokning (Tambur-placeholder).
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleGenerate("access_request")}
                  disabled={generating.access_request}
                >
                  {generating.access_request ? (
                    <LoadingSpinner size="sm" text="Genererar..." />
                  ) : (
                    <>
                      <Sparkles className="mr-1 h-4 w-4" />
                      Generera mall
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {accessRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Ingen tillträdesmall har genererats ännu.
                </p>
              ) : (
                <div className="space-y-4">
                  {accessRequests.map((gen) => (
                    <GenerationPreview
                      key={gen.id}
                      generation={gen}
                      tenantId={tenantId}
                      userId={userId}
                      onUpdated={fetchGenerations}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Settlement draft / Likvidavräkning */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Calculator className="h-4 w-4" />
                    Likvidavräkning
                  </CardTitle>
                  <CardDescription>
                    Generera utkast till likvidavräkning. EJ juridiskt bindande.
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleGenerate("settlement_draft")}
                  disabled={generating.settlement_draft}
                >
                  {generating.settlement_draft ? (
                    <LoadingSpinner size="sm" text="Genererar..." />
                  ) : (
                    <>
                      <Sparkles className="mr-1 h-4 w-4" />
                      Generera utkast
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {settlementDrafts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Ingen likvidavräkning har genererats ännu.
                </p>
              ) : (
                <div className="space-y-4">
                  {settlementDrafts.map((gen) => (
                    <SettlementDraft
                      key={gen.id}
                      generation={gen}
                      tenantId={tenantId}
                      userId={userId}
                      onUpdated={fetchGenerations}
                      onRegenerate={() => handleGenerate("settlement_draft")}
                      regenerating={generating.settlement_draft || false}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

/** Reusable preview for BRF application and access request generations */
function GenerationPreview({
  generation,
  tenantId,
  userId,
  onUpdated,
}: {
  generation: Generation;
  tenantId: string;
  userId: string;
  onUpdated: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editedText, setEditedText] = useState(
    generation.edited_text || generation.output_text,
  );
  const [saving, setSaving] = useState(false);

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
    <div className="space-y-3 rounded-lg border p-4">
      {editing ? (
        <div className="space-y-2">
          <textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            rows={12}
            className="w-full rounded-md border bg-background p-3 text-sm"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Sparar..." : "Spara"}
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
          <pre className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm">
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
    </div>
  );
}
