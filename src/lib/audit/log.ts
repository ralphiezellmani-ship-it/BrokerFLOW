import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";

/**
 * Audit actions as defined in CLAUDE.md section 7.4.
 * Every data mutation in the system should be logged.
 */
export type AuditAction =
  | "assignment.created"
  | "assignment.status_changed"
  | "assignment.deleted"
  | "document.uploaded"
  | "document.deleted"
  | "extraction.completed"
  | "extraction.failed"
  | "generation.created"
  | "generation.approved"
  | "email.sent"
  | "contract.processed"
  | "transaction.status_changed"
  | "user.invited"
  | "user.removed"
  | "tenant.settings_changed"
  | "tenant.data_deletion_requested"
  | "tenant.data_deleted"
  | "data.deleted"
  | "data.retention_cleanup";

export type AuditEntityType =
  | "assignment"
  | "document"
  | "extraction"
  | "generation"
  | "email"
  | "transaction"
  | "task"
  | "user"
  | "tenant";

interface AuditLogParams {
  tenantId: string;
  actorUserId?: string | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Create an audit log entry. This is the single entry point for all audit
 * logging in BrokerFlow. All data mutations should call this function.
 */
export async function createAuditLog(
  supabase: SupabaseClient<Database>,
  params: AuditLogParams,
) {
  const { error } = await supabase.from("audit_logs").insert({
    tenant_id: params.tenantId,
    actor_user_id: params.actorUserId || null,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId || null,
    metadata_json: (params.metadata || null) as Json,
  });

  if (error) {
    // Audit logging should never break the main flow.
    // Log to console for observability but don't throw.
    console.error("[audit] Failed to create audit log:", error.message, params);
  }
}
