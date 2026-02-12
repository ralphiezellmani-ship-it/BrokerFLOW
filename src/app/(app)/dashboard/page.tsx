import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/helpers";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AssignmentCard } from "@/components/assignments/assignment-card";
import { FileText, Clock, CheckCircle2, Plus } from "lucide-react";
import { addDays } from "date-fns";

export default async function DashboardPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const supabase = await createClient();
  const tenantId = currentUser.profile.tenant_id;

  // Fetch KPIs in parallel
  const [assignmentsRes, tasksRes, deadlinesRes, recentRes] = await Promise.all(
    [
      supabase
        .from("assignments")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .in("status", ["active", "under_contract"]),
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .in("status", ["todo", "in_progress"]),
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .in("status", ["todo", "in_progress"])
        .lte("due_date", addDays(new Date(), 7).toISOString()),
      supabase
        .from("assignments")
        .select("*")
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(5),
    ],
  );

  const activeCount = assignmentsRes.count || 0;
  const pendingTasks = tasksRes.count || 0;
  const upcomingDeadlines = deadlinesRes.count || 0;
  const recentAssignments = recentRes.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Välkommen, {currentUser.profile.full_name}!
          </p>
        </div>
        <Link href="/assignments/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nytt uppdrag
          </Button>
        </Link>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Aktiva uppdrag
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
            <CardDescription>förmedlingsuppdrag</CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Väntande uppgifter
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingTasks}</div>
            <CardDescription>att göra</CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Kommande deadlines
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingDeadlines}</div>
            <CardDescription>inom 7 dagar</CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* Recent assignments */}
      {recentAssignments.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Senaste uppdrag</h2>
            <Link
              href="/assignments"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Visa alla
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {recentAssignments.map((assignment) => (
              <AssignmentCard key={assignment.id} assignment={assignment} />
            ))}
          </div>
        </div>
      ) : (
        <Card>
          <CardHeader className="items-center text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle>Kom igång</CardTitle>
            <CardDescription>
              Skapa ditt första förmedlingsuppdrag för att börja använda
              BrokerFlow.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
