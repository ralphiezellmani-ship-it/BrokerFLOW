"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

type UserRow = Database["public"]["Tables"]["users"]["Row"];
type TenantRow = Database["public"]["Tables"]["tenants"]["Row"];

interface TenantContext {
  user: UserRow | null;
  tenant: TenantRow | null;
  loading: boolean;
  isAdmin: boolean;
  refetch: () => Promise<void>;
}

export function useTenant(): TenantContext {
  const [user, setUser] = useState<UserRow | null>(null);
  const [tenant, setTenant] = useState<TenantRow | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    const supabase = createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      setUser(null);
      setTenant(null);
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("users")
      .select("*")
      .eq("id", authUser.id)
      .single();

    if (!profile) {
      setUser(null);
      setTenant(null);
      setLoading(false);
      return;
    }

    setUser(profile);

    const { data: tenantData } = await supabase
      .from("tenants")
      .select("*")
      .eq("id", profile.tenant_id)
      .single();

    setTenant(tenantData);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, []);

  return {
    user,
    tenant,
    loading,
    isAdmin: user?.role === "admin",
    refetch: fetchData,
  };
}
