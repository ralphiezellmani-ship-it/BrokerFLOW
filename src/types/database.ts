export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          name: string;
          slug: string | null;
          subscription_plan: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          retention_raw_days: number;
          retention_derived_days: number;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          slug?: string | null;
          subscription_plan?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          retention_raw_days?: number;
          retention_derived_days?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string | null;
          subscription_plan?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          retention_raw_days?: number;
          retention_derived_days?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          tenant_id: string;
          role: "admin" | "agent";
          full_name: string;
          email: string;
          phone: string | null;
          bankid_subject: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          tenant_id: string;
          role?: "admin" | "agent";
          full_name: string;
          email: string;
          phone?: string | null;
          bankid_subject?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          role?: "admin" | "agent";
          full_name?: string;
          email?: string;
          phone?: string | null;
          bankid_subject?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "users_tenant_id_fkey";
            columns: ["tenant_id"];
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      assignments: {
        Row: {
          id: string;
          tenant_id: string;
          created_by: string;
          assigned_to: string | null;
          status: "draft" | "active" | "under_contract" | "closed";
          address: string;
          city: string;
          postal_code: string | null;
          property_type:
            | "bostadsratt"
            | "villa"
            | "radhus"
            | "fritidshus"
            | "tomt"
            | "ovrigt";
          rooms: number | null;
          living_area_sqm: number | null;
          floor: number | null;
          total_floors: number | null;
          build_year: number | null;
          monthly_fee: number | null;
          asking_price: number | null;
          seller_name: string | null;
          seller_email: string | null;
          seller_phone: string | null;
          association_name: string | null;
          association_org_number: string | null;
          association_contact_email: string | null;
          confirmed_property_data: Json | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          created_by: string;
          assigned_to?: string | null;
          status?: "draft" | "active" | "under_contract" | "closed";
          address: string;
          city: string;
          postal_code?: string | null;
          property_type:
            | "bostadsratt"
            | "villa"
            | "radhus"
            | "fritidshus"
            | "tomt"
            | "ovrigt";
          rooms?: number | null;
          living_area_sqm?: number | null;
          floor?: number | null;
          total_floors?: number | null;
          build_year?: number | null;
          monthly_fee?: number | null;
          asking_price?: number | null;
          seller_name?: string | null;
          seller_email?: string | null;
          seller_phone?: string | null;
          association_name?: string | null;
          association_org_number?: string | null;
          association_contact_email?: string | null;
          confirmed_property_data?: Json | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          created_by?: string;
          assigned_to?: string | null;
          status?: "draft" | "active" | "under_contract" | "closed";
          address?: string;
          city?: string;
          postal_code?: string | null;
          property_type?:
            | "bostadsratt"
            | "villa"
            | "radhus"
            | "fritidshus"
            | "tomt"
            | "ovrigt";
          rooms?: number | null;
          living_area_sqm?: number | null;
          floor?: number | null;
          total_floors?: number | null;
          build_year?: number | null;
          monthly_fee?: number | null;
          asking_price?: number | null;
          seller_name?: string | null;
          seller_email?: string | null;
          seller_phone?: string | null;
          association_name?: string | null;
          association_org_number?: string | null;
          association_contact_email?: string | null;
          confirmed_property_data?: Json | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "assignments_tenant_id_fkey";
            columns: ["tenant_id"];
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assignments_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assignments_assigned_to_fkey";
            columns: ["assigned_to"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      documents: {
        Row: {
          id: string;
          tenant_id: string;
          assignment_id: string | null;
          filename: string;
          storage_path: string;
          file_size_bytes: number | null;
          mime_type: string | null;
          doc_type:
            | "maklarbild"
            | "arsredovisning"
            | "stadgar"
            | "kontrakt"
            | "planritning"
            | "energideklaration"
            | "ovrigt";
          doc_type_confidence: number | null;
          source: "upload" | "email";
          source_email_from: string | null;
          source_email_subject: string | null;
          processing_status:
            | "uploaded"
            | "processing"
            | "extracted"
            | "error";
          processing_error: string | null;
          created_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          assignment_id?: string | null;
          filename: string;
          storage_path: string;
          file_size_bytes?: number | null;
          mime_type?: string | null;
          doc_type?:
            | "maklarbild"
            | "arsredovisning"
            | "stadgar"
            | "kontrakt"
            | "planritning"
            | "energideklaration"
            | "ovrigt";
          doc_type_confidence?: number | null;
          source?: "upload" | "email";
          source_email_from?: string | null;
          source_email_subject?: string | null;
          processing_status?:
            | "uploaded"
            | "processing"
            | "extracted"
            | "error";
          processing_error?: string | null;
          created_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          assignment_id?: string | null;
          filename?: string;
          storage_path?: string;
          file_size_bytes?: number | null;
          mime_type?: string | null;
          doc_type?:
            | "maklarbild"
            | "arsredovisning"
            | "stadgar"
            | "kontrakt"
            | "planritning"
            | "energideklaration"
            | "ovrigt";
          doc_type_confidence?: number | null;
          source?: "upload" | "email";
          source_email_from?: string | null;
          source_email_subject?: string | null;
          processing_status?:
            | "uploaded"
            | "processing"
            | "extracted"
            | "error";
          processing_error?: string | null;
          created_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "documents_tenant_id_fkey";
            columns: ["tenant_id"];
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_assignment_id_fkey";
            columns: ["assignment_id"];
            referencedRelation: "assignments";
            referencedColumns: ["id"];
          },
        ];
      };
      extractions: {
        Row: {
          id: string;
          tenant_id: string;
          assignment_id: string;
          document_id: string;
          schema_version: string;
          llm_provider: string | null;
          llm_model: string | null;
          prompt_version: string | null;
          extracted_json: Json;
          confidence_json: Json | null;
          source_references: Json | null;
          status: "processing" | "completed" | "failed" | "superseded";
          processing_time_ms: number | null;
          token_count: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          assignment_id: string;
          document_id: string;
          schema_version?: string;
          llm_provider?: string | null;
          llm_model?: string | null;
          prompt_version?: string | null;
          extracted_json: Json;
          confidence_json?: Json | null;
          source_references?: Json | null;
          status?: "processing" | "completed" | "failed" | "superseded";
          processing_time_ms?: number | null;
          token_count?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          assignment_id?: string;
          document_id?: string;
          schema_version?: string;
          llm_provider?: string | null;
          llm_model?: string | null;
          prompt_version?: string | null;
          extracted_json?: Json;
          confidence_json?: Json | null;
          source_references?: Json | null;
          status?: "processing" | "completed" | "failed" | "superseded";
          processing_time_ms?: number | null;
          token_count?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "extractions_tenant_id_fkey";
            columns: ["tenant_id"];
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "extractions_assignment_id_fkey";
            columns: ["assignment_id"];
            referencedRelation: "assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "extractions_document_id_fkey";
            columns: ["document_id"];
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
        ];
      };
      generations: {
        Row: {
          id: string;
          tenant_id: string;
          assignment_id: string;
          type:
            | "ad_copy"
            | "email_brf"
            | "email_buyer"
            | "email_seller"
            | "email_bank"
            | "settlement_draft"
            | "brf_application"
            | "access_request"
            | "checklist";
          prompt_version: string | null;
          llm_provider: string | null;
          llm_model: string | null;
          output_text: string;
          output_metadata: Json | null;
          is_approved: boolean;
          approved_by: string | null;
          approved_at: string | null;
          edited_text: string | null;
          tone: string;
          input_data_snapshot: Json | null;
          token_count: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          assignment_id: string;
          type:
            | "ad_copy"
            | "email_brf"
            | "email_buyer"
            | "email_seller"
            | "email_bank"
            | "settlement_draft"
            | "brf_application"
            | "access_request"
            | "checklist";
          prompt_version?: string | null;
          llm_provider?: string | null;
          llm_model?: string | null;
          output_text: string;
          output_metadata?: Json | null;
          is_approved?: boolean;
          approved_by?: string | null;
          approved_at?: string | null;
          edited_text?: string | null;
          tone?: string;
          input_data_snapshot?: Json | null;
          token_count?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          assignment_id?: string;
          type?:
            | "ad_copy"
            | "email_brf"
            | "email_buyer"
            | "email_seller"
            | "email_bank"
            | "settlement_draft"
            | "brf_application"
            | "access_request"
            | "checklist";
          prompt_version?: string | null;
          llm_provider?: string | null;
          llm_model?: string | null;
          output_text?: string;
          output_metadata?: Json | null;
          is_approved?: boolean;
          approved_by?: string | null;
          approved_at?: string | null;
          edited_text?: string | null;
          tone?: string;
          input_data_snapshot?: Json | null;
          token_count?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "generations_tenant_id_fkey";
            columns: ["tenant_id"];
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "generations_assignment_id_fkey";
            columns: ["assignment_id"];
            referencedRelation: "assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "generations_approved_by_fkey";
            columns: ["approved_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      transactions: {
        Row: {
          id: string;
          tenant_id: string;
          assignment_id: string;
          buyer_name: string | null;
          buyer_email: string | null;
          buyer_phone: string | null;
          buyer_personal_number_hash: string | null;
          seller_name: string | null;
          seller_email: string | null;
          sale_price: number | null;
          deposit_amount: number | null;
          deposit_due_date: string | null;
          contract_date: string | null;
          access_date: string | null;
          settlement_data: Json | null;
          status:
            | "pending"
            | "contract_signed"
            | "deposit_paid"
            | "brf_approved"
            | "access_scheduled"
            | "completed";
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          assignment_id: string;
          buyer_name?: string | null;
          buyer_email?: string | null;
          buyer_phone?: string | null;
          buyer_personal_number_hash?: string | null;
          seller_name?: string | null;
          seller_email?: string | null;
          sale_price?: number | null;
          deposit_amount?: number | null;
          deposit_due_date?: string | null;
          contract_date?: string | null;
          access_date?: string | null;
          settlement_data?: Json | null;
          status?:
            | "pending"
            | "contract_signed"
            | "deposit_paid"
            | "brf_approved"
            | "access_scheduled"
            | "completed";
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          assignment_id?: string;
          buyer_name?: string | null;
          buyer_email?: string | null;
          buyer_phone?: string | null;
          buyer_personal_number_hash?: string | null;
          seller_name?: string | null;
          seller_email?: string | null;
          sale_price?: number | null;
          deposit_amount?: number | null;
          deposit_due_date?: string | null;
          contract_date?: string | null;
          access_date?: string | null;
          settlement_data?: Json | null;
          status?:
            | "pending"
            | "contract_signed"
            | "deposit_paid"
            | "brf_approved"
            | "access_scheduled"
            | "completed";
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_tenant_id_fkey";
            columns: ["tenant_id"];
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_assignment_id_fkey";
            columns: ["assignment_id"];
            referencedRelation: "assignments";
            referencedColumns: ["id"];
          },
        ];
      };
      tasks: {
        Row: {
          id: string;
          tenant_id: string;
          assignment_id: string;
          title: string;
          description: string | null;
          category: string | null;
          status: "todo" | "in_progress" | "done" | "skipped";
          assigned_to: string | null;
          due_date: string | null;
          sort_order: number;
          is_auto_generated: boolean;
          trigger_status: string | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          assignment_id: string;
          title: string;
          description?: string | null;
          category?: string | null;
          status?: "todo" | "in_progress" | "done" | "skipped";
          assigned_to?: string | null;
          due_date?: string | null;
          sort_order?: number;
          is_auto_generated?: boolean;
          trigger_status?: string | null;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          assignment_id?: string;
          title?: string;
          description?: string | null;
          category?: string | null;
          status?: "todo" | "in_progress" | "done" | "skipped";
          assigned_to?: string | null;
          due_date?: string | null;
          sort_order?: number;
          is_auto_generated?: boolean;
          trigger_status?: string | null;
          completed_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_tenant_id_fkey";
            columns: ["tenant_id"];
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_assignment_id_fkey";
            columns: ["assignment_id"];
            referencedRelation: "assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_assigned_to_fkey";
            columns: ["assigned_to"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      email_logs: {
        Row: {
          id: string;
          tenant_id: string;
          assignment_id: string | null;
          generation_id: string | null;
          recipient_email: string;
          recipient_name: string | null;
          subject: string;
          body_preview: string | null;
          template_name: string | null;
          status:
            | "draft"
            | "queued"
            | "sent"
            | "delivered"
            | "failed"
            | "bounced";
          sent_at: string | null;
          resend_message_id: string | null;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          assignment_id?: string | null;
          generation_id?: string | null;
          recipient_email: string;
          recipient_name?: string | null;
          subject: string;
          body_preview?: string | null;
          template_name?: string | null;
          status?:
            | "draft"
            | "queued"
            | "sent"
            | "delivered"
            | "failed"
            | "bounced";
          sent_at?: string | null;
          resend_message_id?: string | null;
          error_message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          assignment_id?: string | null;
          generation_id?: string | null;
          recipient_email?: string;
          recipient_name?: string | null;
          subject?: string;
          body_preview?: string | null;
          template_name?: string | null;
          status?:
            | "draft"
            | "queued"
            | "sent"
            | "delivered"
            | "failed"
            | "bounced";
          sent_at?: string | null;
          resend_message_id?: string | null;
          error_message?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "email_logs_tenant_id_fkey";
            columns: ["tenant_id"];
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "email_logs_assignment_id_fkey";
            columns: ["assignment_id"];
            referencedRelation: "assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "email_logs_generation_id_fkey";
            columns: ["generation_id"];
            referencedRelation: "generations";
            referencedColumns: ["id"];
          },
        ];
      };
      inbound_aliases: {
        Row: {
          id: string;
          tenant_id: string;
          email_alias: string;
          secret_token: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          email_alias: string;
          secret_token: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          email_alias?: string;
          secret_token?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inbound_aliases_tenant_id_fkey";
            columns: ["tenant_id"];
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          id: string;
          tenant_id: string;
          actor_user_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          metadata_json: Json | null;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          actor_user_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          metadata_json?: Json | null;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          actor_user_id?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          metadata_json?: Json | null;
          ip_address?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey";
            columns: ["tenant_id"];
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_logs_actor_user_id_fkey";
            columns: ["actor_user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      tenant_preferences: {
        Row: {
          id: string;
          tenant_id: string;
          default_tone: string;
          default_llm_provider: string;
          email_signature: string | null;
          default_brf_email_template: string | null;
          logo_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          default_tone?: string;
          default_llm_provider?: string;
          email_signature?: string | null;
          default_brf_email_template?: string | null;
          logo_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          default_tone?: string;
          default_llm_provider?: string;
          email_signature?: string | null;
          default_brf_email_template?: string | null;
          logo_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tenant_preferences_tenant_id_fkey";
            columns: ["tenant_id"];
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      tenant_id: {
        Args: Record<string, never>;
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
