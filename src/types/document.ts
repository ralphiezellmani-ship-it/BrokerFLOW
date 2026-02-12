import type { Database } from "./database";

export type Document = Database["public"]["Tables"]["documents"]["Row"];
export type DocumentInsert =
  Database["public"]["Tables"]["documents"]["Insert"];
export type DocumentUpdate =
  Database["public"]["Tables"]["documents"]["Update"];

export type DocType = Document["doc_type"];
export type DocumentSource = Document["source"];
export type ProcessingStatus = Document["processing_status"];

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  maklarbild: "Mäklarbild",
  arsredovisning: "Årsredovisning",
  stadgar: "Stadgar",
  kontrakt: "Kontrakt",
  planritning: "Planritning",
  energideklaration: "Energideklaration",
  ovrigt: "Övrigt",
};

export const PROCESSING_STATUS_LABELS: Record<ProcessingStatus, string> = {
  uploaded: "Uppladdad",
  processing: "Bearbetar",
  extracted: "Extraherad",
  error: "Fel",
};
