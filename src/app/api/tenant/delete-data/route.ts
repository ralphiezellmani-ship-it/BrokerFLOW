import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAuditLog } from "@/lib/audit/log";

/**
 * POST /api/tenant/delete-data
 *
 * Admin-only endpoint to request deletion of all tenant data.
 * Two-step confirmation: requires { confirm: true } in the body.
 *
 * This soft-deletes the tenant itself and hard-deletes:
 * - All documents (including Storage files)
 * - All extractions
 * - All generations
 * - All transactions
 * - All tasks
 * - All email_logs
 * - All inbound_aliases
 *
 * Audit logs are preserved for legal compliance.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
  }

  // Get user profile and verify admin role
  const { data: profile } = await supabase
    .from("users")
    .select("id, tenant_id, role")
    .eq("id", authUser.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return NextResponse.json(
      { error: "Bara administratörer kan radera tenant-data" },
      { status: 403 },
    );
  }

  const body = await req.json();

  if (body.confirm !== true) {
    return NextResponse.json(
      { error: "Bekräftelse krävs. Skicka { confirm: true }." },
      { status: 400 },
    );
  }

  const tenantId = profile.tenant_id;
  const admin = createAdminClient();

  // Log the deletion request before doing anything
  await createAuditLog(admin, {
    tenantId,
    actorUserId: profile.id,
    action: "tenant.data_deletion_requested",
    entityType: "tenant",
    entityId: tenantId,
    metadata: {
      requested_by: profile.id,
      requested_at: new Date().toISOString(),
    },
  });

  // 1. Delete storage files for all documents
  const { data: docs } = await admin
    .from("documents")
    .select("storage_path")
    .eq("tenant_id", tenantId);

  if (docs && docs.length > 0) {
    const paths = docs.map((d) => d.storage_path).filter(Boolean);
    if (paths.length > 0) {
      await admin.storage.from("documents").remove(paths);
    }
  }

  // 2. Hard delete all data tables (order matters for foreign keys)
  await admin.from("email_logs").delete().eq("tenant_id", tenantId);
  await admin.from("generations").delete().eq("tenant_id", tenantId);
  await admin.from("extractions").delete().eq("tenant_id", tenantId);
  await admin.from("documents").delete().eq("tenant_id", tenantId);
  await admin.from("tasks").delete().eq("tenant_id", tenantId);
  await admin.from("transactions").delete().eq("tenant_id", tenantId);
  await admin.from("assignments").delete().eq("tenant_id", tenantId);
  await admin.from("inbound_aliases").delete().eq("tenant_id", tenantId);
  await admin.from("tenant_preferences").delete().eq("tenant_id", tenantId);

  // 3. Log completion (audit logs kept for legal compliance)
  await createAuditLog(admin, {
    tenantId,
    actorUserId: profile.id,
    action: "tenant.data_deleted",
    entityType: "tenant",
    entityId: tenantId,
    metadata: {
      documents_deleted: docs?.length || 0,
      completed_at: new Date().toISOString(),
    },
  });

  // 4. Soft delete the tenant itself
  await admin
    .from("tenants")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", tenantId);

  return NextResponse.json({
    success: true,
    message: "All tenant-data har raderats. Revisionsloggar behålls.",
  });
}
