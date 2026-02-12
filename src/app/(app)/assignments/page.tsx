"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { AssignmentCard } from "@/components/assignments/assignment-card";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ASSIGNMENT_STATUSES,
  STATUS_LABELS,
  type AssignmentStatus,
  type Assignment,
} from "@/types/assignment";
import { Plus, Search, FileText } from "lucide-react";

const PAGE_SIZE = 20;

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AssignmentStatus | "all">(
    "all",
  );
  const [sortBy, setSortBy] = useState<"updated_at" | "created_at" | "address">(
    "updated_at",
  );
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    let query = supabase
      .from("assignments")
      .select("*", { count: "exact" })
      .is("deleted_at", null);

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    if (search.trim()) {
      query = query.or(
        `address.ilike.%${search}%,city.ilike.%${search}%,seller_name.ilike.%${search}%`,
      );
    }

    if (sortBy === "address") {
      query = query.order("address", { ascending: true });
    } else {
      query = query.order(sortBy, { ascending: false });
    }

    query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    const { data, count } = await query;

    setAssignments(data || []);
    setTotalCount(count || 0);
    setLoading(false);
  }, [search, statusFilter, sortBy, page]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  useEffect(() => {
    setPage(0);
  }, [search, statusFilter, sortBy]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Uppdrag</h1>
          <p className="text-muted-foreground">
            {totalCount}{" "}
            {totalCount === 1 ? "förmedlingsuppdrag" : "förmedlingsuppdrag"}
          </p>
        </div>
        <Link href="/assignments/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nytt uppdrag
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Sök adress, stad eller säljare..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as AssignmentStatus | "all")
          }
          className="w-full sm:w-44"
        >
          <option value="all">Alla statusar</option>
          {ASSIGNMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
        <Select
          value={sortBy}
          onChange={(e) =>
            setSortBy(
              e.target.value as "updated_at" | "created_at" | "address",
            )
          }
          className="w-full sm:w-44"
        >
          <option value="updated_at">Senast uppdaterad</option>
          <option value="created_at">Senast skapad</option>
          <option value="address">Adress A-Ö</option>
        </Select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner text="Laddar uppdrag..." />
        </div>
      ) : assignments.length === 0 ? (
        <Card>
          <CardHeader className="items-center text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle>Inga uppdrag hittades</CardTitle>
            <CardDescription>
              {search || statusFilter !== "all"
                ? "Prova att ändra din sökning eller dina filter."
                : "Skapa ditt första förmedlingsuppdrag för att komma igång."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {assignments.map((assignment) => (
              <AssignmentCard key={assignment.id} assignment={assignment} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                Föregående
              </Button>
              <span className="text-sm text-muted-foreground">
                Sida {page + 1} av {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Nästa
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
