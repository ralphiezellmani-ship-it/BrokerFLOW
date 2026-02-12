"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { useTenant } from "@/hooks/use-tenant";
import {
  AlertCircle,
  CheckCircle2,
  Mail,
  Shield,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import type { Database } from "@/types/database";

type UserRow = Database["public"]["Tables"]["users"]["Row"];

export default function TeamPage() {
  const { user, tenant, loading: tenantLoading, isAdmin } = useTenant();
  const [members, setMembers] = useState<UserRow[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  // Invite form state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "agent">("agent");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  // Role change state
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    if (!tenant) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: true });
    setMembers(data || []);
    setLoadingMembers(false);
  }, [tenant]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!tenant || !user) return;

    setInviteError(null);
    setInviteSuccess(false);
    setInviting(true);

    try {
      const response = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          fullName: inviteName,
          role: inviteRole,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setInviteError(data.error || "Kunde inte skicka inbjudan.");
        setInviting(false);
        return;
      }

      setInviteSuccess(true);
      setInviteEmail("");
      setInviteName("");
      setInviteRole("agent");
      await fetchMembers();

      setTimeout(() => {
        setInviteOpen(false);
        setInviteSuccess(false);
      }, 2000);
    } catch {
      setInviteError("Ett oväntat fel uppstod.");
    }

    setInviting(false);
  }

  async function handleRoleChange(
    memberId: string,
    newRole: "admin" | "agent",
  ) {
    if (!tenant || !user || !isAdmin) return;
    if (memberId === user.id) return; // Can't change own role

    setChangingRole(memberId);
    setRoleError(null);

    const supabase = createClient();
    const { error } = await supabase
      .from("users")
      .update({ role: newRole })
      .eq("id", memberId)
      .eq("tenant_id", tenant.id);

    if (error) {
      setRoleError("Kunde inte ändra roll: " + error.message);
    } else {
      await supabase.from("audit_logs").insert({
        tenant_id: tenant.id,
        actor_user_id: user.id,
        action: "user.role_changed",
        entity_type: "user",
        entity_id: memberId,
        metadata_json: { new_role: newRole },
      });
      await fetchMembers();
    }

    setChangingRole(null);
  }

  if (tenantLoading || loadingMembers) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner text="Laddar team..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team</h1>
          <p className="text-muted-foreground">
            Hantera teammedlemmar och behörigheter
          </p>
        </div>
        {isAdmin && (
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Bjud in medlem
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleInvite}>
                <DialogHeader>
                  <DialogTitle>Bjud in teammedlem</DialogTitle>
                  <DialogDescription>
                    Skicka en inbjudan via e-post. Den inbjudna personen kan
                    registrera sig och kopplas automatiskt till din organisation.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {inviteError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{inviteError}</AlertDescription>
                    </Alert>
                  )}
                  {inviteSuccess && (
                    <Alert>
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertDescription>
                        Inbjudan har skickats!
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="invite-name">Namn</Label>
                    <Input
                      id="invite-name"
                      placeholder="Anna Andersson"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      required
                      disabled={inviting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite-email">E-postadress</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="kollega@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                      disabled={inviting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite-role">Roll</Label>
                    <Select
                      id="invite-role"
                      value={inviteRole}
                      onChange={(e) =>
                        setInviteRole(e.target.value as "admin" | "agent")
                      }
                      disabled={inviting}
                    >
                      <option value="agent">Mäklare</option>
                      <option value="admin">Administratör</option>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Administratörer kan hantera team och inställningar.
                      Mäklare kan hantera uppdrag och dokument.
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={inviting}>
                    {inviting ? (
                      <LoadingSpinner size="sm" text="Skickar..." />
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Skicka inbjudan
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {roleError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{roleError}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Teammedlemmar</CardTitle>
          <CardDescription>
            {members.length}{" "}
            {members.length === 1 ? "medlem" : "medlemmar"} i organisationen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {members.map((member, index) => {
              const initials = member.full_name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);

              return (
                <div key={member.id}>
                  {index > 0 && <Separator className="mb-4" />}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{member.full_name}</p>
                          {member.id === user?.id && (
                            <Badge variant="outline" className="text-xs">
                              Du
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {member.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isAdmin && member.id !== user?.id ? (
                        <Select
                          value={member.role}
                          onChange={(e) =>
                            handleRoleChange(
                              member.id,
                              e.target.value as "admin" | "agent",
                            )
                          }
                          disabled={changingRole === member.id}
                        >
                          <option value="agent">Mäklare</option>
                          <option value="admin">Administratör</option>
                        </Select>
                      ) : (
                        <Badge
                          variant={
                            member.role === "admin" ? "default" : "secondary"
                          }
                        >
                          {member.role === "admin" ? (
                            <>
                              <ShieldCheck className="mr-1 h-3 w-3" />
                              Admin
                            </>
                          ) : (
                            <>
                              <Shield className="mr-1 h-3 w-3" />
                              Mäklare
                            </>
                          )}
                        </Badge>
                      )}
                      {changingRole === member.id && (
                        <LoadingSpinner size="sm" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
