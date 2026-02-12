import { cn } from "@/lib/utils";
import {
  ASSIGNMENT_STATUSES,
  STATUS_LABELS,
  type AssignmentStatus,
} from "@/types/assignment";
import { Check } from "lucide-react";

interface StatusStepperProps {
  currentStatus: AssignmentStatus;
}

export function StatusStepper({ currentStatus }: StatusStepperProps) {
  const currentIndex = ASSIGNMENT_STATUSES.indexOf(currentStatus);

  return (
    <div className="flex items-center gap-1">
      {ASSIGNMENT_STATUSES.map((status, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <div key={status} className="flex items-center">
            {index > 0 && (
              <div
                className={cn(
                  "h-0.5 w-6 sm:w-10",
                  isCompleted ? "bg-primary" : "bg-border",
                )}
              />
            )}
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-medium",
                  isCompleted &&
                    "border-primary bg-primary text-primary-foreground",
                  isCurrent && "border-primary bg-background text-primary",
                  !isCompleted &&
                    !isCurrent &&
                    "border-muted bg-background text-muted-foreground",
                )}
              >
                {isCompleted ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={cn(
                  "hidden text-[10px] sm:block",
                  isCurrent
                    ? "font-medium text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {STATUS_LABELS[status]}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
