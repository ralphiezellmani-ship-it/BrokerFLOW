"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import type { Document } from "@/types/document";
import { FileText, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DocumentPreviewProps {
  document: Document | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocumentPreview({
  document,
  open,
  onOpenChange,
}: DocumentPreviewProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!document || !open) {
      setUrl(null);
      return;
    }

    async function getUrl() {
      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase.storage
        .from("documents")
        .createSignedUrl(document!.storage_path, 300);
      setUrl(data?.signedUrl || null);
      setLoading(false);
    }

    getUrl();
  }, [document, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            {document?.filename}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <LoadingSpinner text="Laddar förhandsgranskning..." />
            </div>
          ) : url ? (
            document?.mime_type === "application/pdf" ? (
              <iframe
                src={`${url}#toolbar=1&navpanes=0`}
                className="h-full w-full rounded-md border"
                title={document.filename}
              />
            ) : document?.mime_type?.startsWith("image/") ? (
              <div className="flex h-full items-center justify-center overflow-auto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={document.filename}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3">
                <FileText className="h-12 w-12 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Förhandsgranskning stöds inte för denna filtyp.
                </p>
                <Button variant="outline" onClick={() => window.open(url, "_blank")}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Öppna i nytt fönster
                </Button>
              </div>
            )
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-muted-foreground">
                Kunde inte ladda förhandsgranskning.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
