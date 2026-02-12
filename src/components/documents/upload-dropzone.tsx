"use client";

import { useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Upload, FileUp, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
];
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

interface UploadDropzoneProps {
  assignmentId: string;
  tenantId: string;
  userId: string;
  onUploadComplete: () => void;
}

export function UploadDropzone({
  assignmentId,
  tenantId,
  userId,
  onUploadComplete,
}: UploadDropzoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      if (fileArray.length === 0) return;

      // Validate
      for (const file of fileArray) {
        if (!ACCEPTED_TYPES.includes(file.type)) {
          setError(
            `Filtypen "${file.type || "okänd"}" stöds inte. Ladda upp PDF eller bilder (JPEG, PNG, WebP).`,
          );
          return;
        }
        if (file.size > MAX_FILE_SIZE) {
          setError(
            `Filen "${file.name}" är för stor (max 25 MB).`,
          );
          return;
        }
      }

      setError(null);
      setUploading(true);

      const supabase = createClient();

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        setProgress(
          `Laddar upp ${i + 1} av ${fileArray.length}: ${file.name}`,
        );

        const ext = file.name.split(".").pop() || "bin";
        const storagePath = `${tenantId}/${assignmentId}/${crypto.randomUUID()}.${ext}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from("documents")
          .upload(storagePath, file, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) {
          setError(`Fel vid uppladdning av "${file.name}": ${uploadError.message}`);
          setUploading(false);
          setProgress(null);
          return;
        }

        // Create document record
        const { data: doc, error: insertError } = await supabase
          .from("documents")
          .insert({
            tenant_id: tenantId,
            assignment_id: assignmentId,
            filename: file.name,
            storage_path: storagePath,
            file_size_bytes: file.size,
            mime_type: file.type,
            source: "upload" as const,
            processing_status: "uploaded" as const,
          })
          .select("id")
          .single();

        if (insertError) {
          setError(`Kunde inte spara dokumentpost: ${insertError.message}`);
          setUploading(false);
          setProgress(null);
          return;
        }

        // Audit log
        await supabase.from("audit_logs").insert({
          tenant_id: tenantId,
          actor_user_id: userId,
          action: "document.uploaded",
          entity_type: "document",
          entity_id: doc.id,
          metadata_json: {
            filename: file.name,
            assignment_id: assignmentId,
            file_size_bytes: file.size,
            mime_type: file.type,
          },
        });
      }

      setUploading(false);
      setProgress(null);
      onUploadComplete();
    },
    [assignmentId, tenantId, userId, onUploadComplete],
  );

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
          <button
            className="absolute right-2 top-2"
            onClick={() => setError(null)}
          >
            <X className="h-3 w-3" />
          </button>
        </Alert>
      )}

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors",
          dragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
          uploading && "pointer-events-none opacity-60",
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES.join(",")}
          onChange={handleInputChange}
          className="hidden"
        />

        {uploading ? (
          <>
            <LoadingSpinner />
            <p className="text-sm text-muted-foreground">{progress}</p>
          </>
        ) : (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Upload className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">
                Dra och släpp filer här
              </p>
              <p className="text-xs text-muted-foreground">
                eller klicka för att välja. PDF och bilder (max 25 MB).
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
