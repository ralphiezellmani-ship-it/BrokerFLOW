"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import {
  assignmentFormSchema,
  type AssignmentFormData,
} from "@/lib/utils/validation";
import { PROPERTY_TYPES, PROPERTY_TYPE_LABELS } from "@/types/assignment";
import { AlertCircle } from "lucide-react";

interface AssignmentFormProps {
  userId: string;
  tenantId: string;
}

export function AssignmentForm({ userId, tenantId }: AssignmentFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Record<string, string | undefined>
  >({});

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const formData = new FormData(e.currentTarget);
    const raw: Record<string, unknown> = {};
    formData.forEach((val, key) => {
      raw[key] = val === "" ? undefined : val;
    });

    const result = assignmentFormSchema.safeParse(raw);
    if (!result.success) {
      const errors: Record<string, string | undefined> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        errors[field] = issue.message;
      });
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    const data = result.data;

    const supabase = createClient();
    const { data: assignment, error: insertError } = await supabase
      .from("assignments")
      .insert({
        tenant_id: tenantId,
        created_by: userId,
        assigned_to: userId,
        status: "draft",
        address: data.address,
        city: data.city,
        postal_code: data.postal_code || null,
        property_type: data.property_type,
        rooms: data.rooms ? Number(data.rooms) : null,
        living_area_sqm: data.living_area_sqm
          ? Number(data.living_area_sqm)
          : null,
        floor: data.floor ? Number(data.floor) : null,
        build_year: data.build_year ? Number(data.build_year) : null,
        monthly_fee: data.monthly_fee ? Number(data.monthly_fee) : null,
        asking_price: data.asking_price ? Number(data.asking_price) : null,
        seller_name: data.seller_name || null,
        seller_email: data.seller_email || null,
        seller_phone: data.seller_phone || null,
        association_name: data.association_name || null,
        association_org_number: data.association_org_number || null,
      })
      .select("id")
      .single();

    if (insertError) {
      setError("Kunde inte skapa uppdrag: " + insertError.message);
      setLoading(false);
      return;
    }

    // Audit log
    await supabase.from("audit_logs").insert({
      tenant_id: tenantId,
      actor_user_id: userId,
      action: "assignment.created",
      entity_type: "assignment",
      entity_id: assignment.id,
      metadata_json: { address: data.address, city: data.city },
    });

    router.push(`/assignments/${assignment.id}`);
    router.refresh();
  }

  function fieldError(name: string) {
    return fieldErrors[name] ? (
      <p className="text-xs text-destructive">{fieldErrors[name]}</p>
    ) : null;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Address section */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Adress
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address">Gatuadress *</Label>
            <Input
              id="address"
              name="address"
              placeholder="Storgatan 12, lgh 1102"
              required
              disabled={loading}
            />
            {fieldError("address")}
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">Stad *</Label>
            <Input
              id="city"
              name="city"
              placeholder="Stockholm"
              required
              disabled={loading}
            />
            {fieldError("city")}
          </div>
          <div className="space-y-2">
            <Label htmlFor="postal_code">Postnummer</Label>
            <Input
              id="postal_code"
              name="postal_code"
              placeholder="114 56"
              disabled={loading}
            />
            {fieldError("postal_code")}
          </div>
        </div>
      </div>

      <Separator />

      {/* Property details */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Objektdetaljer
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="property_type">Bostadstyp *</Label>
            <Select
              id="property_type"
              name="property_type"
              required
              disabled={loading}
              defaultValue=""
            >
              <option value="" disabled>
                Välj typ...
              </option>
              {PROPERTY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {PROPERTY_TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
            {fieldError("property_type")}
          </div>
          <div className="space-y-2">
            <Label htmlFor="rooms">Antal rum</Label>
            <Input
              id="rooms"
              name="rooms"
              type="number"
              step="0.5"
              min="1"
              placeholder="3"
              disabled={loading}
            />
            {fieldError("rooms")}
          </div>
          <div className="space-y-2">
            <Label htmlFor="living_area_sqm">Boyta (m²)</Label>
            <Input
              id="living_area_sqm"
              name="living_area_sqm"
              type="number"
              min="1"
              placeholder="72"
              disabled={loading}
            />
            {fieldError("living_area_sqm")}
          </div>
          <div className="space-y-2">
            <Label htmlFor="floor">Våning</Label>
            <Input
              id="floor"
              name="floor"
              type="number"
              placeholder="3"
              disabled={loading}
            />
            {fieldError("floor")}
          </div>
          <div className="space-y-2">
            <Label htmlFor="build_year">Byggår</Label>
            <Input
              id="build_year"
              name="build_year"
              type="number"
              placeholder="1925"
              disabled={loading}
            />
            {fieldError("build_year")}
          </div>
          <div className="space-y-2">
            <Label htmlFor="monthly_fee">Månadsavgift (kr)</Label>
            <Input
              id="monthly_fee"
              name="monthly_fee"
              type="number"
              min="0"
              placeholder="3 500"
              disabled={loading}
            />
            {fieldError("monthly_fee")}
          </div>
        </div>
      </div>

      <Separator />

      {/* Price */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Pris
        </h3>
        <div className="max-w-xs space-y-2">
          <Label htmlFor="asking_price">Utgångspris (kr)</Label>
          <Input
            id="asking_price"
            name="asking_price"
            type="number"
            min="0"
            placeholder="2 450 000"
            disabled={loading}
          />
          {fieldError("asking_price")}
        </div>
      </div>

      <Separator />

      {/* Seller info */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Säljare (valfritt)
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="seller_name">Namn</Label>
            <Input
              id="seller_name"
              name="seller_name"
              placeholder="Anna Svensson"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="seller_email">E-post</Label>
            <Input
              id="seller_email"
              name="seller_email"
              type="email"
              placeholder="anna@example.com"
              disabled={loading}
            />
            {fieldError("seller_email")}
          </div>
          <div className="space-y-2">
            <Label htmlFor="seller_phone">Telefon</Label>
            <Input
              id="seller_phone"
              name="seller_phone"
              placeholder="070-123 45 67"
              disabled={loading}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Association */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Förening (BRF)
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="association_name">Föreningsnamn</Label>
            <Input
              id="association_name"
              name="association_name"
              placeholder="BRF Sjöstaden"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="association_org_number">Org-nummer</Label>
            <Input
              id="association_org_number"
              name="association_org_number"
              placeholder="769612-3456"
              disabled={loading}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? (
            <LoadingSpinner size="sm" text="Skapar uppdrag..." />
          ) : (
            "Skapa uppdrag"
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          Avbryt
        </Button>
      </div>
    </form>
  );
}
