import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function AssignmentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Uppdrag</h1>
        <p className="text-muted-foreground">
          Dina förmedlingsuppdrag
        </p>
      </div>

      <Card>
        <CardHeader className="items-center text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle>Inga uppdrag än</CardTitle>
          <CardDescription>
            Skapa ditt första förmedlingsuppdrag för att komma igång.
            Uppdragshantering implementeras i Epic 3.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
