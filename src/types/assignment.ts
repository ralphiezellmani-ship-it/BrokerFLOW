import type { Database } from "./database";

export type Assignment =
  Database["public"]["Tables"]["assignments"]["Row"];
export type AssignmentInsert =
  Database["public"]["Tables"]["assignments"]["Insert"];
export type AssignmentUpdate =
  Database["public"]["Tables"]["assignments"]["Update"];

export type AssignmentStatus = Assignment["status"];
export type PropertyType = Assignment["property_type"];

export const ASSIGNMENT_STATUSES: AssignmentStatus[] = [
  "draft",
  "active",
  "under_contract",
  "closed",
];

export const PROPERTY_TYPES: PropertyType[] = [
  "bostadsratt",
  "villa",
  "radhus",
  "fritidshus",
  "tomt",
  "ovrigt",
];

export const STATUS_LABELS: Record<AssignmentStatus, string> = {
  draft: "Utkast",
  active: "Aktivt",
  under_contract: "Under kontrakt",
  closed: "Avslutat",
};

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  bostadsratt: "Bostadsrätt",
  villa: "Villa",
  radhus: "Radhus",
  fritidshus: "Fritidshus",
  tomt: "Tomt",
  ovrigt: "Övrigt",
};
