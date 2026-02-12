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
import { Badge } from "@/components/ui/badge";
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
  Trash2,
  Shield,
  ChevronDown,
  Filter,
  Download,
} from "lucide-react";

type AuditLog = Database["public"]["Tables"]["audit_logs"]["Row"];

const ACTION_CONFIG: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    color: string;
    category: string;
  }
> = {
  "assignment.created": {
    icon: FileText,
    label: "Uppdrag skapat",
    color: "bg-blue-100 text-blue-600",
    category: "assignment",
  },
  "assignment.status_changed": {
    icon: ArrowRightLeft,
    label: "Status ändrad",
    color: "bg-amber-100 text-amber-600",
    category: "assignment",
  },
  "assignment.deleted": {
    icon: Trash2,
    label: "Uppdrag raderat",
    color: "bg-red-100 text-red-600",
    category: "assignment",
  },
  "document.uploaded": {
    icon: FileText,
    label: "Dokument uppladdat",
    color: "bg-green-100 text-green-600",
    category: "document",
  },
  "document.deleted": {
    icon: Trash2,
    label: "Dokument raderat",
    color: "bg-red-100 text-red-600",
    category: "document",
  },
  "extraction.completed": {
    icon: Sparkles,
    label: "Extraktion klar",
    color: "bg-purple-100 text-purple-600",
    category: "extraction",
  },
  "extraction.failed": {
    icon: Sparkles,
    label: "Extraktion misslyckades",
    color: "bg-red-100 text-red-600",
    category: "extraction",
  },
  "generation.created": {
    icon: Sparkles,
    label: "AI-text genererad",
    color: "bg-purple-100 text-purple-600",
    category: "generation",
  },
  "generation.approved": {
    icon: CheckSquare,
    label: "Utkast godkänt",
    color: "bg-emerald-100 text-emerald-600",
    category: "generation",
  },
  "email.sent": {
    icon: Mail,
    label: "E-post skickad",
    color: "bg-sky-100 text-sky-600",
    category: "email",
  },
  "contract.processed": {
    icon: FileText,
    label: "Kontrakt bearbetat",
    color: "bg-teal-100 text-teal-600",
    category: "transaction",
  },
  "transaction.status_changed": {
    icon: ArrowRightLeft,
    label: "Transaktionsstatus ändrad",
    color: "bg-amber-100 text-amber-600",
    category: "transaction",
  },
  "user.invited": {
    icon: User,
    label: "Användare inbjuden",
    color: "bg-indigo-100 text-indigo-600",
    category: "user",
  },
  "tenant.settings_changed": {
    icon: Shield,
    label: "Inställningar ändrade",
    color: "bg-gray-100 text-gray-600",
    category: "tenant",
  },
  "tenant.data_deletion_requested": {
    icon: Trash2,
    label: "Dataradering begärd",
    color: "bg-red-100 text-red-600",
    category: "tenant",
  },
  "tenant.data_deleted": {
    icon: Trash2,
    label: "Data raderad",
    color: "bg-red-100 text-red-600",
    category: "tenant",
  },
  "data.deleted": {
    icon: Trash2,
    label: "Data raderad",
    color: "bg-red-100 text-red-600",
    category: "data",
  },
  "data.retention_cleanup": {
    icon: Clock,
    label: "Retention-rensning",
    color: "bg-orange-100 text-orange-600",
    category: "data",
  },
};

const DEFAULT_ACTION = {
  icon: Clock,
  label: "Händelse",
  color: "bg-gray-100 text-gray-600",
  category: "other",
};

const CATEGORY_FILTERS = [
  { value: "all", label: "Alla" },
  { value: "assignment", label: "Uppdrag" },
  { value: "document", label: "Dokument" },
  { value: "extraction", label: "Extraktioner" },
  { value: "generation", label: "AI-generering" },
  { value: "email", label: "E-post" },
  { value: "transaction", label: "Transaktioner" },
  { value: "user", label: "Användare" },
  { value: "tenant", label: "Organisation" },
  { value: "data", label: "Data/GDPR" },
];

interface AuditLogViewerProps {
  /** If provided, filter logs to this assignment only */
  assignmentId?: string;
  /** If provided, filter logs to this entity */
  entityId?: string;
  /** Page size */
  pageSize?: number;
}

export function AuditLogViewer({
  assignmentId,
  entityId,
  pageSize = 50,
}: AuditLogViewerProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    let query = supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(pageSize + 1);

    if (assignmentId) {
      query = query.or(
        `entity_id.eq.${assignmentId},metadata_json->>assignment_id.eq.${assignmentId}`,
      );
    }

    if (entityId && !assignmentId) {
      query = query.eq("entity_id", entityId);
    }

    if (categoryFilter !== "all") {
      const actions = Object.entries(ACTION_CONFIG)
        .filter(([, v]) => v.category === categoryFilter)
        .map(([k]) => k);
      if (actions.length > 0) {
        query = query.in("action", actions);
      }
    }

    const { data } = await query;
    const results = data || [];

    if (results.length > pageSize) {
      setHasMore(true);
      setLogs(results.slice(0, pageSize));
    } else {
      setHasMore(false);
      setLogs(results);
    }

    setLoading(false);
  }, [assignmentId, entityId, categoryFilter, pageSize]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">Revisionslogg</CardTitle>
            <CardDescription>
              Alla händelser loggas för spårbarhet och GDPR-efterlevnad.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-1 h-3.5 w-3.5" />
            Filter
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filters */}
        {showFilters && (
          <div className="flex flex-wrap gap-1.5 rounded-lg border p-3">
            {CATEGORY_FILTERS.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategoryFilter(cat.value)}
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs transition-colors",
                  categoryFilter === cat.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {/* Log entries */}
        {loading ? (
          <LoadingSpinner text="Laddar revisionslogg..." />
        ) : logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Inga loggposter hittades.
          </p>
        ) : (
          <div className="space-y-1">
            {logs.map((log) => {
              const config = ACTION_CONFIG[log.action] || DEFAULT_ACTION;
              const Icon = config.icon;
              const meta = log.metadata_json as Record<
                string,
                unknown
              > | null;
              const isExpanded = expandedId === log.id;

              return (
                <div
                  key={log.id}
                  className="rounded-md border p-3 transition-colors hover:bg-muted/30"
                >
                  <button
                    className="flex w-full items-start gap-3 text-left"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : log.id)
                    }
                  >
                    <div
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                        config.color,
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {config.label}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0"
                        >
                          {log.entity_type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(log.created_at)}
                      </p>
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                        isExpanded && "rotate-180",
                      )}
                    />
                  </button>

                  {isExpanded && meta && (
                    <div className="mt-2 ml-10 rounded-md bg-muted/50 p-3">
                      <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                        {JSON.stringify(meta, null, 2)}
                      </pre>
                      {log.actor_user_id && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Utförare: {log.actor_user_id}
                        </p>
                      )}
                      {log.entity_id && (
                        <p className="text-xs text-muted-foreground">
                          Entitet: {log.entity_id}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Load more */}
        {hasMore && (
          <div className="text-center">
            <Button variant="outline" size="sm" onClick={fetchLogs}>
              <Download className="mr-1 h-3.5 w-3.5" />
              Ladda fler
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
