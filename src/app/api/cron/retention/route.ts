import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAuditLog } from "@/lib/audit/log";

/**
 * Cron job: Hard delete data that has exceeded tenant-specific retention periods.
 * Runs daily. Protected by CRON_SECRET.
 *
 * Deletes:
 * - Documents (raw data) older than tenant.retention_raw_days
 * - Extractions & generations (derived data) older than tenant.retention_derived_days
 * - Associated Storage files
 *
 * Audit logs are NEVER deleted (kept minimum 2 years per legal requirements).
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Fetch all active tenants with their retention settings
  const { data: tenants, error: tenantsError } = await supabase
    .from("tenants")
    .select("id, retention_raw_days, retention_derived_days")
    .is("deleted_at", null);

  if (tenantsError) {
    return NextResponse.json(
      { error: "Failed to fetch tenants", details: tenantsError.message },
      { status: 500 },
    );
  }

  if (!tenants || tenants.length === 0) {
    return NextResponse.json({ message: "No tenants found", deleted: {} });
  }

  const results: Record<
    string,
    { documents: number; extractions: number; generations: number; storage_files: number }
  > = {};

  for (const tenant of tenants) {
    const rawCutoff = new Date();
    rawCutoff.setDate(rawCutoff.getDate() - tenant.retention_raw_days);
    const rawCutoffISO = rawCutoff.toISOString();

    const derivedCutoff = new Date();
    derivedCutoff.setDate(derivedCutoff.getDate() - tenant.retention_derived_days);
    const derivedCutoffISO = derivedCutoff.toISOString();

    let deletedDocs = 0;
    let deletedExtractions = 0;
    let deletedGenerations = 0;
    let deletedFiles = 0;

    // 1. Find and delete expired documents (raw data)
    const { data: expiredDocs } = await supabase
      .from("documents")
      .select("id, storage_path")
      .eq("tenant_id", tenant.id)
      .lt("created_at", rawCutoffISO);

    if (expiredDocs && expiredDocs.length > 0) {
      // Delete files from Storage
      const storagePaths = expiredDocs
        .map((d) => d.storage_path)
        .filter(Boolean);

      if (storagePaths.length > 0) {
        const { data: removedFiles } = await supabase.storage
          .from("documents")
          .remove(storagePaths);
        deletedFiles = removedFiles?.length || 0;
      }

      // Hard delete document rows
      const docIds = expiredDocs.map((d) => d.id);
      const { count } = await supabase
        .from("documents")
        .delete({ count: "exact" })
        .in("id", docIds);
      deletedDocs = count || 0;
    }

    // 2. Delete expired extractions (derived data)
    const { count: extractionCount } = await supabase
      .from("extractions")
      .delete({ count: "exact" })
      .eq("tenant_id", tenant.id)
      .lt("created_at", derivedCutoffISO);
    deletedExtractions = extractionCount || 0;

    // 3. Delete expired generations (derived data)
    const { count: generationCount } = await supabase
      .from("generations")
      .delete({ count: "exact" })
      .eq("tenant_id", tenant.id)
      .lt("created_at", derivedCutoffISO);
    deletedGenerations = generationCount || 0;

    // Log results if anything was deleted
    const totalDeleted =
      deletedDocs + deletedExtractions + deletedGenerations;

    if (totalDeleted > 0) {
      await createAuditLog(supabase, {
        tenantId: tenant.id,
        action: "data.retention_cleanup",
        entityType: "tenant",
        entityId: tenant.id,
        metadata: {
          documents_deleted: deletedDocs,
          extractions_deleted: deletedExtractions,
          generations_deleted: deletedGenerations,
          storage_files_deleted: deletedFiles,
          raw_cutoff: rawCutoffISO,
          derived_cutoff: derivedCutoffISO,
        },
      });

      results[tenant.id] = {
        documents: deletedDocs,
        extractions: deletedExtractions,
        generations: deletedGenerations,
        storage_files: deletedFiles,
      };
    }
  }

  return NextResponse.json({
    tenants_processed: tenants.length,
    deleted: results,
  });
}
