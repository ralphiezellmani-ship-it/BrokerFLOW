"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Assignment } from "@/types/assignment";
import type { Database } from "@/types/database";

type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];

interface UseAssignmentResult {
  assignment: Assignment | null;
  tasks: TaskRow[];
  loading: boolean;
  refetch: () => Promise<void>;
}

export function useAssignment(assignmentId: string): UseAssignmentResult {
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const supabase = createClient();

    const [assignmentRes, tasksRes] = await Promise.all([
      supabase
        .from("assignments")
        .select("*")
        .eq("id", assignmentId)
        .single(),
      supabase
        .from("tasks")
        .select("*")
        .eq("assignment_id", assignmentId)
        .order("sort_order", { ascending: true }),
    ]);

    setAssignment(assignmentRes.data);
    setTasks(tasksRes.data || []);
    setLoading(false);
  }, [assignmentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    assignment,
    tasks,
    loading,
    refetch: fetchData,
  };
}
