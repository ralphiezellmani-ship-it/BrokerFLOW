import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { AssignmentStatus } from "@/types/assignment";

type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];

const CHECKLIST_TEMPLATES: Record<string, TaskInsert[]> = {
  active: [
    {
      title: "Beställ mäklarbild från BRF",
      category: "docs",
      sort_order: 1,
      tenant_id: "",
      assignment_id: "",
    },
    {
      title: "Beställ fotografering",
      category: "marketing",
      sort_order: 2,
      tenant_id: "",
      assignment_id: "",
    },
    {
      title: "Skapa annonstext",
      category: "marketing",
      sort_order: 3,
      tenant_id: "",
      assignment_id: "",
    },
    {
      title: "Publicera annons",
      category: "marketing",
      sort_order: 4,
      tenant_id: "",
      assignment_id: "",
    },
    {
      title: "Beställ energideklaration",
      category: "docs",
      sort_order: 5,
      tenant_id: "",
      assignment_id: "",
    },
  ],
  under_contract: [
    {
      title: "Ladda upp köpekontrakt",
      category: "transaction",
      sort_order: 1,
      tenant_id: "",
      assignment_id: "",
    },
    {
      title: "Skicka BRF-ansökan till förening",
      category: "transaction",
      sort_order: 2,
      tenant_id: "",
      assignment_id: "",
    },
    {
      title: "Boka tillträde",
      category: "transaction",
      sort_order: 3,
      tenant_id: "",
      assignment_id: "",
    },
    {
      title: "Förbered likvidavräkning",
      category: "transaction",
      sort_order: 4,
      tenant_id: "",
      assignment_id: "",
    },
    {
      title: "Bekräfta handpenning mottagen",
      category: "transaction",
      sort_order: 5,
      tenant_id: "",
      assignment_id: "",
    },
  ],
  closed: [
    {
      title: "Arkivera dokument",
      category: "closing",
      sort_order: 1,
      tenant_id: "",
      assignment_id: "",
    },
    {
      title: "Skicka feedback-förfrågan till säljare",
      category: "closing",
      sort_order: 2,
      tenant_id: "",
      assignment_id: "",
    },
    {
      title: "Granska retention-policy",
      category: "closing",
      sort_order: 3,
      tenant_id: "",
      assignment_id: "",
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

  const tasks: TaskInsert[] = templates.map((t) => ({
    ...t,
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
