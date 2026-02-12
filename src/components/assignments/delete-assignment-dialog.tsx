"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createAuditLog } from "@/lib/audit/log";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import type { Assignment } from "@/types/assignment";

interface DeleteAssignmentDialogProps {
  assignment: Assignment;
  userId: string;
  tenantId: string;
}

export function DeleteAssignmentDialog({
  assignment,
  userId,
  tenantId,
}: DeleteAssignmentDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setLoading(true);
    const supabase = createClient();

    // Soft delete: set deleted_at
    const { error } = await supabase
      .from("assignments")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", assignment.id);

    if (error) {
      setLoading(false);
      return;
    }

    // Also soft delete related documents
    await supabase
      .from("documents")
      .update({ deleted_at: new Date().toISOString() })
      .eq("assignment_id", assignment.id);

    // Also soft delete related transactions
    await supabase
      .from("transactions")
      .update({ deleted_at: new Date().toISOString() })
      .eq("assignment_id", assignment.id);

    await createAuditLog(supabase, {
      tenantId,
      actorUserId: userId,
      action: "assignment.deleted",
      entityType: "assignment",
      entityId: assignment.id,
      metadata: {
        address: assignment.address,
        city: assignment.city,
        status: assignment.status,
      },
    });

    setLoading(false);
    setOpen(false);
    router.push("/assignments");
    router.refresh();
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="text-destructive hover:bg-destructive/10"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="mr-1 h-3.5 w-3.5" />
        Radera
      </Button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Radera uppdrag"
        description={`Är du säker på att du vill radera uppdraget "${assignment.address}, ${assignment.city}"? Uppdraget och alla relaterade dokument döljs omedelbart och raderas permanent efter lagringsperioden.`}
        confirmText="RADERA"
        confirmLabel="Radera uppdrag"
        variant="destructive"
        loading={loading}
        onConfirm={handleDelete}
      />
    </>
  );
}
