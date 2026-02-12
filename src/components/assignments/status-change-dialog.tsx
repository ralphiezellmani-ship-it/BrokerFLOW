"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
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
import { StatusBadge } from "./status-badge";
import { generateTasksForStatus } from "@/lib/workflows/status-changed";
import {
  ASSIGNMENT_STATUSES,
  STATUS_LABELS,
  type AssignmentStatus,
  type Assignment,
} from "@/types/assignment";
import { ArrowRight, AlertTriangle } from "lucide-react";

interface StatusChangeDialogProps {
  assignment: Assignment;
  userId: string;
  tenantId: string;
  onStatusChanged: () => void;
}

export function StatusChangeDialog({
  assignment,
  userId,
  tenantId,
  onStatusChanged,
}: StatusChangeDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] =
    useState<AssignmentStatus | null>(null);

  const currentIndex = ASSIGNMENT_STATUSES.indexOf(assignment.status);
  const availableStatuses = ASSIGNMENT_STATUSES.filter(
    (_, i) => i !== currentIndex,
  );

  async function handleChange() {
    if (!selectedStatus) return;
    setLoading(true);

    const supabase = createClient();

    const { error } = await supabase
      .from("assignments")
      .update({ status: selectedStatus })
      .eq("id", assignment.id);

    if (!error) {
      await generateTasksForStatus(supabase, {
        assignmentId: assignment.id,
        tenantId,
        newStatus: selectedStatus,
        userId,
      });
    }

    setLoading(false);
    setOpen(false);
    setSelectedStatus(null);
    onStatusChanged();
  }

  const isGoingBackward =
    selectedStatus &&
    ASSIGNMENT_STATUSES.indexOf(selectedStatus) < currentIndex;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Ändra status
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ändra status</DialogTitle>
          <DialogDescription>
            Välj ny status för uppdraget. Uppgifter skapas automatiskt vid
            statusändringar framåt.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Nuvarande:</span>
            <StatusBadge status={assignment.status} />
          </div>

          <div className="space-y-2">
            {availableStatuses.map((status) => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`flex w-full items-center justify-between rounded-md border p-3 text-left transition-colors ${
                  selectedStatus === status
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <StatusBadge status={status} />
                </div>
                {selectedStatus === status && (
                  <ArrowRight className="h-4 w-4 text-primary" />
                )}
              </button>
            ))}
          </div>

          {isGoingBackward && (
            <div className="flex items-start gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Du ändrar till en tidigare status. Redan skapade uppgifter
                kommer inte att tas bort.
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Avbryt
          </Button>
          <Button
            onClick={handleChange}
            disabled={!selectedStatus || loading}
          >
            {loading ? (
              <LoadingSpinner size="sm" text="Ändrar..." />
            ) : (
              `Ändra till ${selectedStatus ? STATUS_LABELS[selectedStatus] : "..."}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
