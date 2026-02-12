import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/helpers";
import { createClient } from "@/lib/supabase/server";
import { AssignmentDetail } from "@/components/assignments/assignment-detail";

interface AssignmentPageProps {
  params: Promise<{ id: string }>;
}

export default async function AssignmentPage({ params }: AssignmentPageProps) {
  const { id } = await params;
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const supabase = await createClient();
  const { data: assignment } = await supabase
    .from("assignments")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", currentUser.profile.tenant_id)
    .is("deleted_at", null)
    .single();

  if (!assignment) {
    notFound();
  }

  return (
    <AssignmentDetail
      assignment={assignment}
      userId={currentUser.profile.id}
      tenantId={currentUser.profile.tenant_id}
    />
  );
}
