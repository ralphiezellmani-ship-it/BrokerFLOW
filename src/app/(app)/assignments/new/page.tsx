import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/helpers";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AssignmentForm } from "@/components/assignments/assignment-form";

export default async function NewAssignmentPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Nytt förmedlingsuppdrag
        </h1>
        <p className="text-muted-foreground">
          Fyll i uppgifterna nedan för att skapa ett nytt uppdrag
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <AssignmentForm
            userId={currentUser.profile.id}
            tenantId={currentUser.profile.tenant_id}
          />
        </CardContent>
      </Card>
    </div>
  );
}
