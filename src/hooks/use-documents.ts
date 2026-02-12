"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Document } from "@/types/document";

interface UseDocumentsResult {
  documents: Document[];
  loading: boolean;
  refetch: () => Promise<void>;
}

export function useDocuments(assignmentId: string): UseDocumentsResult {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("documents")
      .select("*")
      .eq("assignment_id", assignmentId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    setDocuments(data || []);
    setLoading(false);
  }, [assignmentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    documents,
    loading,
    refetch: fetchData,
  };
}
