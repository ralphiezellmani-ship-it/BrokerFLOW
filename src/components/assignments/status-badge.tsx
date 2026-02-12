import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS, type AssignmentStatus } from "@/types/assignment";
import { cn } from "@/lib/utils";

const statusStyles: Record<AssignmentStatus, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-200",
  active: "bg-blue-100 text-blue-700 border-blue-200",
  under_contract: "bg-amber-100 text-amber-700 border-amber-200",
  closed: "bg-green-100 text-green-700 border-green-200",
};

interface StatusBadgeProps {
  status: AssignmentStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(statusStyles[status], className)}
    >
      {STATUS_LABELS[status]}
    </Badge>
  );
}
