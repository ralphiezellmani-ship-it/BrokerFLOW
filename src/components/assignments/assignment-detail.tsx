"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusStepper } from "./status-stepper";
import { StatusChangeDialog } from "./status-change-dialog";
import { AssignmentTimeline } from "./assignment-timeline";
import { UploadDropzone } from "@/components/documents/upload-dropzone";
import { DocumentList } from "@/components/documents/document-list";
import { DocumentPreview } from "@/components/documents/document-preview";
import { ExtractionReview } from "@/components/documents/extraction-review";
import { GenerationsPanel } from "@/components/generations/generations-panel";
import { ContractPanel } from "@/components/transactions/contract-panel";
import { TaskList } from "@/components/tasks/task-list";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { PROPERTY_TYPE_LABELS } from "@/types/assignment";
import {
  formatPrice,
  formatArea,
  formatDate,
} from "@/lib/utils/formatting";
import type { Assignment } from "@/types/assignment";
import type { Document } from "@/types/document";
import type { Database } from "@/types/database";
import {
  MapPin,
  Home,
  Tag,
  Calendar,
  Ruler,
  Building,
  User,
  Mail,
  Phone,
} from "lucide-react";

type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];

interface AssignmentDetailProps {
  assignment: Assignment;
  userId: string;
  tenantId: string;
}

export function AssignmentDetail({
  assignment: initialAssignment,
  userId,
  tenantId,
}: AssignmentDetailProps) {
  const [assignment, setAssignment] = useState(initialAssignment);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const fetchAssignment = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("assignments")
      .select("*")
      .eq("id", assignment.id)
      .single();
    if (data) setAssignment(data);
  }, [assignment.id]);

  const fetchTasks = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("assignment_id", assignment.id)
      .order("sort_order", { ascending: true });
    setTasks(data || []);
  }, [assignment.id]);

  const fetchDocuments = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("documents")
      .select("*")
      .eq("assignment_id", assignment.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    setDocuments(data || []);
    setLoadingDocs(false);
  }, [assignment.id]);

  useEffect(() => {
    fetchTasks();
    fetchDocuments();
  }, [fetchTasks, fetchDocuments]);

  function handleStatusChanged() {
    fetchAssignment();
    fetchTasks();
  }

  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const totalTasks = tasks.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {assignment.address}
          </h1>
          <p className="text-muted-foreground">
            {assignment.city}
            {assignment.postal_code ? `, ${assignment.postal_code}` : ""}
          </p>
        </div>
        <StatusChangeDialog
          assignment={assignment}
          userId={userId}
          tenantId={tenantId}
          onStatusChanged={handleStatusChanged}
        />
      </div>

      {/* Status stepper */}
      <StatusStepper currentStatus={assignment.status} />

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Översikt</TabsTrigger>
          <TabsTrigger value="documents">Dokument</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
          <TabsTrigger value="drafts">Utkast</TabsTrigger>
          {(assignment.status === "under_contract" ||
            assignment.status === "closed") && (
            <TabsTrigger value="transaction">Transaktion</TabsTrigger>
          )}
          <TabsTrigger value="tasks">
            Uppgifter{totalTasks > 0 ? ` (${doneTasks}/${totalTasks})` : ""}
          </TabsTrigger>
        </TabsList>

        {/* Overview tab */}
        <TabsContent value="overview">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Objektdetaljer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <DetailRow
                  icon={Home}
                  label="Bostadstyp"
                  value={PROPERTY_TYPE_LABELS[assignment.property_type]}
                />
                <DetailRow
                  icon={Ruler}
                  label="Boyta"
                  value={formatArea(assignment.living_area_sqm)}
                />
                <DetailRow
                  icon={MapPin}
                  label="Rum"
                  value={
                    assignment.rooms ? `${assignment.rooms} rum` : "–"
                  }
                />
                <DetailRow
                  icon={Building}
                  label="Våning"
                  value={assignment.floor != null ? `${assignment.floor}` : "–"}
                />
                <DetailRow
                  icon={Calendar}
                  label="Byggår"
                  value={assignment.build_year ? `${assignment.build_year}` : "–"}
                />
                <DetailRow
                  icon={Tag}
                  label="Månadsavgift"
                  value={formatPrice(assignment.monthly_fee)}
                />
                <DetailRow
                  icon={Tag}
                  label="Utgångspris"
                  value={formatPrice(assignment.asking_price)}
                />
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Säljare</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <DetailRow
                    icon={User}
                    label="Namn"
                    value={assignment.seller_name || "–"}
                  />
                  <DetailRow
                    icon={Mail}
                    label="E-post"
                    value={assignment.seller_email || "–"}
                  />
                  <DetailRow
                    icon={Phone}
                    label="Telefon"
                    value={assignment.seller_phone || "–"}
                  />
                </CardContent>
              </Card>

              {(assignment.association_name ||
                assignment.association_org_number) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Förening</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <DetailRow
                      icon={Building}
                      label="Namn"
                      value={assignment.association_name || "–"}
                    />
                    <DetailRow
                      icon={Tag}
                      label="Org-nummer"
                      value={assignment.association_org_number || "–"}
                    />
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Metadata</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <DetailRow
                    icon={Calendar}
                    label="Skapad"
                    value={formatDate(assignment.created_at)}
                  />
                  <DetailRow
                    icon={Calendar}
                    label="Uppdaterad"
                    value={formatDate(assignment.updated_at)}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Documents tab */}
        <TabsContent value="documents">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ladda upp dokument</CardTitle>
                <CardDescription>
                  Dra och släpp PDF:er eller bilder (mäklarbild, årsredovisning, stadgar m.m.)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UploadDropzone
                  assignmentId={assignment.id}
                  tenantId={tenantId}
                  userId={userId}
                  onUploadComplete={fetchDocuments}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Dokument
                  {documents.length > 0 && (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      ({documents.length})
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingDocs ? (
                  <LoadingSpinner text="Laddar dokument..." />
                ) : (
                  <DocumentList
                    documents={documents}
                    tenantId={tenantId}
                    userId={userId}
                    onDocumentDeleted={fetchDocuments}
                    onPreview={(doc) => {
                      setPreviewDoc(doc);
                      setPreviewOpen(true);
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          <DocumentPreview
            document={previewDoc}
            open={previewOpen}
            onOpenChange={setPreviewOpen}
          />
        </TabsContent>

        {/* Data tab */}
        <TabsContent value="data">
          <ExtractionReview
            assignmentId={assignment.id}
            tenantId={tenantId}
            userId={userId}
            documents={documents}
            onDataConfirmed={() => {
              fetchAssignment();
            }}
          />
        </TabsContent>

        {/* Drafts tab */}
        <TabsContent value="drafts">
          <GenerationsPanel
            assignmentId={assignment.id}
            tenantId={tenantId}
            userId={userId}
          />
        </TabsContent>

        {/* Transaction tab */}
        {(assignment.status === "under_contract" ||
          assignment.status === "closed") && (
          <TabsContent value="transaction">
            <ContractPanel
              assignmentId={assignment.id}
              tenantId={tenantId}
              userId={userId}
              documents={documents}
              onAssignmentUpdated={() => {
                fetchAssignment();
                fetchTasks();
              }}
            />
          </TabsContent>
        )}

        {/* Tasks tab */}
        <TabsContent value="tasks">
          <TaskList
            assignmentId={assignment.id}
            tenantId={tenantId}
            userId={userId}
          />
        </TabsContent>
      </Tabs>

      {/* Timeline */}
      <AssignmentTimeline assignmentId={assignment.id} />
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">{label}:</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
