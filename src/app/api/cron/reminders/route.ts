import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTaskReminderEmail } from "@/lib/email/resend";
import { addDays } from "date-fns";

/**
 * Cron job: Send email reminders for tasks with upcoming deadlines.
 * Runs daily. Protected by CRON_SECRET.
 *
 * Sends reminders for tasks due within the next 3 days that:
 * - Are not completed (status = todo or in_progress)
 * - Have an assigned user
 * - Have a due date
 */
export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.brokerflow.se";

  const today = new Date().toISOString().split("T")[0];
  const threeDaysOut = addDays(new Date(), 3).toISOString().split("T")[0];

  // Fetch tasks with upcoming deadlines (within 3 days)
  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select(
      "id, title, due_date, assigned_to, assignment_id, tenant_id",
    )
    .in("status", ["todo", "in_progress"])
    .not("assigned_to", "is", null)
    .not("due_date", "is", null)
    .gte("due_date", today)
    .lte("due_date", threeDaysOut);

  if (tasksError) {
    return NextResponse.json(
      { error: "Failed to fetch tasks", details: tasksError.message },
      { status: 500 },
    );
  }

  if (!tasks || tasks.length === 0) {
    return NextResponse.json({ sent: 0, message: "No tasks with upcoming deadlines" });
  }

  // Collect unique user IDs and assignment IDs
  const userIds = [...new Set(tasks.map((t) => t.assigned_to!))];
  const assignmentIds = [...new Set(tasks.map((t) => t.assignment_id))];

  // Fetch user details and assignment details in parallel
  const [usersRes, assignmentsRes] = await Promise.all([
    supabase
      .from("users")
      .select("id, full_name, email")
      .in("id", userIds),
    supabase
      .from("assignments")
      .select("id, address, city")
      .in("id", assignmentIds),
  ]);

  const usersMap = new Map(
    (usersRes.data || []).map((u) => [u.id, u]),
  );
  const assignmentsMap = new Map(
    (assignmentsRes.data || []).map((a) => [a.id, a]),
  );

  let sent = 0;
  const errors: string[] = [];

  for (const task of tasks) {
    const user = usersMap.get(task.assigned_to!);
    const assignment = assignmentsMap.get(task.assignment_id);

    if (!user || !assignment) continue;

    try {
      await sendTaskReminderEmail({
        to: user.email,
        recipientName: user.full_name,
        taskTitle: task.title,
        dueDate: task.due_date!,
        assignmentAddress: `${assignment.address}, ${assignment.city}`,
        assignmentUrl: `${appUrl}/assignments/${assignment.id}`,
      });

      // Log to email_logs
      await supabase.from("email_logs").insert({
        tenant_id: task.tenant_id,
        assignment_id: task.assignment_id,
        recipient_email: user.email,
        recipient_name: user.full_name,
        subject: `Påminnelse: ${task.title} — deadline ${task.due_date}`,
        body_preview: `Uppgift med deadline: ${task.title}`,
        template_name: "task_reminder",
        status: "sent",
        sent_at: new Date().toISOString(),
      });

      // Audit log
      await supabase.from("audit_logs").insert({
        tenant_id: task.tenant_id,
        action: "email.sent",
        entity_type: "task",
        entity_id: task.id,
        metadata_json: {
          type: "task_reminder",
          recipient: user.email,
          task_title: task.title,
          due_date: task.due_date,
        },
      });

      sent++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      errors.push(`Task ${task.id}: ${msg}`);
    }
  }

  return NextResponse.json({
    sent,
    total_tasks: tasks.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}
