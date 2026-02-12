import type { Database } from "./database";

export type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
export type TransactionInsert =
  Database["public"]["Tables"]["transactions"]["Insert"];
export type TransactionUpdate =
  Database["public"]["Tables"]["transactions"]["Update"];

export type TransactionStatus = Transaction["status"];

export const TRANSACTION_STATUS_LABELS: Record<TransactionStatus, string> = {
  pending: "Väntar",
  contract_signed: "Kontrakt signerat",
  deposit_paid: "Handpenning betald",
  brf_approved: "BRF godkänd",
  access_scheduled: "Tillträde bokat",
  completed: "Slutförd",
};

export const TRANSACTION_STATUS_ORDER: TransactionStatus[] = [
  "pending",
  "contract_signed",
  "deposit_paid",
  "brf_approved",
  "access_scheduled",
  "completed",
];
