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
import { MapPin, Home, Tag } from "lucide-react";
import type { Assignment } from "@/types/assignment";

interface AssignmentCardProps {
  assignment: Assignment;
}

export function AssignmentCard({ assignment }: AssignmentCardProps) {
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
          <p className="mt-2 text-xs text-muted-foreground">
            Skapad {formatRelativeTime(assignment.created_at)}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
