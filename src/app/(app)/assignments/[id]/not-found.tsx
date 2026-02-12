import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileX } from "lucide-react";

export default function AssignmentNotFound() {
  return (
    <div className="flex items-center justify-center py-12">
      <Card className="max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <FileX className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle>Uppdraget hittades inte</CardTitle>
          <CardDescription>
            Uppdraget du letar efter finns inte eller har tagits bort.
          </CardDescription>
          <div className="pt-4">
            <Link href="/assignments">
              <Button variant="outline">Tillbaka till uppdrag</Button>
            </Link>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}
