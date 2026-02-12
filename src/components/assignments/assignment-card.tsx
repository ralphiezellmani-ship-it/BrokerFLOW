import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusBadge } from "./status-badge";
import { PROPERTY_TYPE_LABELS } from "@/types/assignment";
import { formatPrice, formatRelativeTime } from "@/lib/utils/formatting";
import { cn } from "@/lib/utils";
import { MapPin, Home, Tag, CheckCircle2 } from "lucide-react";
import type { Assignment } from "@/types/assignment";

interface AssignmentCardProps {
  assignment: Assignment;
  taskProgress?: { done: number; total: number } | null;
}

export function AssignmentCard({ assignment, taskProgress }: AssignmentCardProps) {
  const percent =
    taskProgress && taskProgress.total > 0
      ? Math.round((taskProgress.done / taskProgress.total) * 100)
      : null;

  return (
    <Link href={`/assignments/${assignment.id}`}>
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader className="flex flex-row items-start justify-between pb-2">
          <CardTitle className="text-base font-semibold">
            {assignment.address}
          </CardTitle>
          <StatusBadge status={assignment.status} />
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {assignment.city}
              {assignment.postal_code ? `, ${assignment.postal_code}` : ""}
            </span>
            <span className="flex items-center gap-1">
              <Home className="h-3.5 w-3.5" />
              {PROPERTY_TYPE_LABELS[assignment.property_type]}
            </span>
            {assignment.asking_price && (
              <span className="flex items-center gap-1">
                <Tag className="h-3.5 w-3.5" />
                {formatPrice(assignment.asking_price)}
              </span>
            )}
          </div>

          {/* Task progress indicator */}
          {taskProgress && taskProgress.total > 0 && (
            <div className="mt-3 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3" />
                  {taskProgress.done}/{taskProgress.total} uppgifter
                </span>
                <span className="font-medium">{percent}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    percent === 100 ? "bg-green-500" : "bg-primary",
                  )}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          )}

          <p className={cn("text-xs text-muted-foreground", taskProgress ? "mt-2" : "mt-2")}>
            Skapad {formatRelativeTime(assignment.created_at)}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
