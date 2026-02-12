"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils/formatting";
import type { Database } from "@/types/database";
import {
  Calendar,
  User,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react";

type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];
type UserRow = Database["public"]["Tables"]["users"]["Row"];

const CATEGORY_LABELS: Record<string, string> = {
  docs: "Dokument",
  marketing: "Marknadsföring",
  transaction: "Transaktion",
  closing: "Avslut",
};

const CATEGORY_COLORS: Record<string, string> = {
  docs: "bg-blue-100 text-blue-700 border-blue-200",
  marketing: "bg-purple-100 text-purple-700 border-purple-200",
  transaction: "bg-amber-100 text-amber-700 border-amber-200",
  closing: "bg-gray-100 text-gray-700 border-gray-200",
};

interface TaskItemProps {
  task: TaskRow;
  teamMembers?: UserRow[];
  onUpdated: () => void;
}

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date(new Date().toISOString().split("T")[0]);
}

function isDueSoon(dueDate: string | null): boolean {
  if (!dueDate) return false;
  const due = new Date(dueDate);
  const now = new Date(new Date().toISOString().split("T")[0]);
  const diff = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= 3;
}

export function TaskItem({ task, teamMembers, onUpdated }: TaskItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const overdue = task.status !== "done" && isOverdue(task.due_date);
  const dueSoon = task.status !== "done" && isDueSoon(task.due_date);
  const assignee = teamMembers?.find((m) => m.id === task.assigned_to);

  async function handleToggle(done: boolean) {
    const supabase = createClient();
    await supabase
      .from("tasks")
      .update({
        status: done ? "done" : "todo",
        completed_at: done ? new Date().toISOString() : null,
      })
      .eq("id", task.id);
    onUpdated();
  }

  async function handleAssign(userId: string | null) {
    const supabase = createClient();
    await supabase
      .from("tasks")
      .update({ assigned_to: userId })
      .eq("id", task.id);
    setAssigning(false);
    onUpdated();
  }

  async function handleSetDueDate(date: string) {
    const supabase = createClient();
    await supabase.from("tasks").update({ due_date: date }).eq("id", task.id);
    onUpdated();
  }

  return (
    <div
      className={cn(
        "rounded-lg border p-3 transition-colors",
        task.status === "done" && "bg-muted/30",
        overdue && "border-red-200 bg-red-50/50",
      )}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={task.status === "done"}
          onChange={(e) => handleToggle(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <span
              className={cn(
                "text-sm",
                task.status === "done" &&
                  "text-muted-foreground line-through",
              )}
            >
              {task.title}
            </span>
            <button
              onClick={() => setExpanded(!expanded)}
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Metadata row */}
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {task.category && (
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] px-1.5 py-0",
                  CATEGORY_COLORS[task.category] || "",
                )}
              >
                {CATEGORY_LABELS[task.category] || task.category}
              </Badge>
            )}
            {task.due_date && (
              <span
                className={cn(
                  "flex items-center gap-1 text-xs",
                  overdue && "font-medium text-red-600",
                  dueSoon && !overdue && "text-amber-600",
                  !overdue && !dueSoon && "text-muted-foreground",
                )}
              >
                {overdue && <AlertCircle className="h-3 w-3" />}
                <Calendar className="h-3 w-3" />
                {formatDate(task.due_date)}
              </span>
            )}
            {assignee && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                {assignee.full_name}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Expanded section */}
      {expanded && (
        <div className="mt-3 ml-7 space-y-3 border-t pt-3">
          {task.description && (
            <p className="text-sm text-muted-foreground">
              {task.description}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {/* Due date picker */}
            <div className="flex items-center gap-1">
              <label className="text-xs text-muted-foreground">
                Deadline:
              </label>
              <input
                type="date"
                value={task.due_date || ""}
                onChange={(e) => handleSetDueDate(e.target.value)}
                className="rounded border bg-background px-2 py-0.5 text-xs"
              />
            </div>

            {/* Assign */}
            {teamMembers && teamMembers.length > 0 && (
              <div className="flex items-center gap-1">
                {assigning ? (
                  <div className="flex items-center gap-1">
                    <select
                      value={task.assigned_to || ""}
                      onChange={(e) =>
                        handleAssign(e.target.value || null)
                      }
                      className="rounded border bg-background px-2 py-0.5 text-xs"
                    >
                      <option value="">Ingen tilldelning</option>
                      {teamMembers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.full_name}
                        </option>
                      ))}
                    </select>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 px-1 text-xs"
                      onClick={() => setAssigning(false)}
                    >
                      Stäng
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => setAssigning(true)}
                  >
                    <User className="mr-1 h-3 w-3" />
                    {assignee ? "Ändra tilldelning" : "Tilldela"}
                  </Button>
                )}
              </div>
            )}
          </div>

          {task.is_auto_generated && (
            <p className="text-[10px] text-muted-foreground">
              Automatiskt skapad vid statusändring
              {task.trigger_status ? ` → ${task.trigger_status}` : ""}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
