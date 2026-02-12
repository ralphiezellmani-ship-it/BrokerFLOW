"use client";

import { cn } from "@/lib/utils";
import type { Database } from "@/types/database";

type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];

interface ChecklistProgressProps {
  tasks: TaskRow[];
  className?: string;
  showLabel?: boolean;
}

export function ChecklistProgress({
  tasks,
  className,
  showLabel = true,
}: ChecklistProgressProps) {
  const total = tasks.length;
  if (total === 0) return null;

  const done = tasks.filter((t) => t.status === "done").length;
  const percent = Math.round((done / total) * 100);

  return (
    <div className={cn("space-y-1", className)}>
      {showLabel && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {done} av {total} klara
          </span>
          <span className="font-medium">{percent}%</span>
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            percent === 100 ? "bg-green-500" : "bg-primary",
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
