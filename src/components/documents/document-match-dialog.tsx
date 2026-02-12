"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import type { Document } from "@/types/document";
import type { Assignment } from "@/types/assignment";
import { Link2 } from "lucide-react";

interface DocumentMatchDialogProps {
  document: Document;
  tenantId: string;
  userId: string;
  onMatched: () => void;
}

export function DocumentMatchDialog({
  document,
  tenantId,
  userId,
  onMatched,
}: DocumentMatchDialogProps) {
  const [open, setOpen] = useState(false);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingAssignments, setFetchingAssignments] = useState(false);

  useEffect(() => {
    if (!open) return;
    async function fetchAssignments() {
      setFetchingAssignments(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("assignments")
        .select("*")
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(50);
      setAssignments(data || []);
      setFetchingAssignments(false);
    }
    fetchAssignments();
  }, [open, tenantId]);

  async function handleMatch() {
    if (!selectedAssignmentId) return;
    setLoading(true);

    const supabase = createClient();
    await supabase
      .from("documents")
      .update({ assignment_id: selectedAssignmentId })
      .eq("id", document.id);

    await supabase.from("audit_logs").insert({
      tenant_id: tenantId,
      actor_user_id: userId,
      action: "document.matched",
      entity_type: "document",
      entity_id: document.id,
      metadata_json: {
        filename: document.filename,
        assignment_id: selectedAssignmentId,
      },
    });

    setLoading(false);
    setOpen(false);
    onMatched();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Link2 className="mr-2 h-3.5 w-3.5" />
          Koppla till uppdrag
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Koppla dokument till uppdrag</DialogTitle>
          <DialogDescription>
            Välj vilket uppdrag &quot;{document.filename}&quot; ska kopplas till.
          </DialogDescription>
        </DialogHeader>

        {fetchingAssignments ? (
          <LoadingSpinner text="Laddar uppdrag..." />
        ) : (
          <Select
            value={selectedAssignmentId}
            onChange={(e) => setSelectedAssignmentId(e.target.value)}
          >
            <option value="" disabled>
              Välj uppdrag...
            </option>
            {assignments.map((a) => (
              <option key={a.id} value={a.id}>
                {a.address}, {a.city}
              </option>
            ))}
          </Select>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Avbryt
          </Button>
          <Button
            onClick={handleMatch}
            disabled={!selectedAssignmentId || loading}
          >
            {loading ? (
              <LoadingSpinner size="sm" text="Kopplar..." />
            ) : (
              "Koppla"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
