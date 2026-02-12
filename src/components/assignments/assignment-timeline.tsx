"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { formatDateTime } from "@/lib/utils/formatting";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database";
import {
  FileText,
  ArrowRightLeft,
  Sparkles,
  Mail,
  CheckSquare,
  User,
  Clock,
} from "lucide-react";

type AuditLog = Database["public"]["Tables"]["audit_logs"]["Row"];

const ACTION_CONFIG: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    color: string;
  }
> = {
  "assignment.created": {
    icon: FileText,
    label: "Uppdrag skapat",
    color: "bg-blue-100 text-blue-600",
  },
  "assignment.status_changed": {
    icon: ArrowRightLeft,
    label: "Status ändrad",
    color: "bg-amber-100 text-amber-600",
  },
  "document.uploaded": {
    icon: FileText,
    label: "Dokument uppladdat",
    color: "bg-green-100 text-green-600",
  },
  "extraction.completed": {
    icon: Sparkles,
    label: "Extraktion klar",
    color: "bg-purple-100 text-purple-600",
  },
  "generation.approved": {
    icon: CheckSquare,
    label: "Utkast godkänt",
    color: "bg-emerald-100 text-emerald-600",
  },
  "email.sent": {
    icon: Mail,
    label: "E-post skickad",
    color: "bg-sky-100 text-sky-600",
  },
  "user.invited": {
    icon: User,
    label: "Användare inbjuden",
    color: "bg-indigo-100 text-indigo-600",
  },
};

const DEFAULT_ACTION = {
  icon: Clock,
  label: "Händelse",
  color: "bg-gray-100 text-gray-600",
};

interface AssignmentTimelineProps {
  assignmentId: string;
}

export function AssignmentTimeline({ assignmentId }: AssignmentTimelineProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("audit_logs")
      .select("*")
      .eq("entity_id", assignmentId)
      .order("created_at", { ascending: false })
      .limit(50);
    setLogs(data || []);
    setLoading(false);
  }, [assignmentId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tidslinje</CardTitle>
        </CardHeader>
        <CardContent>
          <LoadingSpinner text="Laddar tidslinje..." />
        </CardContent>
      </Card>
    );
  }

  if (logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tidslinje</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Inga händelser registrerade ännu.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tidslinje</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-0">
          {logs.map((log, index) => {
            const config = ACTION_CONFIG[log.action] || DEFAULT_ACTION;
            const Icon = config.icon;
            const meta = log.metadata_json as Record<string, string> | null;
            const isLast = index === logs.length - 1;

            return (
              <div key={log.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                      config.color,
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  {!isLast && (
                    <div className="w-px flex-1 bg-border" />
                  )}
                </div>
                <div className={cn("pb-6", isLast && "pb-0")}>
                  <p className="text-sm font-medium">{config.label}</p>
                  {meta && (
                    <p className="text-xs text-muted-foreground">
                      {formatMetadata(log.action, meta)}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(log.created_at)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function formatMetadata(
  action: string,
  meta: Record<string, string>,
): string {
  switch (action) {
    case "assignment.status_changed":
      return meta.new_status
        ? `Ny status: ${meta.new_status}${meta.tasks_created ? ` (${meta.tasks_created} uppgifter skapade)` : ""}`
        : "";
    case "assignment.created":
      return meta.address ? `${meta.address}, ${meta.city}` : "";
    default:
      return Object.entries(meta)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
  }
}
