import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { AssignmentStatus } from "@/types/assignment";
import { addDays } from "date-fns";

type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];

interface ChecklistTemplate {
  title: string;
  description?: string;
  category: string;
  sort_order: number;
  /** Days from status change until due date. null = no deadline. */
  due_days_offset: number | null;
}

const CHECKLIST_TEMPLATES: Record<string, ChecklistTemplate[]> = {
  active: [
    {
      title: "Beställ mäklarbild från BRF",
      description: "Kontakta föreningen och begär mäklarbild, stadgar och årsredovisning.",
      category: "docs",
      sort_order: 1,
      due_days_offset: 3,
    },
    {
      title: "Beställ fotografering",
      description: "Boka fotograf för objektfotografering.",
      category: "marketing",
      sort_order: 2,
      due_days_offset: 5,
    },
    {
      title: "Skapa annonstext",
      description: "Generera och granska AI-genererad annonstext.",
      category: "marketing",
      sort_order: 3,
      due_days_offset: 7,
    },
    {
      title: "Publicera annons",
      description: "Publicera annonsen på relevanta plattformar.",
      category: "marketing",
      sort_order: 4,
      due_days_offset: 10,
    },
    {
      title: "Beställ energideklaration",
      description: "Se till att energideklaration finns eller beställs.",
      category: "docs",
      sort_order: 5,
      due_days_offset: 7,
    },
  ],
  under_contract: [
    {
      title: "Ladda upp köpekontrakt",
      description: "Ladda upp det signerade kontraktet och kör extraktionspipelinen.",
      category: "transaction",
      sort_order: 1,
      due_days_offset: 1,
    },
    {
      title: "Skicka BRF-ansökan till förening",
      description: "Generera och skicka medlemsansökan till BRF.",
      category: "transaction",
      sort_order: 2,
      due_days_offset: 3,
    },
    {
      title: "Boka tillträde",
      description: "Boka tillträdesdag via Tambur eller manuellt.",
      category: "transaction",
      sort_order: 3,
      due_days_offset: 7,
    },
    {
      title: "Förbered likvidavräkning",
      description: "Generera utkast till likvidavräkning och granska.",
      category: "transaction",
      sort_order: 4,
      due_days_offset: 14,
    },
    {
      title: "Bekräfta handpenning mottagen",
      description: "Verifiera att handpenningen har betalats in.",
      category: "transaction",
      sort_order: 5,
      due_days_offset: 10,
    },
  ],
  closed: [
    {
      title: "Arkivera dokument",
      description: "Säkerställ att alla dokument är sparade och arkiverade.",
      category: "closing",
      sort_order: 1,
      due_days_offset: 7,
    },
    {
      title: "Skicka feedback-förfrågan till säljare",
      description: "Begär omdöme/feedback från säljaren.",
      category: "closing",
      sort_order: 2,
      due_days_offset: 3,
    },
    {
      title: "Granska retention-policy",
      description: "Kontrollera att GDPR-retention är korrekt konfigurerad.",
      category: "closing",
      sort_order: 3,
      due_days_offset: 14,
    },
  ],
};

export async function generateTasksForStatus(
  supabase: SupabaseClient<Database>,
  params: {
    assignmentId: string;
    tenantId: string;
    newStatus: AssignmentStatus;
    userId: string;
  },
) {
  const templates = CHECKLIST_TEMPLATES[params.newStatus];
  if (!templates || templates.length === 0) return;

  const now = new Date();

  const tasks: TaskInsert[] = templates.map((t) => ({
    title: t.title,
    description: t.description || null,
    category: t.category,
    sort_order: t.sort_order,
    due_date:
      t.due_days_offset != null
        ? addDays(now, t.due_days_offset).toISOString().split("T")[0]
        : null,
    tenant_id: params.tenantId,
    assignment_id: params.assignmentId,
    is_auto_generated: true,
    trigger_status: params.newStatus,
  }));

  await supabase.from("tasks").insert(tasks);

  // Audit log
  await supabase.from("audit_logs").insert({
    tenant_id: params.tenantId,
    actor_user_id: params.userId,
    action: "assignment.status_changed",
    entity_type: "assignment",
    entity_id: params.assignmentId,
    metadata_json: {
      new_status: params.newStatus,
      tasks_created: tasks.length,
    },
  });
}
