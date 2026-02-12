"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import {
  DOC_TYPE_LABELS,
  PROCESSING_STATUS_LABELS,
  type Document,
} from "@/types/document";
import { formatRelativeTime } from "@/lib/utils/formatting";
import { cn } from "@/lib/utils";
import {
  FileText,
  Image as ImageIcon,
  Trash2,
  Eye,
  Download,
  Mail,
  Upload,
} from "lucide-react";

const statusColors: Record<string, string> = {
  uploaded: "bg-gray-100 text-gray-700 border-gray-200",
  processing: "bg-blue-100 text-blue-700 border-blue-200",
  extracted: "bg-green-100 text-green-700 border-green-200",
  error: "bg-red-100 text-red-700 border-red-200",
};

interface DocumentListProps {
  documents: Document[];
  tenantId: string;
  userId: string;
  onDocumentDeleted: () => void;
  onPreview: (doc: Document) => void;
}

export function DocumentList({
  documents,
  tenantId,
  userId,
  onDocumentDeleted,
  onPreview,
}: DocumentListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(doc: Document) {
    setDeletingId(doc.id);
    const supabase = createClient();

    // Soft delete
    await supabase
      .from("documents")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", doc.id);

    // Audit log
    await supabase.from("audit_logs").insert({
      tenant_id: tenantId,
      actor_user_id: userId,
      action: "document.deleted",
      entity_type: "document",
      entity_id: doc.id,
      metadata_json: { filename: doc.filename },
    });

    setDeletingId(null);
    onDocumentDeleted();
  }

  async function handleDownload(doc: Document) {
    const supabase = createClient();
    const { data } = await supabase.storage
      .from("documents")
      .createSignedUrl(doc.storage_path, 60);
    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
    }
  }

  function formatFileSize(bytes: number | null): string {
    if (!bytes) return "–";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function getFileIcon(mimeType: string | null) {
    if (mimeType?.startsWith("image/")) {
      return <ImageIcon className="h-5 w-5 text-blue-500" />;
    }
    return <FileText className="h-5 w-5 text-red-500" />;
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <FileText className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">Inga dokument ännu</p>
        <p className="text-xs text-muted-foreground">
          Ladda upp PDF:er eller bilder ovan.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
        >
          {/* Icon */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
            {getFileIcon(doc.mime_type)}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{doc.filename}</p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{formatFileSize(doc.file_size_bytes)}</span>
              <span className="text-muted-foreground/40">|</span>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] px-1.5 py-0",
                  statusColors[doc.processing_status],
                )}
              >
                {PROCESSING_STATUS_LABELS[doc.processing_status]}
              </Badge>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {DOC_TYPE_LABELS[doc.doc_type]}
              </Badge>
              {doc.source === "email" && (
                <span className="flex items-center gap-0.5">
                  <Mail className="h-3 w-3" />
                  E-post
                </span>
              )}
              {doc.source === "upload" && (
                <span className="flex items-center gap-0.5">
                  <Upload className="h-3 w-3" />
                  Uppladdad
                </span>
              )}
              <span>{formatRelativeTime(doc.created_at)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-1">
            {doc.mime_type === "application/pdf" && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onPreview(doc)}
                title="Förhandsgranska"
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDownload(doc)}
              title="Ladda ner"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDelete(doc)}
              disabled={deletingId === doc.id}
              title="Ta bort"
            >
              {deletingId === doc.id ? (
                <LoadingSpinner size="sm" />
              ) : (
                <Trash2 className="h-4 w-4 text-destructive" />
              )}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
