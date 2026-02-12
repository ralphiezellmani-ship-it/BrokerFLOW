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
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { DocumentMatchDialog } from "./document-match-dialog";
import { DOC_TYPE_LABELS, type Document } from "@/types/document";
import { formatRelativeTime } from "@/lib/utils/formatting";
import { FileText, Mail } from "lucide-react";

interface UnmatchedDocumentsProps {
  tenantId: string;
  userId: string;
}

export function UnmatchedDocuments({
  tenantId,
  userId,
}: UnmatchedDocumentsProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUnmatched = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("documents")
      .select("*")
      .eq("tenant_id", tenantId)
      .is("assignment_id", null)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    setDocuments(data || []);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => {
    fetchUnmatched();
  }, [fetchUnmatched]);

  if (loading) {
    return <LoadingSpinner text="Laddar omatchade dokument..." />;
  }

  if (documents.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Omatchade dokument</CardTitle>
        <CardDescription>
          Dokument som inkommit via e-post men inte kopplats till något uppdrag.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="divide-y">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{doc.filename}</p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {doc.source_email_from && (
                    <span className="flex items-center gap-0.5">
                      <Mail className="h-3 w-3" />
                      {doc.source_email_from}
                    </span>
                  )}
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {DOC_TYPE_LABELS[doc.doc_type]}
                  </Badge>
                  <span>{formatRelativeTime(doc.created_at)}</span>
                </div>
              </div>
              <DocumentMatchDialog
                document={doc}
                tenantId={tenantId}
                userId={userId}
                onMatched={fetchUnmatched}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
