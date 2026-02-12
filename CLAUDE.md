# BrokerFlow — Master Specification

## Produktions-MVP för automation av svensk mäklaradministration

**Version:** 1.0
**Datum:** 2026-02-12
**Syfte:** Detta dokument är den enda källan till sanning ("single source of truth") för BrokerFlow-projektet. Det fungerar som styrdokument för Claude Code och alla implementationsbeslut.

---

## 1. VISION & KÄRNVÄRDE

BrokerFlow är en molnbaserad SaaS-plattform som automatiserar administrationen kring fastighetsmäklares förmedlingsuppdrag i Sverige. Plattformen fungerar som ett intelligent automationslager ovanpå befintliga arbetsflöden — inte som ett ersättnings-CRM.

**Kärnlöfte:** Minska administrativt arbete med 60–80% per förmedlingsuppdrag genom AI-driven dokumentextraktion, automatisk generering av texter och mallar, samt smarta arbetsflöden.

**Produktfilosofi — tre principer:**

1. **Snabbt:** Minimalt antal klick. Mäklaren ska kunna starta ett uppdrag och ha en checklista, extraherad data och utkast på annonstexter inom minuter.
2. **Förtroende:** Visa alltid källhänvisningar, confidence-nivåer och tydliga "UTKAST"-markeringar. Användaren ska aldrig undra varifrån data kommer.
3. **Human in the loop:** Inget skickas, publiceras eller sparas som slutgiltigt utan att mäklaren explicit godkänner. Semi-automation, inte full automation.

---

## 2. MÅLGRUPP & MARKNAD

**Primärt:** Enskilda fastighetsmäklare och små mäklarkontor (1–5 personer) som vill minska admintid utan att byta affärssystem.

**Sekundärt:** Medelstora mäklarbyråer (5–20 mäklare) som vill standardisera och effektivisera processer.

**Framtida:** Större kedjor och franchisetagare med behov av avancerade automationer och API-integrationer.

**Marknadsstorlek:** Cirka 7 000 registrerade fastighetsmäklare i Sverige (Fastighetsmäklarinspektionen). Hög potential för nordisk expansion (Norge, Finland, Danmark har liknande marknadsstruktur).

**Användarkontext:** Mäklare använder idag en blandning av CRM-system (Vitec, Mspecs, FastOffice m.fl.), e-post, PDF-dokument (mäklarbild, årsredovisning, stadgar), kontakter med bostadsrättsföreningar (BRF), och verktyg som Tambur för tillträdesbokning. BrokerFlow ersätter inte dessa — det automatiserar arbetet mellan dem.

---

## 3. MVP SCOPE — VAD VI BYGGER

### 3.1 Inkluderat i MVP

**A) Auth & Tenant (organisation)**
- Registrering/inloggning med e-post + lösenord (Supabase Auth)
- Skapa tenant (mäklarbyrå) + bjud in kollegor
- Roller: admin och agent
- Förbered datamodell för framtida BankID-login (fält finns, implementation ej i MVP)

**B) Förmedlingsuppdrag (Assignment)**
- Skapa uppdrag med: adress, stad, postnummer, bostadstyp (bostadsrätt/villa/radhus), säljarens namn/e-post (valfritt)
- Statusflöde: utkast → aktivt → under kontrakt → avslutat
- Dashboard med aktiva uppdrag, tidslinje, uppgifter och deadlines
- KPI-kort: antal aktiva uppdrag, väntande uppgifter, kommande deadlines

**C) Dokumentcenter**
- Ladda upp dokument (PDF, bilder) till ett uppdrag via drag-and-drop
- E-postingång: varje tenant får en unik inbound-adress (t.ex. `kontoret+abc123@in.brokerflow.se`)
- Inkommande mail med bilagor kopplas automatiskt till uppdrag via token i ämnesrad eller manuell matchning
- Dokumentbibliotek per uppdrag med typ, status och förhandsgranskning

**D) Extraktionspipeline**
- Extrahera text från PDF (node-bibliotek; fallback-placeholder för OCR på skannade bilder)
- Automatisk dokumentklassificering: mäklarbild, årsredovisning, stadgar, kontrakt, övrigt
- Extrahera nyckelfält: månadsavgift, boyta, antal rum, våning, byggår, föreningsnamn, org-nummer, renoveringsinformation, ekonomisk sammanfattning
- Spara strukturerad JSON med confidence scores per fält och källhänvisning
- Mäklaren granskar och bekräftar/justerar extraherad data innan den används

**E) AI-generering**
- Svensk annonstext: rubrik (max 70 tecken), kort intro (2–3 meningar), 5 bullet highlights, föreningssammanfattning, område-placeholder
- E-postutkast: till BRF (begäran om mäklarbild/medlemsansökan), till köpare/säljare (nästa steg)
- Efter kontrakt: checklistor + mallar för BRF-ansökan, tillträdesbokning (Tambur-placeholder), likvidavräkningsutkast (tydligt märkt "EJ JURIDISKT BINDANDE")
- Tonval per organisation (formell, ledig, lyxig) med sparade preferenser

**F) Uppgifts- & checklistmotor**
- Standardchecklista per statusfas:
  - *Aktivt:* beställ dokument, beställ foton, skapa annons, publicera
  - *Under kontrakt:* ladda upp kontrakt, skicka BRF-ansökan, boka tillträde, förbered likvidavräkning
  - *Avslutat:* arkivera dokument, retention-policy, feedback
- Påminnelser via due dates (ingen kalenderintegration i MVP)
- Manuell + automatisk skapning av uppgifter vid statusändring

### 3.2 Explicit INTE i MVP (non-goals)

- Fullständigt CRM (kontakthantering, pipeline, rapportering)
- Djupa integrationer med specifika affärssystem (Vitec, Mspecs etc.)
- BankID-inloggning (förberett i datamodellen, implementeras i fas 2)
- Kalenderintegration (Google Calendar, Outlook)
- Mobilapp (responsiv webb räcker för MVP)
- Tambur-integration (genererar malltext; ingen API-koppling)
- Juridiskt bindande likvidavräkning (tydligt utkast)
- Fullständig WYSIWYG-editor för e-postmallar (enkel template med variabler räcker)
- Anpassade workflows (admin bygger egna regler — fas 2+)

---

## 4. TECH STACK

### 4.1 Beslutad stack

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  Next.js 14+ (App Router) · TypeScript · Tailwind CSS            │
│  shadcn/ui · React Hook Form + Zod · TanStack Query             │
├─────────────────────────────────────────────────────────────────┤
│                     BACKEND & DATABAS                            │
│  Supabase: PostgreSQL · Auth · Row Level Security                │
│  Supabase Storage (dokument) · Supabase Edge Functions (jobb)    │
├─────────────────────────────────────────────────────────────────┤
│                      AI-TJÄNSTER                                 │
│  Abstraherat LLM-interface (byt via env vars)                    │
│  Default: Anthropic Claude · Fallback: OpenAI GPT-4             │
│  PDF-textextraktion: pdf-parse (node) · OCR: placeholder         │
├─────────────────────────────────────────────────────────────────┤
│                      E-POST                                      │
│  Inbound: Mailgun Inbound Parse → webhook                        │
│  Outbound: Resend (transaktionella utskick)                      │
├─────────────────────────────────────────────────────────────────┤
│                    BETALNING                                     │
│  Stripe: checkout, kundportal, webhooks                          │
├─────────────────────────────────────────────────────────────────┤
│                 INFRASTRUKTUR                                    │
│  Vercel (EU-region) · Supabase Cloud (EU-region)                 │
│  Upstash QStash (vid behov för köhantering)                      │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Motiveringar för nyckelval

**Varför abstraherat LLM-interface:** AI-marknaden rör sig snabbt. Genom att kapsla in LLM-anrop bakom ett gemensamt interface kan vi byta leverantör, A/B-testa modeller, eller använda olika modeller för olika uppgifter (t.ex. en billigare modell för klassificering, en starkare för generering) utan att röra applikationskoden.

**Varför Supabase Edge Functions istället för Inngest/Trigger.dev:** Färre beroenden, redan i Supabase-ekosystemet, räcker för MVP:ns behov. Om vi behöver komplexa multi-step workflows med retries och branching i framtiden kan vi migrera till Inngest.

**Varför Mailgun Inbound Parse:** Mäklare lever i sin inbox. Att kunna forwarda ett mail med bifogad mäklarbild direkt till BrokerFlow utan att öppna appen är en av de starkaste MVP-features vi kan erbjuda.

**Varför INTE Prisma:** Supabase SDK + manuella SQL-migrationer ger mer kontroll och mindre overhead för ett team som lär sig. Prisma kan adderas senare om behovet uppstår.

---

## 5. ARKITEKTUR

### 5.1 Systemöversikt

```
Mäklare (webbläsare)
    │
    ▼
┌──────────────┐     ┌─────────────────────┐
│  Next.js App │────▶│  Supabase           │
│  (Vercel EU) │     │  ├─ PostgreSQL + RLS │
│              │◀────│  ├─ Auth             │
│  ├─ Pages    │     │  ├─ Storage          │
│  ├─ API      │     │  └─ Edge Functions   │
│  └─ Server   │     └─────────────────────┘
│    Actions   │              │
└──────┬───────┘              │
       │                      ▼
       │              ┌───────────────┐
       │              │ Bakgrundsjobb │
       │              │ ├─ Extraktion │
       │              │ ├─ Generering │
       │              │ └─ Retention  │
       │              └───────┬───────┘
       │                      │
       ▼                      ▼
┌──────────────┐     ┌───────────────┐
│ Mailgun      │     │ LLM Provider  │
│ (inbound)    │     │ (Claude/GPT)  │
├──────────────┤     └───────────────┘
│ Resend       │
│ (outbound)   │
├──────────────┤
│ Stripe       │
│ (betalning)  │
└──────────────┘
```

### 5.2 Multi-tenant arkitektur

Varje mäklarbyrå är en "tenant". All data isoleras genom `tenant_id` på varje tabell, med Supabase Row Level Security (RLS) som enforcar isolation på databasnivå. Användare kan bara se och modifiera data som tillhör sin tenant.

### 5.3 Dataflöde — nytt uppdrag

```
1. Mäklare skapar uppdrag (adress, typ, säljare)
   ↓
2. System skapar standardchecklista baserat på bostadstyp
   ↓
3. Mäklare laddar upp PDF / forwardar mail
   ↓
4. Webhook tar emot → fil sparas i Storage → document-rad skapas
   ↓
5. Edge Function triggas: extrahera text → klassificera typ → extrahera fält
   ↓
6. Extraherad data sparas med confidence scores i extractions-tabell
   ↓
7. Mäklare granskar i UI → bekräftar/justerar → data mappas till uppdraget
   ↓
8. AI genererar annonstext baserat på bekräftad data → sparas i generations
   ↓
9. Mäklare redigerar utkast → godkänner
   ↓
10. [Efter kontrakt:] AI genererar BRF-ansökan, likvidavräkning, tillträdesmall
    ↓
11. Mäklare granskar → godkänner → system skickar e-post via Resend
```

---

## 6. DATABASSCHEMA

### 6.1 Tabeller

```sql
-- ============================================================
-- TENANT & AUTH
-- ============================================================

CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                           -- Byråns namn
  slug TEXT UNIQUE,                             -- URL-vänligt namn
  subscription_plan TEXT DEFAULT 'trial',       -- 'trial','starter','pro','enterprise'
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  -- GDPR: retention-inställningar (dagar)
  retention_raw_days INTEGER DEFAULT 180,       -- Rådata (dokument)
  retention_derived_days INTEGER DEFAULT 365,   -- Härledda data (extraktioner, genererat)
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ                        -- Soft delete
);

CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  role TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('admin', 'agent')),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  -- Framtida BankID-fält (ej i MVP)
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
  assigned_to UUID REFERENCES users(id),        -- Ansvarig mäklare
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'under_contract', 'closed')),
  -- Objektdata
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
  monthly_fee NUMERIC,                          -- BRF månadsavgift
  asking_price NUMERIC,                         -- Utgångspris
  -- Säljare (minimal PII, valfritt)
  seller_name TEXT,
  seller_email TEXT,
  seller_phone TEXT,
  -- Förening (BRF)
  association_name TEXT,
  association_org_number TEXT,
  association_contact_email TEXT,
  -- AI-genererade fält (bekräftade av mäklare)
  confirmed_property_data JSONB,                -- Bekräftad extraherad data
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ                        -- Soft delete
);

-- Index för vanliga sökningar
CREATE INDEX idx_assignments_tenant_status ON assignments(tenant_id, status);
CREATE INDEX idx_assignments_tenant_created ON assignments(tenant_id, created_at DESC);

-- ============================================================
-- DOCUMENTS
-- ============================================================

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  assignment_id UUID REFERENCES assignments(id),
  -- Filinfo
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,                   -- Supabase Storage-sökväg
  file_size_bytes INTEGER,
  mime_type TEXT,
  -- Klassificering
  doc_type TEXT DEFAULT 'ovrigt'
    CHECK (doc_type IN ('maklarbild', 'arsredovisning', 'stadgar', 'kontrakt',
                         'planritning', 'energideklaration', 'ovrigt')),
  doc_type_confidence NUMERIC,                  -- 0.0–1.0
  -- Källa
  source TEXT NOT NULL DEFAULT 'upload'
    CHECK (source IN ('upload', 'email')),
  source_email_from TEXT,                       -- Om via e-post
  source_email_subject TEXT,
  -- Status
  processing_status TEXT DEFAULT 'uploaded'
    CHECK (processing_status IN ('uploaded', 'processing', 'extracted', 'error')),
  processing_error TEXT,
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ                        -- Soft delete
);

CREATE INDEX idx_documents_assignment ON documents(assignment_id);

-- ============================================================
-- EXTRACTIONS (AI-extraherad data från dokument)
-- ============================================================

CREATE TABLE extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  assignment_id UUID NOT NULL REFERENCES assignments(id),
  document_id UUID NOT NULL REFERENCES documents(id),
  -- Versionering
  schema_version TEXT NOT NULL DEFAULT '1.0',   -- Format-version
  llm_provider TEXT,                            -- 'anthropic', 'openai'
  llm_model TEXT,                               -- 'claude-sonnet-4-20250514', etc.
  prompt_version TEXT,                          -- Git hash eller semantisk version
  -- Resultat
  extracted_json JSONB NOT NULL,                -- Extraherade fält
  confidence_json JSONB,                        -- Confidence per fält: {"monthly_fee": 0.95, ...}
  source_references JSONB,                      -- Var i dokumentet data hittades
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
-- GENERATIONS (AI-genererade texter och utkast)
-- ============================================================

CREATE TABLE generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  assignment_id UUID NOT NULL REFERENCES assignments(id),
  -- Typ av generering
  type TEXT NOT NULL
    CHECK (type IN ('ad_copy', 'email_brf', 'email_buyer', 'email_seller',
                     'email_bank', 'settlement_draft', 'brf_application',
                     'access_request', 'checklist')),
  -- Versionering
  prompt_version TEXT,
  llm_provider TEXT,
  llm_model TEXT,
  -- Resultat
  output_text TEXT NOT NULL,
  output_metadata JSONB,                        -- Strukturerad version (rubrik, bullets etc.)
  -- Användargodkännande
  is_approved BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  edited_text TEXT,                              -- Om mäklaren redigerade utkastet
  -- Metadata
  tone TEXT DEFAULT 'professional',             -- 'professional', 'casual', 'luxury'
  input_data_snapshot JSONB,                    -- Data som användes vid genereringstillfället
  token_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_generations_assignment_type ON generations(assignment_id, type);

-- ============================================================
-- TRANSACTIONS (Köp/sälj-transaktioner)
-- ============================================================

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  assignment_id UUID NOT NULL REFERENCES assignments(id),
  -- Parter (PII — retention-hanterat)
  buyer_name TEXT,
  buyer_email TEXT,
  buyer_phone TEXT,
  buyer_personal_number_hash TEXT,              -- Hashad, ej i klartext
  seller_name TEXT,
  seller_email TEXT,
  -- Ekonomi
  sale_price NUMERIC,
  deposit_amount NUMERIC,                       -- Handpenning
  deposit_due_date DATE,
  -- Datum
  contract_date DATE,
  access_date DATE,                             -- Tillträdesdag
  -- Likvidavräkning (utkast-data)
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
-- TASKS (Checklistor och uppgifter)
-- ============================================================

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  assignment_id UUID NOT NULL REFERENCES assignments(id),
  -- Uppgift
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,                                -- 'docs', 'marketing', 'transaction', 'closing'
  status TEXT DEFAULT 'todo'
    CHECK (status IN ('todo', 'in_progress', 'done', 'skipped')),
  -- Tilldelning
  assigned_to UUID REFERENCES users(id),
  due_date DATE,
  sort_order INTEGER DEFAULT 0,
  -- Auto-genererad?
  is_auto_generated BOOLEAN DEFAULT false,
  trigger_status TEXT,                          -- Vilken statusändring som skapade uppgiften
  -- Metadata
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_tasks_assignment_status ON tasks(assignment_id, status);

-- ============================================================
-- EMAIL LOGS (Skickade/planerade utskick)
-- ============================================================

CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  assignment_id UUID REFERENCES assignments(id),
  generation_id UUID REFERENCES generations(id),-- Kopplat till AI-genererat utkast
  -- E-postdetaljer
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  body_preview TEXT,                            -- Första 200 tecken
  template_name TEXT,
  -- Status
  status TEXT DEFAULT 'draft'
    CHECK (status IN ('draft', 'queued', 'sent', 'delivered', 'failed', 'bounced')),
  sent_at TIMESTAMPTZ,
  resend_message_id TEXT,                       -- ID från Resend
  error_message TEXT,
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INBOUND EMAIL ALIASES (Inkommande e-post)
-- ============================================================

CREATE TABLE inbound_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  email_alias TEXT NOT NULL UNIQUE,             -- t.ex. 'kontoret+abc123'
  secret_token TEXT NOT NULL,                   -- Verifieringstoken
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- AUDIT LOG (Revisionslogg — GDPR & spårbarhet)
-- ============================================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  actor_user_id UUID REFERENCES users(id),      -- NULL för systemhändelser
  -- Händelse
  action TEXT NOT NULL,                         -- 'document.uploaded', 'extraction.completed',
                                                -- 'generation.approved', 'email.sent',
                                                -- 'assignment.status_changed', 'user.invited',
                                                -- 'data.deleted', 'tenant.settings_changed'
  entity_type TEXT NOT NULL,                    -- 'assignment', 'document', 'extraction', etc.
  entity_id UUID,
  -- Detaljer
  metadata_json JSONB,                          -- Fria detaljer: {"old_status": "draft", "new_status": "active"}
  ip_address INET,
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_logs_tenant_created ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- ============================================================
-- TENANT PREFERENCES (Organisationsinställningar)
-- ============================================================

CREATE TABLE tenant_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id),
  -- AI-inställningar
  default_tone TEXT DEFAULT 'professional',     -- 'professional', 'casual', 'luxury'
  default_llm_provider TEXT DEFAULT 'anthropic',
  -- E-post
  email_signature TEXT,
  default_brf_email_template TEXT,
  -- Branding
  logo_url TEXT,
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 6.2 Row Level Security (RLS)

```sql
-- Aktivera RLS på alla tabeller
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbound_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_preferences ENABLE ROW LEVEL SECURITY;

-- Hjälpfunktion: hämta tenant_id för inloggad användare
CREATE OR REPLACE FUNCTION auth.tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- USERS: se bara egna tenant-kollegor
CREATE POLICY "users_tenant_isolation" ON users
  FOR ALL USING (tenant_id = auth.tenant_id());

-- ASSIGNMENTS: se bara egna tenant-uppdrag
CREATE POLICY "assignments_tenant_isolation" ON assignments
  FOR ALL USING (tenant_id = auth.tenant_id());

-- (Samma mönster för alla tabeller med tenant_id)
CREATE POLICY "documents_tenant_isolation" ON documents
  FOR ALL USING (tenant_id = auth.tenant_id());

CREATE POLICY "extractions_tenant_isolation" ON extractions
  FOR ALL USING (tenant_id = auth.tenant_id());

CREATE POLICY "generations_tenant_isolation" ON generations
  FOR ALL USING (tenant_id = auth.tenant_id());

CREATE POLICY "transactions_tenant_isolation" ON transactions
  FOR ALL USING (tenant_id = auth.tenant_id());

CREATE POLICY "tasks_tenant_isolation" ON tasks
  FOR ALL USING (tenant_id = auth.tenant_id());

CREATE POLICY "email_logs_tenant_isolation" ON email_logs
  FOR ALL USING (tenant_id = auth.tenant_id());

CREATE POLICY "inbound_aliases_tenant_isolation" ON inbound_aliases
  FOR ALL USING (tenant_id = auth.tenant_id());

CREATE POLICY "audit_logs_tenant_isolation" ON audit_logs
  FOR ALL USING (tenant_id = auth.tenant_id());

CREATE POLICY "tenant_preferences_tenant_isolation" ON tenant_preferences
  FOR ALL USING (tenant_id = auth.tenant_id());

-- TENANTS: egna tenant-raden
CREATE POLICY "tenants_own_only" ON tenants
  FOR ALL USING (id = auth.tenant_id());

-- Soft delete: dölj borttagna rader
CREATE POLICY "assignments_not_deleted" ON assignments
  FOR SELECT USING (deleted_at IS NULL AND tenant_id = auth.tenant_id());

CREATE POLICY "documents_not_deleted" ON documents
  FOR SELECT USING (deleted_at IS NULL AND tenant_id = auth.tenant_id());

CREATE POLICY "transactions_not_deleted" ON transactions
  FOR SELECT USING (deleted_at IS NULL AND tenant_id = auth.tenant_id());
```

### 6.3 Automatiska triggers

```sql
-- Uppdatera updated_at automatiskt
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON tenant_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## 7. GDPR & SÄKERHET

### 7.1 Principer

- **Dataminimering:** Samla bara in den data som behövs. Personnummer lagras ALDRIG i klartext (hashat).
- **Isolation:** Multi-tenant med RLS. Ingen tenant kan se annan tenants data.
- **EU-hosting:** Vercel EU-region + Supabase EU-region. Ingen data lämnar EU.
- **Kryptering:** At rest hanteras av Supabase (AES-256). In transit via HTTPS/TLS.
- **Hemligheter:** Alla API-nycklar i miljövariabler. Aldrig hårdkodade eller committade.

### 7.2 Data Retention

Varje tenant kan konfigurera:
- **Rådata (dokument):** Standard 180 dagar. Soft delete → schemalagd hard delete.
- **Härledd data (extraktioner, genererad text):** Standard 365 dagar.
- **Audit logs:** Behålls i minst 2 år (lagkrav).

### 7.3 Raderingskapacitet

- **Radera uppdrag:** Soft delete (sätter `deleted_at`). Döljs i UI direkt. Hard delete via bakgrundsjobb efter retention-perioden.
- **Radera tenant-data:** Admin kan begära fullständig radering av all tenant-data. Tvåstegsbekräftelse. Utförs inom 30 dagar (GDPR-krav).
- **Schemalagt jobb:** Supabase Edge Function körs dagligen, identifierar och hard-deletar data som passerat retention-perioden.

### 7.4 Audit Logging

Följande händelser loggas alltid:
- Dokument uppladdat / borttaget
- Extraktion körd
- AI-text genererad / godkänd
- E-post skickad
- Statusändring på uppdrag
- Användare inbjuden / borttagen
- Tenant-inställningar ändrade
- Data raderad

---

## 8. PROJEKTSTRUKTUR

```
brokerflow/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── (auth)/                 # Publika auth-sidor
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── register/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   ├── (app)/                  # Autentiserade sidor
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx        # Översikt
│   │   │   ├── assignments/
│   │   │   │   ├── page.tsx        # Lista
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx    # Skapa nytt
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx    # Detalj (flikar: Översikt, Dokument, Data, Utkast, Uppgifter)
│   │   │   │       └── layout.tsx
│   │   │   ├── settings/
│   │   │   │   ├── page.tsx        # Tenant-inställningar
│   │   │   │   ├── team/
│   │   │   │   │   └── page.tsx    # Bjud in / hantera
│   │   │   │   ├── billing/
│   │   │   │   │   └── page.tsx    # Stripe-portal
│   │   │   │   └── retention/
│   │   │   │       └── page.tsx    # GDPR-inställningar
│   │   │   ├── onboarding/
│   │   │   │   └── page.tsx        # Första gången: skapa tenant
│   │   │   └── layout.tsx          # Sidebar + top nav
│   │   ├── api/
│   │   │   ├── email/
│   │   │   │   └── inbound/
│   │   │   │       └── route.ts    # Mailgun webhook
│   │   │   ├── extract/
│   │   │   │   └── route.ts        # Trigga extraktion
│   │   │   ├── generate/
│   │   │   │   └── route.ts        # Trigga AI-generering
│   │   │   ├── webhooks/
│   │   │   │   └── stripe/
│   │   │   │       └── route.ts    # Stripe webhook
│   │   │   └── cron/
│   │   │       └── retention/
│   │   │           └── route.ts    # Schemalagd retention-cleanup
│   │   ├── layout.tsx              # Root layout
│   │   └── page.tsx                # Landing page (publik)
│   ├── components/
│   │   ├── ui/                     # shadcn/ui (genereras med CLI)
│   │   ├── layout/
│   │   │   ├── sidebar.tsx
│   │   │   ├── top-nav.tsx
│   │   │   └── mobile-nav.tsx
│   │   ├── assignments/
│   │   │   ├── assignment-card.tsx
│   │   │   ├── assignment-form.tsx
│   │   │   ├── assignment-detail.tsx
│   │   │   ├── status-badge.tsx
│   │   │   └── status-stepper.tsx
│   │   ├── documents/
│   │   │   ├── upload-dropzone.tsx
│   │   │   ├── document-list.tsx
│   │   │   ├── document-preview.tsx
│   │   │   └── extraction-review.tsx   # Granska & bekräfta AI-data
│   │   ├── generations/
│   │   │   ├── ad-copy-editor.tsx      # Redigera AI-annonstext
│   │   │   ├── email-draft-viewer.tsx
│   │   │   ├── tone-selector.tsx
│   │   │   └── approval-bar.tsx        # Godkänn / redigera / generera om
│   │   ├── tasks/
│   │   │   ├── task-list.tsx
│   │   │   ├── task-item.tsx
│   │   │   └── checklist-progress.tsx
│   │   ├── dashboard/
│   │   │   ├── kpi-cards.tsx
│   │   │   ├── recent-assignments.tsx
│   │   │   └── upcoming-deadlines.tsx
│   │   └── shared/
│   │       ├── loading-spinner.tsx
│   │       ├── error-boundary.tsx
│   │       ├── empty-state.tsx
│   │       ├── confirm-dialog.tsx
│   │       └── draft-badge.tsx         # "UTKAST"-markering
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts               # Browser-klient
│   │   │   ├── server.ts               # Server-klient (RSC, API)
│   │   │   ├── middleware.ts            # Auth middleware
│   │   │   └── admin.ts                # Service role-klient
│   │   ├── ai/
│   │   │   ├── provider.ts             # Abstraherat LLM-interface
│   │   │   ├── anthropic.ts            # Anthropic implementation
│   │   │   ├── openai.ts               # OpenAI implementation
│   │   │   ├── prompts/
│   │   │   │   ├── extract-property.ts  # Prompt: extrahera objektdata
│   │   │   │   ├── classify-doc.ts      # Prompt: klassificera dokumenttyp
│   │   │   │   ├── generate-ad.ts       # Prompt: annonstext
│   │   │   │   ├── generate-email.ts    # Prompt: e-postutkast
│   │   │   │   └── generate-settlement.ts # Prompt: likvidavräkning
│   │   │   └── types.ts                # AI-relaterade typer
│   │   ├── extraction/
│   │   │   ├── pdf-parser.ts           # PDF → text
│   │   │   ├── doc-classifier.ts       # Dokumenttypsklassificering
│   │   │   └── field-extractor.ts      # Fältextraktion med LLM
│   │   ├── email/
│   │   │   ├── resend.ts               # Utgående e-post (Resend)
│   │   │   ├── inbound-parser.ts       # Tolka inbound webhook
│   │   │   └── templates/
│   │   │       ├── brf-request.tsx      # Mall: begäran till BRF
│   │   │       ├── buyer-confirmation.tsx
│   │   │       └── seller-confirmation.tsx
│   │   ├── workflows/
│   │   │   ├── assignment-created.ts   # Workflow: nytt uppdrag
│   │   │   ├── status-changed.ts       # Workflow: statusändring
│   │   │   ├── document-uploaded.ts    # Workflow: nytt dokument
│   │   │   └── contract-uploaded.ts    # Workflow: kontrakt
│   │   ├── audit/
│   │   │   └── log.ts                  # Audit logging helper
│   │   ├── stripe/
│   │   │   └── client.ts              # Stripe helpers
│   │   └── utils/
│   │       ├── constants.ts
│   │       ├── formatting.ts           # Svensk formatering (pris, datum, adress)
│   │       └── validation.ts           # Zod-schemas
│   ├── hooks/
│   │   ├── use-assignment.ts
│   │   ├── use-documents.ts
│   │   ├── use-tasks.ts
│   │   └── use-tenant.ts
│   ├── types/
│   │   ├── database.ts                 # Supabase-genererade typer
│   │   ├── assignment.ts
│   │   ├── document.ts
│   │   └── generation.ts
│   └── styles/
│       └── globals.css
├── supabase/
│   ├── migrations/
│   │   ├── 00001_initial_schema.sql
│   │   └── 00002_rls_policies.sql
│   ├── functions/
│   │   ├── extract-document/           # Edge Function
│   │   │   └── index.ts
│   │   └── retention-cleanup/          # Edge Function
│   │       └── index.ts
│   ├── seed.sql                        # Testdata
│   └── config.toml
├── public/
│   ├── logo.svg
│   └── favicon.ico
├── .env.local                          # Lokal utveckling (ALDRIG committa)
├── .env.example                        # Mall med beskrivningar
├── .gitignore
├── middleware.ts                        # Next.js middleware (auth redirect)
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## 9. API ROUTES

### 9.1 Inbound Email

```
POST /api/email/inbound
```
- Tar emot webhook från Mailgun med multipart/form-data
- Verifierar avsändare mot `inbound_aliases.secret_token`
- Sparar bilagor till Supabase Storage
- Skapar `documents`-rad med `source: 'email'`
- Triggar extraktion automatiskt
- Loggar till `audit_logs`

### 9.2 Extraktion

```
POST /api/extract
Body: { document_id: string, assignment_id: string }
```
- Hämtar dokument från Storage
- Extraherar text (pdf-parse)
- Klassificerar dokumenttyp via LLM
- Extraherar nyckelfält via LLM
- Sparar resultat i `extractions` med confidence scores
- Uppdaterar `documents.processing_status`
- Loggar till `audit_logs`

### 9.3 AI-generering

```
POST /api/generate
Body: { assignment_id: string, type: 'ad_copy' | 'email_brf' | ... , tone?: string }
```
- Hämtar bekräftad extraherad data från uppdraget
- Väljer prompt baserat på typ
- Anropar LLM via abstraherat interface
- Sparar resultat i `generations` med `is_approved: false`
- Returnerar genererad text till frontend
- Loggar till `audit_logs`

### 9.4 Stripe Webhook

```
POST /api/webhooks/stripe
```
- Verifierar Stripe-signatur
- Hanterar: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- Uppdaterar `tenants.subscription_plan`

### 9.5 Retention Cleanup (Cron)

```
GET /api/cron/retention (skyddad med CRON_SECRET)
```
- Körs dagligen (Vercel Cron)
- Identifierar dokument/data som passerat tenant-specifik retention-period
- Hard delete (tar bort från Storage + databas)
- Loggar till `audit_logs`

---

## 10. AI-INTERFACE DESIGN

### 10.1 Abstraherat LLM-interface

```typescript
// lib/ai/provider.ts
interface LLMProvider {
  complete(params: {
    systemPrompt: string;
    userPrompt: string;
    maxTokens?: number;
    temperature?: number;
  }): Promise<{ text: string; tokenCount: number }>;

  extractFromDocument(params: {
    documentText: string;
    extractionSchema: Record<string, string>;
  }): Promise<{ data: Record<string, any>; confidence: Record<string, number> }>;
}

// Välj provider baserat på env var
function getLLMProvider(): LLMProvider {
  const provider = process.env.LLM_PROVIDER || 'anthropic';
  switch (provider) {
    case 'anthropic': return new AnthropicProvider();
    case 'openai': return new OpenAIProvider();
    default: throw new Error(`Unknown LLM provider: ${provider}`);
  }
}
```

### 10.2 Prompt-strategi

Alla prompts ska:
- Producera text på svenska
- Inkludera explicit instruktion om output-format (JSON för extraktion, markdown för text)
- Ha en versionssträng som sparas i databasen
- Inkludera confidence-instruktion: "Ange en confidence score 0.0–1.0 för varje extraherat fält"

---

## 11. EPICS & ISSUES (IMPLEMENTATIONSORDNING)

### Fas 1: Grundplattform (vecka 1–2)

**EPIC 1: Repo & Infrastruktur**

| # | Issue | Prio | Beskrivning | Acceptanskriterier |
|---|-------|------|-------------|-------------------|
| 1.1 | Projektscaffold | 🔴 | Next.js 14 + TS + Tailwind + shadcn/ui + ESLint + Prettier | `npm run dev` fungerar, shadcn/ui-komponent visas |
| 1.2 | Supabase-setup | 🔴 | Skapa projekt (EU), initial migration, konfigurera .env | Kan koppla och köra query lokalt |
| 1.3 | Databasschema | 🔴 | Alla tabeller från sektion 6.1 | Migration kör utan fel |
| 1.4 | RLS-policies | 🔴 | Alla policies från sektion 6.2 + triggers | Verifierat att tenant A ej ser tenant B:s data |
| 1.5 | Miljövariabler | 🔴 | .env.example med alla variabler + dokumentation | Alla keys beskrivna |
| 1.6 | TypeScript-typer | 🔴 | Generera Supabase-typer + egna interface | `supabase gen types` fungerar |

**EPIC 2: Auth & Tenant**

| # | Issue | Prio | Beskrivning | Acceptanskriterier |
|---|-------|------|-------------|-------------------|
| 2.1 | Login-sida | 🔴 | E-post + lösenord med Supabase Auth | Kan logga in, omdirigeras till dashboard |
| 2.2 | Registrering | 🔴 | Skapa konto + verifiera e-post | Verifieringsmail skickas, konto aktiveras |
| 2.3 | Auth middleware | 🔴 | Skydda alla (app)-routes | Ej inloggad → redirect till /login |
| 2.4 | Onboarding | 🔴 | Första login: skapa tenant (namn) | Tenant skapas, user kopplas, redirect till dashboard |
| 2.5 | Team-inbjudan | 🟡 | Admin bjuder in via e-post | Inbjudan skickas, ny user kopplas till samma tenant |
| 2.6 | Rollhantering | 🟡 | Admin vs agent permissions | Agent kan ej ändra tenant-settings |

### Fas 2: Kärnfunktionalitet (vecka 3–5)

**EPIC 3: Uppdragshantering**

| # | Issue | Prio | Beskrivning | Acceptanskriterier |
|---|-------|------|-------------|-------------------|
| 3.1 | Dashboard | 🔴 | KPI-kort + aktiva uppdrag + kommande deadlines | Data laddas från Supabase, responsivt |
| 3.2 | Skapa uppdrag | 🔴 | Formulär med Zod-validering (adress, stad, typ, pris) | Sparas korrekt, redirect till detalj |
| 3.3 | Uppdragslista | 🔴 | Tabell med sök, statusfilter, sortering | Filtrering fungerar, paginering vid >20 |
| 3.4 | Uppdragsdetalj | 🔴 | Fliksvy: Översikt / Dokument / Data / Utkast / Uppgifter | Alla flikar renderar korrekt |
| 3.5 | Statusflöde | 🔴 | Ändra status med bekräftelsedialog + auto-tasks | Statusändring triggar checklista |
| 3.6 | Tidslinje | 🟡 | Visuell tidslinje med alla händelser per uppdrag | Visar status, dokument, genererat |

**EPIC 4: Dokumentcenter**

| # | Issue | Prio | Beskrivning | Acceptanskriterier |
|---|-------|------|-------------|-------------------|
| 4.1 | Drag-and-drop upload | 🔴 | Ladda upp PDF/bilder till Storage | Fil sparas, document-rad skapas |
| 4.2 | Dokumentlista | 🔴 | Visa per uppdrag med typ, status, datum | Sorterat, klickbar förhandsgranskning |
| 4.3 | Inbound e-post setup | 🔴 | Generera unik alias vid tenant-skapande | Alias skapas, visas i settings |
| 4.4 | Inbound webhook | 🔴 | Mailgun webhook → document-rad + Storage | Bilaga sparas korrekt, kopplad till tenant |
| 4.5 | Dokumentförhandsgranskning | 🟡 | PDF-viewer inline | Fungerar för vanliga PDF:er |
| 4.6 | Manuell matchning | 🟡 | Koppla ej matchat dokument till uppdrag | UI för att välja uppdrag |

**EPIC 5: Extraktionspipeline**

| # | Issue | Prio | Beskrivning | Acceptanskriterier |
|---|-------|------|-------------|-------------------|
| 5.1 | PDF-textextraktion | 🔴 | pdf-parse: extrahera text från PDF | Text sparas, hanterar svenska tecken |
| 5.2 | Dokumentklassificering | 🔴 | LLM klassificerar typ (mäklarbild etc.) | Korrekt typ + confidence score |
| 5.3 | Fältextraktion | 🔴 | LLM extraherar nyckelfält → JSON + confidence | Structured JSON i extractions-tabell |
| 5.4 | Gransknings-UI | 🔴 | Mäklare ser extraherad data, ändrar, bekräftar | Data mappas till assignment efter godkännande |
| 5.5 | OCR-placeholder | 🟡 | Detektera bild-PDF → visa "OCR krävs"-meddelande | Tydligt meddelande, manuell upload möjlig |
| 5.6 | Re-run extraktion | 🟡 | Kör om med ny prompt/modell → ny version | Gammal extraktion markeras 'superseded' |

### Fas 3: AI-generering (vecka 5–7)

**EPIC 6: Annonstext & E-post**

| # | Issue | Prio | Beskrivning | Acceptanskriterier |
|---|-------|------|-------------|-------------------|
| 6.1 | Annonstext-generering | 🔴 | Generera rubrik + intro + bullets + förening | Svensk text, korrekt format |
| 6.2 | Annonstext-editor | 🔴 | Redigera utkast inline + "generera om" | Redigeringar sparas, kan generera ny variant |
| 6.3 | Tonval | 🟡 | Välj professionell / ledig / lyxig | Tonen påverkar output märkbart |
| 6.4 | E-postutkast BRF | 🔴 | Generera mail till BRF om mäklarbild/ansökan | Korrekt svenska, rätt detaljer |
| 6.5 | E-postutkast köpare/säljare | 🟡 | Generera "nästa steg"-mail | Anpassat efter status |
| 6.6 | Godkänn & skicka | 🔴 | Godkänn utkast → visa "Klar att skicka" | `is_approved` sätts, audit log |

**EPIC 7: Kontraktsflöde**

| # | Issue | Prio | Beskrivning | Acceptanskriterier |
|---|-------|------|-------------|-------------------|
| 7.1 | Ladda upp kontrakt | 🔴 | Upload trigger → extraktion av köpare, pris, datum | Data extraheras, transaction-rad skapas |
| 7.2 | Transaktionsvy | 🔴 | Visa parter, priser, datum, status | Klar statusstepper |
| 7.3 | BRF-ansökan | 🟡 | AI-genererat ansökningsmail | Korrekt template, mäklare godkänner |
| 7.4 | Tillträdesmall | 🟡 | Generera text för Tambur / manuell bokning | Placeholder med rätt data |
| 7.5 | Likvidavräkning-utkast | 🟡 | Beräkna och generera PDF-utkast | Tydligt "EJ JURIDISKT BINDANDE" |

### Fas 4: Automation & Polish (vecka 7–9)

**EPIC 8: Uppgiftsmotor**

| # | Issue | Prio | Beskrivning | Acceptanskriterier |
|---|-------|------|-------------|-------------------|
| 8.1 | Standardchecklistor | 🔴 | Auto-generera vid statusändring | Rätt uppgifter per fas |
| 8.2 | Uppgiftslista UI | 🔴 | Checkbox, tilldelning, due date | Markera klar, filtrera |
| 8.3 | Påminnelser | 🟡 | E-postpåminnelse X dagar före deadline | Mail skickas via Resend |
| 8.4 | Progress-indikator | 🟡 | Visa % klart per uppdrag | Beräknas korrekt |

**EPIC 9: GDPR & Audit**

| # | Issue | Prio | Beskrivning | Acceptanskriterier |
|---|-------|------|-------------|-------------------|
| 9.1 | Audit logging | 🔴 | Logga alla nyckel-händelser | Alla actions i sektion 7.4 |
| 9.2 | Audit-vy | 🟡 | Visa revisionslogg per uppdrag | Filtrering, tidslinje |
| 9.3 | Retention-inställningar | 🟡 | Admin konfigurerar dagar | Sparas i tenant |
| 9.4 | Retention-job | 🟡 | Cron: hard delete utgången data | Kör korrekt, loggar |
| 9.5 | Radera uppdrag | 🔴 | Soft delete med bekräftelse | `deleted_at` sätts, döljs i UI |
| 9.6 | Radera tenant-data | 🟡 | Admin-begäran → full radering | Tvåstegs-bekräftelse, audit log |

**EPIC 10: Betalning & Landing**

| # | Issue | Prio | Beskrivning | Acceptanskriterier |
|---|-------|------|-------------|-------------------|
| 10.1 | Stripe-integration | 🟡 | Checkout + kundportal + webhooks | Kan köpa prenumeration |
| 10.2 | Prisplaner | 🟡 | Starter / Pro / Enterprise med feature gates | Rätt features per plan |
| 10.3 | Landing page | 🟡 | Professionell sida med features, priser, CTA | Responsiv, bra performance |
| 10.4 | Onboarding-förbättring | 🟡 | Guide-steg: konto → tenant → första uppdraget | Minskar time-to-value |

---

## 12. INTÄKTSMODELL

| Plan | Pris/mån | Mäklare | Funktioner |
|------|----------|---------|------------|
| **Starter** | 990 kr | 1 | Dashboard, uppdrag, checklistor, 10 AI-genereringar/mån, dokumentuppladdning |
| **Pro** | 1 790 kr | 1 | Allt i Starter + obegränsade AI-genereringar + inbound e-post + workflow-automation + e-postutskick |
| **Team** | 1 490 kr/mäklare | 2–10 | Allt i Pro + team-hantering + delad mall-bank + admin-vy |
| **Enterprise** | Offert | 10+ | Allt i Team + anpassade workflows + API-access + SLA + dedicerad support |

**Alternativ hybridmodell:** Lägre fast avgift (490 kr/mån) + transaktionsavgift per genomförd affär (500–800 kr). Testar vilken modell som konverterar bäst.

**Fri provperiod:** 14 dagar med full Pro-funktionalitet. Inga kreditkortsuppgifter krävs.

---

## 13. SVERIGE-SPECIFIKT

- **Språk:** All UI, all AI-genererad text, alla felmeddelanden och e-postmallar på svenska.
- **Adressformat:** gatuadress + postnummer (5 siffror) + ort. Stöd för lägenhetsberikare (lgh 1102).
- **Prisformat:** Svensk formatering: `2 450 000 kr` (mellanslag som tusentalsavgränsare).
- **Datumformat:** YYYY-MM-DD (ISO 8601, standard i Sverige).
- **Personnummer:** Lagras ALDRIG i klartext. Om det behövs (BRF-ansökan): hashat eller krypterat, med explicit samtycke.
- **Bostadstyper:** bostadsrätt, villa, radhus, fritidshus, tomt, övrigt.
- **BRF-terminologi:** förening, stadgar, mäklarbild, årsredovisning, månadsavgift, pantsättning.
- **BankID:** Datamodellen har `bankid_subject` på user-tabellen. Implementation i fas 2. Kräver BankID RP-avtal.
- **EU-hosting:** Vercel: ange `regions: ['arn1']` (Stockholm). Supabase: välj EU-region vid projektskapande.

---

## 14. KOM IGÅNG (FÖR CLAUDE CODE)

```bash
# 1. Skapa projektet
npx create-next-app@latest brokerflow --typescript --tailwind --eslint --app --src-dir

# 2. Installera beroenden
cd brokerflow

# Core
npm install @supabase/supabase-js @supabase/ssr

# UI
npx shadcn@latest init
npm install react-hook-form @hookform/resolvers zod
npm install @tanstack/react-query

# AI
npm install @anthropic-ai/sdk openai

# E-post
npm install resend

# PDF
npm install pdf-parse
npm install @types/pdf-parse --save-dev

# Betalning
npm install stripe

# Utilities
npm install date-fns lucide-react clsx tailwind-merge

# 3. Konfigurera Supabase (lokal utveckling)
npx supabase init
npx supabase start

# 4. Generera typer
npx supabase gen types typescript --local > src/types/database.ts

# 5. Skapa .env.local (kopiera .env.example)
cp .env.example .env.local
```

### Miljövariabler (.env.example)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI (abstraherat)
LLM_PROVIDER=anthropic                    # 'anthropic' eller 'openai'
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# E-post
RESEND_API_KEY=re_...
MAILGUN_WEBHOOK_SIGNING_KEY=...
INBOUND_EMAIL_DOMAIN=in.brokerflow.se

# Betalning
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=your-cron-secret              # Skyddar cron-endpoints
```

---

## 15. DEFINITION OF DONE (PER ISSUE)

Varje issue anses klar när:

- [ ] Koden är skriven i TypeScript med korrekta typer (inga `any`)
- [ ] Komponenter är responsiva (mobil + tablet + desktop)
- [ ] Supabase RLS-policies enforcar korrekt tenant-isolation
- [ ] Laddningstillstånd (skeleton/spinner) finns för alla async-operationer
- [ ] Felhantering finns (error boundaries, toast-meddelanden)
- [ ] Alla texter i UI:t är på svenska
- [ ] `audit_logs` skrivs vid datamutationer
- [ ] Soft delete används istället för hard delete
- [ ] Formulär har Zod-validering
- [ ] Koden är commitherad med konventionellt meddelande (feat:, fix:, chore:)

---

## 16. ROADMAP EFTER MVP

### Fas 2 (3–6 månader efter lansering)
- BankID-inloggning
- Kalenderintegration (Google Calendar / Outlook)
- Tambur-API-integration för tillträdesbokning
- Anpassade workflows (admin bygger egna regler med triggers + actions)
- Mobilapp (React Native eller PWA)
- WYSIWYG-editor för e-postmallar

### Fas 3 (6–12 månader)
- Integrationer med Vitec, Mspecs, FastOffice
- Automatisk publicering till Hemnet / Booli
- Avancerad analytics och rapportering per byrå
- Nordisk expansion (Norge, Finland, Danmark)
- API för tredjepartsutvecklare
- White-label-lösning för stora kedjor

### Framtida
- Prediktiv prissättning baserad på historisk data
- Automatisk budgivningslogg
- Video-tour integration
- AI-driven kundmatchning

---

*Senast uppdaterad: 2026-02-12*
*Version: 1.0*
*Status: Redo för implementation*
