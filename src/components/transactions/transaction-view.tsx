"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TransactionStatusStepper } from "./transaction-status-stepper";
import {
  TRANSACTION_STATUS_LABELS,
  TRANSACTION_STATUS_ORDER,
  type Transaction,
  type TransactionStatus,
} from "@/types/transaction";
import { formatPrice, formatDate } from "@/lib/utils/formatting";
import {
  User,
  Mail,
  Phone,
  Calendar,
  Tag,
  ArrowRight,
} from "lucide-react";

interface TransactionViewProps {
  transaction: Transaction;
  tenantId: string;
  userId: string;
  onUpdated: () => void;
}

export function TransactionView({
  transaction,
  tenantId,
  userId,
  onUpdated,
}: TransactionViewProps) {
  const [updating, setUpdating] = useState(false);

  const currentIndex = TRANSACTION_STATUS_ORDER.indexOf(
    transaction.status as TransactionStatus,
  );
  const nextStatus =
    currentIndex < TRANSACTION_STATUS_ORDER.length - 1
      ? TRANSACTION_STATUS_ORDER[currentIndex + 1]
      : null;

  async function handleAdvanceStatus() {
    if (!nextStatus) return;
    setUpdating(true);
    const supabase = createClient();

    await supabase
      .from("transactions")
      .update({ status: nextStatus })
      .eq("id", transaction.id);

    await supabase.from("audit_logs").insert({
      tenant_id: tenantId,
      actor_user_id: userId,
      action: "transaction.status_changed",
      entity_type: "transaction",
      entity_id: transaction.id,
      metadata_json: {
        old_status: transaction.status,
        new_status: nextStatus,
      },
    });

    setUpdating(false);
    onUpdated();
  }

  return (
    <div className="space-y-4">
      {/* Status stepper */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base">Transaktionsstatus</CardTitle>
              <CardDescription>
                Aktuell status:{" "}
                {TRANSACTION_STATUS_LABELS[transaction.status as TransactionStatus]}
              </CardDescription>
            </div>
            {nextStatus && (
              <Button
                size="sm"
                onClick={handleAdvanceStatus}
                disabled={updating}
              >
                <ArrowRight className="mr-1 h-4 w-4" />
                {TRANSACTION_STATUS_LABELS[nextStatus]}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <TransactionStatusStepper
            currentStatus={transaction.status as TransactionStatus}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Buyer info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Köpare</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow
              icon={User}
              label="Namn"
              value={transaction.buyer_name || "–"}
            />
            <DetailRow
              icon={Mail}
              label="E-post"
              value={transaction.buyer_email || "–"}
            />
            <DetailRow
              icon={Phone}
              label="Telefon"
              value={transaction.buyer_phone || "–"}
            />
          </CardContent>
        </Card>

        {/* Seller info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Säljare</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow
              icon={User}
              label="Namn"
              value={transaction.seller_name || "–"}
            />
            <DetailRow
              icon={Mail}
              label="E-post"
              value={transaction.seller_email || "–"}
            />
          </CardContent>
        </Card>

        {/* Financial info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ekonomi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow
              icon={Tag}
              label="Köpeskilling"
              value={formatPrice(transaction.sale_price)}
            />
            <DetailRow
              icon={Tag}
              label="Handpenning"
              value={formatPrice(transaction.deposit_amount)}
            />
            {transaction.sale_price && transaction.deposit_amount && (
              <DetailRow
                icon={Tag}
                label="Kvar vid tillträde"
                value={formatPrice(
                  transaction.sale_price - transaction.deposit_amount,
                )}
              />
            )}
            {transaction.deposit_due_date && (
              <DetailRow
                icon={Calendar}
                label="Handpenning senast"
                value={formatDate(transaction.deposit_due_date)}
              />
            )}
          </CardContent>
        </Card>

        {/* Dates */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Datum</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow
              icon={Calendar}
              label="Kontraktsdatum"
              value={formatDate(transaction.contract_date)}
            />
            <DetailRow
              icon={Calendar}
              label="Tillträdesdag"
              value={formatDate(transaction.access_date)}
            />
            <DetailRow
              icon={Calendar}
              label="Skapad"
              value={formatDate(transaction.created_at)}
            />
          </CardContent>
        </Card>
      </div>

      {transaction.status === "completed" && (
        <Badge className="bg-green-100 text-green-700 border-green-200">
          Transaktionen är slutförd
        </Badge>
      )}
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
