-- ============================================================
-- BrokerFlow Initial Schema
-- Version: 1.0
-- ============================================================

-- ============================================================
-- TENANT & AUTH
-- ============================================================

CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  subscription_plan TEXT DEFAULT 'trial',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  -- GDPR: retention settings (days)
  retention_raw_days INTEGER DEFAULT 180,
  retention_derived_days INTEGER DEFAULT 365,
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  role TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('admin', 'agent')),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  -- Future BankID fields (not in MVP)
  bankid_subject TEXT,
  -- Metadata
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ASSIGNMENTS (Förmedlingsuppdrag)
-- ============================================================

CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  created_by UUID NOT NULL REFERENCES users(id),
  assigned_to UUID REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'under_contract', 'closed')),
  -- Property data
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  postal_code TEXT,
  property_type TEXT NOT NULL
    CHECK (property_type IN ('bostadsratt', 'villa', 'radhus', 'fritidshus', 'tomt', 'ovrigt')),
  rooms NUMERIC,
  living_area_sqm NUMERIC,
  floor INTEGER,
  total_floors INTEGER,
  build_year INTEGER,
  monthly_fee NUMERIC,
  asking_price NUMERIC,
  -- Seller (minimal PII, optional)
  seller_name TEXT,
  seller_email TEXT,
  seller_phone TEXT,
  -- Association (BRF)
  association_name TEXT,
  association_org_number TEXT,
  association_contact_email TEXT,
  -- AI-generated fields (confirmed by broker)
  confirmed_property_data JSONB,
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_assignments_tenant_status ON assignments(tenant_id, status);
CREATE INDEX idx_assignments_tenant_created ON assignments(tenant_id, created_at DESC);

-- ============================================================
-- DOCUMENTS
-- ============================================================

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  assignment_id UUID REFERENCES assignments(id),
  -- File info
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size_bytes INTEGER,
  mime_type TEXT,
  -- Classification
  doc_type TEXT DEFAULT 'ovrigt'
    CHECK (doc_type IN ('maklarbild', 'arsredovisning', 'stadgar', 'kontrakt',
                         'planritning', 'energideklaration', 'ovrigt')),
  doc_type_confidence NUMERIC,
  -- Source
  source TEXT NOT NULL DEFAULT 'upload'
    CHECK (source IN ('upload', 'email')),
  source_email_from TEXT,
  source_email_subject TEXT,
  -- Status
  processing_status TEXT DEFAULT 'uploaded'
    CHECK (processing_status IN ('uploaded', 'processing', 'extracted', 'error')),
  processing_error TEXT,
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_documents_assignment ON documents(assignment_id);

-- ============================================================
-- EXTRACTIONS (AI-extracted data from documents)
-- ============================================================

CREATE TABLE extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  assignment_id UUID NOT NULL REFERENCES assignments(id),
  document_id UUID NOT NULL REFERENCES documents(id),
  -- Versioning
  schema_version TEXT NOT NULL DEFAULT '1.0',
  llm_provider TEXT,
  llm_model TEXT,
  prompt_version TEXT,
  -- Results
  extracted_json JSONB NOT NULL,
  confidence_json JSONB,
  source_references JSONB,
  -- Status
  status TEXT DEFAULT 'completed'
    CHECK (status IN ('processing', 'completed', 'failed', 'superseded')),
  -- Metadata
  processing_time_ms INTEGER,
  token_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_extractions_assignment ON extractions(assignment_id);
CREATE INDEX idx_extractions_document ON extractions(document_id);

-- ============================================================
-- GENERATIONS (AI-generated texts and drafts)
-- ============================================================

CREATE TABLE generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  assignment_id UUID NOT NULL REFERENCES assignments(id),
  -- Generation type
  type TEXT NOT NULL
    CHECK (type IN ('ad_copy', 'email_brf', 'email_buyer', 'email_seller',
                     'email_bank', 'settlement_draft', 'brf_application',
                     'access_request', 'checklist')),
  -- Versioning
  prompt_version TEXT,
  llm_provider TEXT,
  llm_model TEXT,
  -- Results
  output_text TEXT NOT NULL,
  output_metadata JSONB,
  -- User approval
  is_approved BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  edited_text TEXT,
  -- Metadata
  tone TEXT DEFAULT 'professional',
  input_data_snapshot JSONB,
  token_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_generations_assignment_type ON generations(assignment_id, type);

-- ============================================================
-- TRANSACTIONS (Buy/sell transactions)
-- ============================================================

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  assignment_id UUID NOT NULL REFERENCES assignments(id),
  -- Parties (PII — retention managed)
  buyer_name TEXT,
  buyer_email TEXT,
  buyer_phone TEXT,
  buyer_personal_number_hash TEXT,
  seller_name TEXT,
  seller_email TEXT,
  -- Financials
  sale_price NUMERIC,
  deposit_amount NUMERIC,
  deposit_due_date DATE,
  -- Dates
  contract_date DATE,
  access_date DATE,
  -- Settlement draft data
  settlement_data JSONB,
  -- Status
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'contract_signed', 'deposit_paid',
                      'brf_approved', 'access_scheduled', 'completed')),
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- ============================================================
-- TASKS (Checklists and tasks)
-- ============================================================

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  assignment_id UUID NOT NULL REFERENCES assignments(id),
  -- Task
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  status TEXT DEFAULT 'todo'
    CHECK (status IN ('todo', 'in_progress', 'done', 'skipped')),
  -- Assignment
  assigned_to UUID REFERENCES users(id),
  due_date DATE,
  sort_order INTEGER DEFAULT 0,
  -- Auto-generated?
  is_auto_generated BOOLEAN DEFAULT false,
  trigger_status TEXT,
  -- Metadata
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_tasks_assignment_status ON tasks(assignment_id, status);

-- ============================================================
-- EMAIL LOGS (Sent/scheduled emails)
-- ============================================================

CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  assignment_id UUID REFERENCES assignments(id),
  generation_id UUID REFERENCES generations(id),
  -- Email details
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  body_preview TEXT,
  template_name TEXT,
  -- Status
  status TEXT DEFAULT 'draft'
    CHECK (status IN ('draft', 'queued', 'sent', 'delivered', 'failed', 'bounced')),
  sent_at TIMESTAMPTZ,
  resend_message_id TEXT,
  error_message TEXT,
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INBOUND EMAIL ALIASES
-- ============================================================

CREATE TABLE inbound_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  email_alias TEXT NOT NULL UNIQUE,
  secret_token TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- AUDIT LOG (Revision log — GDPR & traceability)
-- ============================================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  actor_user_id UUID REFERENCES users(id),
  -- Event
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  -- Details
  metadata_json JSONB,
  ip_address INET,
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_logs_tenant_created ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- ============================================================
-- TENANT PREFERENCES (Organization settings)
-- ============================================================

CREATE TABLE tenant_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id),
  -- AI settings
  default_tone TEXT DEFAULT 'professional',
  default_llm_provider TEXT DEFAULT 'anthropic',
  -- Email
  email_signature TEXT,
  default_brf_email_template TEXT,
  -- Branding
  logo_url TEXT,
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
