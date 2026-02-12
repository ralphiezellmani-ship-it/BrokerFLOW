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
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { TaskItem } from "./task-item";
import { ChecklistProgress } from "./checklist-progress";
import type { Database } from "@/types/database";
import { Plus, Filter } from "lucide-react";

type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];
type UserRow = Database["public"]["Tables"]["users"]["Row"];

type CategoryFilter = "all" | "docs" | "marketing" | "transaction" | "closing";
type StatusFilter = "all" | "pending" | "done";

const CATEGORY_FILTER_OPTIONS: { value: CategoryFilter; label: string }[] = [
  { value: "all", label: "Alla" },
  { value: "docs", label: "Dokument" },
  { value: "marketing", label: "Marknadsföring" },
  { value: "transaction", label: "Transaktion" },
  { value: "closing", label: "Avslut" },
];

const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Alla" },
  { value: "pending", label: "Att göra" },
  { value: "done", label: "Klara" },
];

interface TaskListProps {
  assignmentId: string;
  tenantId: string;
  userId: string;
}

export function TaskList({
  assignmentId,
  tenantId,
  userId,
}: TaskListProps) {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [teamMembers, setTeamMembers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const fetchTasks = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("assignment_id", assignmentId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    setTasks(data || []);
    setLoading(false);
  }, [assignmentId]);

  const fetchTeamMembers = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("tenant_id", tenantId);
    setTeamMembers(data || []);
  }, [tenantId]);

  useEffect(() => {
    fetchTasks();
    fetchTeamMembers();
  }, [fetchTasks, fetchTeamMembers]);

  async function handleAddTask() {
    if (!newTaskTitle.trim()) return;
    const supabase = createClient();

    const maxSort = tasks.length > 0
      ? Math.max(...tasks.map((t) => t.sort_order)) + 1
      : 1;

    await supabase.from("tasks").insert({
      tenant_id: tenantId,
      assignment_id: assignmentId,
      title: newTaskTitle.trim(),
      sort_order: maxSort,
      is_auto_generated: false,
      assigned_to: userId,
    });

    setNewTaskTitle("");
    setAddingTask(false);
    await fetchTasks();
  }

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    if (categoryFilter !== "all" && task.category !== categoryFilter) {
      return false;
    }
    if (statusFilter === "pending" && task.status === "done") {
      return false;
    }
    if (statusFilter === "done" && task.status !== "done") {
      return false;
    }
    return true;
  });

  if (loading) {
    return <LoadingSpinner text="Laddar uppgifter..." />;
  }

  return (
    <div className="space-y-4">
      {/* Progress */}
      {tasks.length > 0 && (
        <ChecklistProgress tasks={tasks} />
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-1 h-3.5 w-3.5" />
            Filter
          </Button>
          <span className="text-sm text-muted-foreground">
            {filteredTasks.length} uppgift{filteredTasks.length !== 1 ? "er" : ""}
          </span>
        </div>
        <Button
          size="sm"
          onClick={() => setAddingTask(true)}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Lägg till
        </Button>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="flex flex-wrap gap-4 pt-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Kategori
              </label>
              <div className="flex flex-wrap gap-1">
                {CATEGORY_FILTER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setCategoryFilter(opt.value)}
                    className={`rounded-full px-2.5 py-0.5 text-xs transition-colors ${
                      categoryFilter === opt.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Status
              </label>
              <div className="flex flex-wrap gap-1">
                {STATUS_FILTER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setStatusFilter(opt.value)}
                    className={`rounded-full px-2.5 py-0.5 text-xs transition-colors ${
                      statusFilter === opt.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add task form */}
      {addingTask && (
        <div className="flex items-center gap-2 rounded-lg border p-3">
          <input
            type="text"
            placeholder="Skriv uppgiftstitel..."
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddTask();
              if (e.key === "Escape") {
                setAddingTask(false);
                setNewTaskTitle("");
              }
            }}
            autoFocus
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <Button size="sm" onClick={handleAddTask} disabled={!newTaskTitle.trim()}>
            Lägg till
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setAddingTask(false);
              setNewTaskTitle("");
            }}
          >
            Avbryt
          </Button>
        </div>
      )}

      {/* Task items */}
      {filteredTasks.length === 0 ? (
        <Card>
          <CardHeader className="items-center text-center">
            <CardTitle className="text-base">Inga uppgifter</CardTitle>
            <CardDescription>
              {tasks.length === 0
                ? "Uppgifter skapas automatiskt vid statusändringar, eller lägg till manuellt."
                : "Inga uppgifter matchar filtret."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              teamMembers={teamMembers}
              onUpdated={fetchTasks}
            />
          ))}
        </div>
      )}
    </div>
  );
}
