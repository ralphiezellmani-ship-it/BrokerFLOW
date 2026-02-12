import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type UserRow = Database["public"]["Tables"]["users"]["Row"];

export async function getCurrentUser(): Promise<{
  authUser: { id: string; email: string };
  profile: UserRow;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  return {
    authUser: { id: user.id, email: user.email! },
    profile,
  };
}

export async function requireAuth(): Promise<{
  authUser: { id: string; email: string };
  profile: UserRow;
}> {
  const result = await getCurrentUser();
  if (!result) {
    throw new Error("Unauthorized");
  }
  return result;
}

export async function requireAdmin(): Promise<{
  authUser: { id: string; email: string };
  profile: UserRow;
}> {
  const result = await requireAuth();
  if (result.profile.role !== "admin") {
    throw new Error("Forbidden: Admin role required");
  }
  return result;
}
