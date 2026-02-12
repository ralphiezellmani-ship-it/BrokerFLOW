"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Json } from "@/types/database";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { DOC_TYPE_LABELS, type Document } from "@/types/document";
import type { Database } from "@/types/database";
import {
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RotateCcw,
  FileText,
  AlertTriangle,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ExtractionRow = Database["public"]["Tables"]["extractions"]["Row"];

const FIELD_LABELS: Record<string, string> = {
  monthly_fee: "Månadsavgift (kr)",
  living_area_sqm: "Boarea (m²)",
  rooms: "Antal rum",
  floor: "Våning",
  total_floors: "Totalt antal våningar",
  build_year: "Byggår",
  association_name: "Föreningsnamn",
  association_org_number: "Org-nummer",
  renovation_info: "Renoveringsinformation",
  economic_summary: "Ekonomisk sammanfattning",
  energy_class: "Energiklass",
  parking: "Parkering",
  balcony: "Balkong",
  elevator: "Hiss",
  upcoming_renovations: "Planerade renoveringar",
};

function confidenceColor(score: number): string {
  if (score >= 0.8) return "text-green-600";
  if (score >= 0.5) return "text-amber-600";
  return "text-red-600";
}

function confidenceLabel(score: number): string {
  if (score >= 0.8) return "Hög";
  if (score >= 0.5) return "Medel";
  return "Låg";
}

interface ExtractionReviewProps {
  assignmentId: string;
  tenantId: string;
  userId: string;
  documents: Document[];
  onDataConfirmed: () => void;
}

export function ExtractionReview({
  assignmentId,
  tenantId,
  userId,
  documents,
  onDataConfirmed,
}: ExtractionReviewProps) {
  const [extractions, setExtractions] = useState<ExtractionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState<string | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [editedData, setEditedData] = useState<Record<string, unknown>>({});
  const [isEditing, setIsEditing] = useState(false);

  const fetchExtractions = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("extractions")
      .select("*")
      .eq("assignment_id", assignmentId)
      .eq("status", "completed")
      .order("created_at", { ascending: false });
    setExtractions(data || []);
    setLoading(false);
  }, [assignmentId]);

  useEffect(() => {
    fetchExtractions();
  }, [fetchExtractions]);

  // Merge all extraction data from all documents
  const mergedData: Record<string, unknown> = {};
  const mergedConfidence: Record<string, number> = {};
  const mergedSources: Record<string, string> = {};

  // Apply in reverse order so latest extraction wins
  for (const ext of [...extractions].reverse()) {
    const data = ext.extracted_json as Record<string, unknown>;
    const confidence = (ext.confidence_json as Record<string, number>) || {};
    const sources = (ext.source_references as Record<string, string>) || {};

    for (const [key, value] of Object.entries(data)) {
      if (value != null && value !== "") {
        mergedData[key] = value;
        if (confidence[key] != null) mergedConfidence[key] = confidence[key];
        if (sources[key]) mergedSources[key] = sources[key];
      }
    }
  }

  const displayData = isEditing ? editedData : mergedData;

  async function handleTriggerExtraction(doc: Document) {
    setExtracting(doc.id);
    setExtractError(null);

    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_id: doc.id,
          assignment_id: assignmentId,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        if (result.is_scanned) {
          setExtractError(
            `"${doc.filename}" verkar vara en inskannad bild. OCR-stöd är inte tillgängligt ännu. Ladda upp en digital PDF istället.`,
          );
        } else {
          setExtractError(result.error || "Extraktion misslyckades");
        }
      } else {
        await fetchExtractions();
      }
    } catch {
      setExtractError("Nätverksfel vid extraktion");
    }

    setExtracting(null);
  }

  async function handleReRunExtraction(doc: Document) {
    await handleTriggerExtraction(doc);
  }

  function startEditing() {
    setEditedData({ ...mergedData });
    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);
    setEditedData({});
  }

  function updateField(key: string, value: string) {
    setEditedData((prev) => ({
      ...prev,
      [key]: value === "" ? null : isNaN(Number(value)) ? value : Number(value),
    }));
  }

  async function handleConfirm() {
    setConfirming(true);
    const dataToSave = isEditing ? editedData : mergedData;

    const supabase = createClient();
    await supabase
      .from("assignments")
      .update({ confirmed_property_data: dataToSave as Json })
      .eq("id", assignmentId);

    await supabase.from("audit_logs").insert({
      tenant_id: tenantId,
      actor_user_id: userId,
      action: "extraction.confirmed",
      entity_type: "assignment",
      entity_id: assignmentId,
      metadata_json: {
        field_count: Object.keys(dataToSave).length,
        was_edited: isEditing,
      },
    });

    setIsEditing(false);
    setConfirming(false);
    onDataConfirmed();
  }

  // Extractable documents (PDFs that haven't been extracted yet or have errors)
  const extractableDocs = documents.filter(
    (d) =>
      d.mime_type === "application/pdf" &&
      (d.processing_status === "uploaded" || d.processing_status === "error"),
  );

  // Documents that are already extracted
  const extractedDocs = documents.filter(
    (d) => d.processing_status === "extracted",
  );

  // Image-only docs (non-PDF)
  const imageDocs = documents.filter(
    (d) => d.mime_type !== "application/pdf" && d.mime_type != null,
  );

  const hasExtractions = extractions.length > 0;
  const fieldKeys = Object.keys(displayData);

  return (
    <div className="space-y-4">
      {extractError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{extractError}</AlertDescription>
        </Alert>
      )}

      {/* Trigger extraction for uploaded docs */}
      {extractableDocs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kör extraktion</CardTitle>
            <CardDescription>
              Följande dokument kan extraheras med AI.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {extractableDocs.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{doc.filename}</span>
                  {doc.doc_type !== "ovrigt" && (
                    <Badge variant="outline" className="text-[10px]">
                      {DOC_TYPE_LABELS[doc.doc_type]}
                    </Badge>
                  )}
                  {doc.processing_status === "error" && (
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-red-50 text-red-700 border-red-200"
                    >
                      Fel
                    </Badge>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleTriggerExtraction(doc)}
                  disabled={extracting === doc.id}
                >
                  {extracting === doc.id ? (
                    <LoadingSpinner size="sm" text="Extraherar..." />
                  ) : (
                    <>
                      <Sparkles className="mr-1 h-3.5 w-3.5" />
                      Extrahera
                    </>
                  )}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* OCR placeholder for image docs */}
      {imageDocs.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {imageDocs.length === 1
              ? `"${imageDocs[0].filename}" är en bildfil.`
              : `${imageDocs.length} bildfiler uppladdade.`}{" "}
            OCR-stöd (textigenkänning av bilder) är inte tillgängligt ännu.
            Ladda upp digitala PDF:er för att kunna extrahera data.
          </AlertDescription>
        </Alert>
      )}

      {/* Re-run extraction for already-extracted docs */}
      {extractedDocs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Extraherade dokument</CardTitle>
            <CardDescription>
              Kör om extraktion med senaste AI-modell för att uppdatera data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {extractedDocs.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-green-600" />
                  <span className="text-sm">{doc.filename}</span>
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-green-50 text-green-700 border-green-200"
                  >
                    {DOC_TYPE_LABELS[doc.doc_type]}
                  </Badge>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleReRunExtraction(doc)}
                  disabled={extracting === doc.id}
                >
                  {extracting === doc.id ? (
                    <LoadingSpinner size="sm" text="Kör om..." />
                  ) : (
                    <>
                      <RotateCcw className="mr-1 h-3.5 w-3.5" />
                      Kör om
                    </>
                  )}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Extracted data review */}
      {loading ? (
        <LoadingSpinner text="Laddar extraherad data..." />
      ) : hasExtractions ? (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base">Extraherad data</CardTitle>
                <CardDescription>
                  Granska och justera extraherade fält innan du bekräftar.
                  Confidence-nivån visar hur säker AI:n är på varje fält.
                </CardDescription>
              </div>
              {!isEditing && (
                <Button size="sm" variant="outline" onClick={startEditing}>
                  Redigera
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {fieldKeys.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Inga fält extraherades. Prova att köra om extraktionen.
              </p>
            ) : (
              <div className="space-y-3">
                {fieldKeys.map((key) => {
                  const label = FIELD_LABELS[key] || key;
                  const value = displayData[key];
                  const confidence = mergedConfidence[key];
                  const source = mergedSources[key];

                  return (
                    <div
                      key={key}
                      className="grid grid-cols-[180px_1fr_auto] items-start gap-3 rounded-md p-2 hover:bg-muted/30"
                    >
                      <div>
                        <p className="text-sm font-medium">{label}</p>
                        {source && (
                          <p
                            className="text-[10px] text-muted-foreground line-clamp-2"
                            title={source}
                          >
                            <Info className="mr-0.5 inline h-2.5 w-2.5" />
                            {source}
                          </p>
                        )}
                      </div>

                      {isEditing ? (
                        <Input
                          value={String(editedData[key] ?? "")}
                          onChange={(e) => updateField(key, e.target.value)}
                          className="h-8 text-sm"
                        />
                      ) : (
                        <p className="text-sm pt-0.5">
                          {value != null ? String(value) : "–"}
                        </p>
                      )}

                      {confidence != null && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] whitespace-nowrap",
                            confidenceColor(confidence),
                          )}
                        >
                          {confidenceLabel(confidence)}{" "}
                          ({Math.round(confidence * 100)}%)
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4 flex gap-2">
              {isEditing ? (
                <>
                  <Button onClick={handleConfirm} disabled={confirming}>
                    {confirming ? (
                      <LoadingSpinner size="sm" text="Bekräftar..." />
                    ) : (
                      <>
                        <CheckCircle2 className="mr-1 h-4 w-4" />
                        Bekräfta redigerad data
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={cancelEditing}>
                    Avbryt
                  </Button>
                </>
              ) : (
                <Button onClick={handleConfirm} disabled={confirming}>
                  {confirming ? (
                    <LoadingSpinner size="sm" text="Bekräftar..." />
                  ) : (
                    <>
                      <CheckCircle2 className="mr-1 h-4 w-4" />
                      Bekräfta data
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : documents.length > 0 ? (
        <Card>
          <CardHeader className="items-center text-center">
            <Sparkles className="h-8 w-8 text-muted-foreground" />
            <CardTitle className="text-base">Ingen extraherad data ännu</CardTitle>
            <CardDescription>
              Kör extraktion på dina uppladdade dokument ovan för att extrahera
              fastighetsdata med AI.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader className="items-center text-center">
            <FileText className="h-8 w-8 text-muted-foreground" />
            <CardTitle className="text-base">Inga dokument uppladdade</CardTitle>
            <CardDescription>
              Ladda upp dokument i Dokument-fliken för att kunna extrahera data.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
