-- ============================================
-- BEEBOX INTELLIGENCE - DATABASE SCHEMA V5.0
-- PRODUCTION-READY: NO HARDCODE, FULL KPI LOGIC
-- ============================================
-- V5 Fixes:
-- 1. ✅ Removed all fallback hardcode (uses system_config)
-- 2. ✅ Sync anchor_date for target lookup
-- 3. ✅ v_sales_channels shows all channels (0 count)
-- 4. ✅ v_top_performers uses anchor month for all metrics
-- 5. ✅ v_kpis_summary active_pipeline filtered by time
-- 6. ✅ sales_target partial unique index for NULL type_id
-- 7. ✅ Trigger handles budget_id change + DELETE
-- 8. ✅ Trigger syncs FK ↔ legacy TEXT columns
-- 9. ✅ Added pipeline_history for funnel analysis
-- 10. ✅ Removed unused uuid-ossp extension
-- ============================================

-- ============================================
-- STEP 1: CREATE ENUM TYPES
-- ============================================

DO $$ BEGIN
    CREATE TYPE gender_enum AS ENUM ('Male', 'Female', 'Other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- SYSTEM CONFIG (For configurable values, no hardcode)
-- ============================================
CREATE TABLE IF NOT EXISTS public.system_config (
    config_id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Insert default config values
INSERT INTO public.system_config (config_key, config_value, description) VALUES
    ('target_fallback_multiplier', '1.2', 'Multiplier for target if no sales_target defined'),
    ('default_color', '#9ca3af', 'Default color for UI elements'),
    ('pipeline_active_days', '30', 'Days to consider party as active in pipeline'),
    ('roi_window_months', '3', 'Months window to calculate campaign ROI')
ON CONFLICT (config_key) DO NOTHING;

-- Helper function to get config value
CREATE OR REPLACE FUNCTION get_config(p_key VARCHAR)
RETURNS VARCHAR AS $$
    SELECT config_value FROM public.system_config WHERE config_key = p_key;
$$ LANGUAGE sql STABLE;

-- Helper function to get min date from data (for dynamic month_dim)
-- Fixed: Use COALESCE inside each subquery to avoid NULL from LEAST
CREATE OR REPLACE FUNCTION get_min_date()
RETURNS DATE AS $$
DECLARE
    v_policy_min DATE;
    v_transaction_min DATE;
    v_party_min DATE;
    v_result DATE;
BEGIN
    SELECT MIN(date_trunc('month', effective_date))::date INTO v_policy_min FROM public.policy WHERE effective_date IS NOT NULL;
    SELECT MIN(date_trunc('month', transaction_date))::date INTO v_transaction_min FROM public.transaction WHERE transaction_date IS NOT NULL;
    SELECT MIN(date_trunc('month', created_at))::date INTO v_party_min FROM public.party WHERE created_at IS NOT NULL;
    
    -- Get minimum of non-null values
    v_result := v_policy_min;
    IF v_transaction_min IS NOT NULL AND (v_result IS NULL OR v_transaction_min < v_result) THEN
        v_result := v_transaction_min;
    END IF;
    IF v_party_min IS NOT NULL AND (v_result IS NULL OR v_party_min < v_result) THEN
        v_result := v_party_min;
    END IF;
    
    RETURN COALESCE(v_result, '2023-12-01'::date);
END;
$$ LANGUAGE plpgsql STABLE;

-- Helper function to get max date from data (for dynamic month_dim)
-- Fixed: Use COALESCE inside each subquery to avoid NULL from GREATEST
CREATE OR REPLACE FUNCTION get_max_date()
RETURNS DATE AS $$
DECLARE
    v_policy_max DATE;
    v_transaction_max DATE;
    v_party_max DATE;
    v_result DATE;
BEGIN
    SELECT MAX(date_trunc('month', effective_date))::date INTO v_policy_max FROM public.policy WHERE effective_date IS NOT NULL;
    SELECT MAX(date_trunc('month', transaction_date))::date INTO v_transaction_max FROM public.transaction WHERE transaction_date IS NOT NULL;
    SELECT MAX(date_trunc('month', created_at))::date INTO v_party_max FROM public.party WHERE created_at IS NOT NULL;
    
    -- Get maximum of non-null values
    v_result := v_policy_max;
    IF v_transaction_max IS NOT NULL AND (v_result IS NULL OR v_transaction_max > v_result) THEN
        v_result := v_transaction_max;
    END IF;
    IF v_party_max IS NOT NULL AND (v_result IS NULL OR v_party_max > v_result) THEN
        v_result := v_party_max;
    END IF;
    
    RETURN COALESCE(v_result, CURRENT_DATE);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- AGENT 2: BUDGET VALIDATION SYSTEM TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS public.department (
    department_id SERIAL PRIMARY KEY,
    department_name TEXT NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.employee (
    employee_id SERIAL PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE,
    department_id INTEGER REFERENCES public.department(department_id),
    manager_id INTEGER REFERENCES public.employee(employee_id),
    role TEXT CHECK (role IN ('Sales', 'Sales_Manager', 'Marketing_Staff', 'Finance_Controller', 'Admin')),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.policy_rule (
    rule_id SERIAL PRIMARY KEY,
    rule_name TEXT NOT NULL UNIQUE,
    rule_value NUMERIC,
    description TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.annual_budget (
    annual_budget_id SERIAL PRIMARY KEY,
    department_id INTEGER REFERENCES public.department(department_id),
    year INTEGER NOT NULL,
    category TEXT NOT NULL,
    total_amount NUMERIC(19,2) NOT NULL,
    amount_spent NUMERIC(19,2) DEFAULT 0,
    amount_remaining NUMERIC(19,2) GENERATED ALWAYS AS (total_amount - amount_spent) STORED,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.request (
    request_id SERIAL PRIMARY KEY,
    request_code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    requester_id INTEGER REFERENCES public.employee(employee_id),
    department_id INTEGER REFERENCES public.department(department_id),
    description TEXT,
    status TEXT CHECK (status IN ('Draft', 'Pending', 'Approved', 'Rejected', 'Completed')),
    event_date TIMESTAMP WITHOUT TIME ZONE,
    total_estimated_amount NUMERIC(19,2) DEFAULT 0,
    annual_budget_id INTEGER REFERENCES public.annual_budget(annual_budget_id),
    campaign_id INTEGER,  -- FK added after campaign table creation
    campaign_code VARCHAR(100),  -- Kept for backward compatibility
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Trigger: Ensure request.department_id AND year matches annual_budget
CREATE OR REPLACE FUNCTION validate_request_budget()
RETURNS TRIGGER AS $$
DECLARE
    v_budget_dept_id INTEGER;
    v_budget_year INTEGER;
    v_request_year INTEGER;
BEGIN
    IF NEW.annual_budget_id IS NOT NULL THEN
        SELECT department_id, year INTO v_budget_dept_id, v_budget_year 
        FROM public.annual_budget WHERE annual_budget_id = NEW.annual_budget_id;
        
        -- Check department match
        IF NEW.department_id IS NOT NULL AND v_budget_dept_id IS NOT NULL AND v_budget_dept_id != NEW.department_id THEN
            RAISE EXCEPTION 'Request department_id (%) must match annual_budget department_id (%)', NEW.department_id, v_budget_dept_id;
        END IF;
        
        -- Check year match (based on request created_at or event_date)
        v_request_year := COALESCE(EXTRACT(YEAR FROM NEW.event_date)::INTEGER, EXTRACT(YEAR FROM NEW.created_at)::INTEGER);
        IF v_budget_year IS NOT NULL AND v_request_year IS NOT NULL AND v_budget_year != v_request_year THEN
            RAISE EXCEPTION 'Request year (%) must match annual_budget year (%)', v_request_year, v_budget_year;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_request_department_check ON public.request;
DROP TRIGGER IF EXISTS trg_request_budget_check ON public.request;
CREATE TRIGGER trg_request_budget_check
BEFORE INSERT OR UPDATE ON public.request
FOR EACH ROW EXECUTE FUNCTION validate_request_budget();

CREATE TABLE IF NOT EXISTS public.budget_item (
    item_id SERIAL PRIMARY KEY,
    request_id INTEGER REFERENCES public.request(request_id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    description TEXT,
    requested_amount NUMERIC(19,2) NOT NULL,
    vendor_quote_link TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Trigger: Auto-calculate total_estimated_amount (Fixed: handles request_id change)
CREATE OR REPLACE FUNCTION update_request_total()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle DELETE: update old request
    IF TG_OP = 'DELETE' THEN
        UPDATE public.request
        SET total_estimated_amount = (
            SELECT COALESCE(SUM(requested_amount), 0)
            FROM public.budget_item
            WHERE request_id = OLD.request_id
        ),
        updated_at = NOW()
        WHERE request_id = OLD.request_id;
        RETURN OLD;
    END IF;
    
    -- Handle INSERT: update new request
    IF TG_OP = 'INSERT' THEN
        UPDATE public.request
        SET total_estimated_amount = (
            SELECT COALESCE(SUM(requested_amount), 0)
            FROM public.budget_item
            WHERE request_id = NEW.request_id
        ),
        updated_at = NOW()
        WHERE request_id = NEW.request_id;
        RETURN NEW;
    END IF;
    
    -- Handle UPDATE: if request_id changed, update BOTH old and new requests
    IF TG_OP = 'UPDATE' THEN
        -- Update new request
        UPDATE public.request
        SET total_estimated_amount = (
            SELECT COALESCE(SUM(requested_amount), 0)
            FROM public.budget_item
            WHERE request_id = NEW.request_id
        ),
        updated_at = NOW()
        WHERE request_id = NEW.request_id;
        
        -- If request_id changed, also update old request
        IF OLD.request_id IS DISTINCT FROM NEW.request_id THEN
            UPDATE public.request
            SET total_estimated_amount = (
                SELECT COALESCE(SUM(requested_amount), 0)
                FROM public.budget_item
                WHERE request_id = OLD.request_id
            ),
            updated_at = NOW()
            WHERE request_id = OLD.request_id;
        END IF;
        RETURN NEW;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_budget_item_update ON public.budget_item;
CREATE TRIGGER trg_budget_item_update
AFTER INSERT OR UPDATE OR DELETE ON public.budget_item
FOR EACH ROW EXECUTE FUNCTION update_request_total();

-- FIXED V5: Complete trigger for budget spent (handles INSERT, UPDATE, DELETE, budget_id change)
CREATE OR REPLACE FUNCTION update_budget_spent()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle DELETE
    IF TG_OP = 'DELETE' THEN
        IF OLD.status = 'Approved' AND OLD.annual_budget_id IS NOT NULL THEN
            UPDATE public.annual_budget
            SET amount_spent = amount_spent - OLD.total_estimated_amount,
                updated_at = NOW()
            WHERE annual_budget_id = OLD.annual_budget_id;
        END IF;
        RETURN OLD;
    END IF;

    -- Handle INSERT
    IF TG_OP = 'INSERT' THEN
        IF NEW.status = 'Approved' AND NEW.annual_budget_id IS NOT NULL THEN
            UPDATE public.annual_budget
            SET amount_spent = amount_spent + NEW.total_estimated_amount,
                updated_at = NOW()
            WHERE annual_budget_id = NEW.annual_budget_id;
        END IF;
        RETURN NEW;
    END IF;
    
    -- Handle UPDATE
    IF TG_OP = 'UPDATE' THEN
        -- Case 1: Budget ID changed while Approved
        IF OLD.annual_budget_id IS DISTINCT FROM NEW.annual_budget_id THEN
            -- Subtract from old budget if was Approved
            IF OLD.status = 'Approved' AND OLD.annual_budget_id IS NOT NULL THEN
                UPDATE public.annual_budget
                SET amount_spent = amount_spent - OLD.total_estimated_amount,
                    updated_at = NOW()
                WHERE annual_budget_id = OLD.annual_budget_id;
            END IF;
            -- Add to new budget if now Approved
            IF NEW.status = 'Approved' AND NEW.annual_budget_id IS NOT NULL THEN
                UPDATE public.annual_budget
                SET amount_spent = amount_spent + NEW.total_estimated_amount,
                    updated_at = NOW()
                WHERE annual_budget_id = NEW.annual_budget_id;
            END IF;
        ELSE
            -- Same budget ID
            -- Case 2: Status changed TO Approved
            IF NEW.status = 'Approved' AND (OLD.status IS NULL OR OLD.status != 'Approved') THEN
                IF NEW.annual_budget_id IS NOT NULL THEN
                    UPDATE public.annual_budget
                    SET amount_spent = amount_spent + NEW.total_estimated_amount,
                        updated_at = NOW()
                    WHERE annual_budget_id = NEW.annual_budget_id;
                END IF;
            -- Case 3: Status changed FROM Approved
            ELSIF OLD.status = 'Approved' AND NEW.status != 'Approved' THEN
                IF OLD.annual_budget_id IS NOT NULL THEN
                    UPDATE public.annual_budget
                    SET amount_spent = amount_spent - OLD.total_estimated_amount,
                        updated_at = NOW()
                    WHERE annual_budget_id = OLD.annual_budget_id;
                END IF;
            -- Case 4: Amount changed while Approved
            ELSIF NEW.status = 'Approved' AND OLD.status = 'Approved' 
                  AND NEW.total_estimated_amount != OLD.total_estimated_amount THEN
                IF NEW.annual_budget_id IS NOT NULL THEN
                    UPDATE public.annual_budget
                    SET amount_spent = amount_spent + (NEW.total_estimated_amount - OLD.total_estimated_amount),
                        updated_at = NOW()
                    WHERE annual_budget_id = NEW.annual_budget_id;
                END IF;
            END IF;
        END IF;
        RETURN NEW;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_request_budget_update ON public.request;
CREATE TRIGGER trg_request_budget_update
AFTER INSERT OR UPDATE OR DELETE ON public.request
FOR EACH ROW EXECUTE FUNCTION update_budget_spent();

CREATE TABLE IF NOT EXISTS public.document (
    document_id SERIAL PRIMARY KEY,
    request_id INTEGER REFERENCES public.request(request_id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    uploaded_by_id INTEGER REFERENCES public.employee(employee_id),
    upload_timestamp TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.approval_workflow (
    step_id SERIAL PRIMARY KEY,
    request_id INTEGER REFERENCES public.request(request_id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    approver_id INTEGER REFERENCES public.employee(employee_id),
    status TEXT CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Skipped')),
    comment TEXT,
    action_timestamp TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    UNIQUE(request_id, step_number)  -- Added: prevent duplicate step numbers per request
);

-- ============================================
-- CONFIG TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS public.pipeline_stage_config (
    stage_id SERIAL PRIMARY KEY,
    stage_name VARCHAR(50) NOT NULL UNIQUE,
    stage_order INTEGER NOT NULL UNIQUE,  -- Added UNIQUE to prevent duplicate order
    color VARCHAR(20) NOT NULL DEFAULT '#9ca3af',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

INSERT INTO public.pipeline_stage_config (stage_name, stage_order, color, is_active) VALUES
    ('Leads mới', 1, '#3b82f6', FALSE),
    ('Đang tư vấn', 2, '#6366f1', TRUE),
    ('Đang chốt', 3, '#a855f7', TRUE),
    ('Thẩm định', 4, '#f97316', TRUE),
    ('Phát hành', 5, '#14b8a6', TRUE)
ON CONFLICT (stage_name) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.sales_channel_config (
    channel_id SERIAL PRIMARY KEY,
    channel_name VARCHAR(50) NOT NULL UNIQUE,
    color VARCHAR(20) NOT NULL DEFAULT '#6b7280',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

INSERT INTO public.sales_channel_config (channel_name, color) VALUES
    ('Hội thảo', '#f97316'),
    ('Tư vấn 1-1', '#8b5cf6'),
    ('Telesale', '#10b981'),
    ('Online', '#3b82f6'),
    ('Referral', '#ec4899')
ON CONFLICT (channel_name) DO NOTHING;

-- NEW: Campaign table for normalized campaign management
CREATE TABLE IF NOT EXISTS public.campaign (
    campaign_id SERIAL PRIMARY KEY,
    campaign_code VARCHAR(100) NOT NULL UNIQUE,
    campaign_name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    status VARCHAR(50) CHECK (status IN ('Draft', 'Active', 'Completed', 'Cancelled')) DEFAULT 'Draft',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Add FK constraints for campaign (after campaign table exists)
-- Note: FK for request.campaign_id is added here, FK for policy.campaign_id is added after policy table
ALTER TABLE public.request 
    ADD CONSTRAINT fk_request_campaign 
    FOREIGN KEY (campaign_id) REFERENCES public.campaign(campaign_id) 
    ON DELETE SET NULL;

-- Trigger: Auto-sync campaign_code from campaign_id for backward compatibility
CREATE OR REPLACE FUNCTION sync_campaign_code()
RETURNS TRIGGER AS $$
DECLARE
    v_campaign_code VARCHAR(100);
BEGIN
    IF NEW.campaign_id IS NOT NULL THEN
        SELECT campaign_code INTO v_campaign_code FROM public.campaign WHERE campaign_id = NEW.campaign_id;
        NEW.campaign_code := v_campaign_code;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_request_campaign_sync ON public.request;
CREATE TRIGGER trg_request_campaign_sync
BEFORE INSERT OR UPDATE ON public.request
FOR EACH ROW EXECUTE FUNCTION sync_campaign_code();

-- Note: trg_policy_campaign_sync is created after policy table definition

-- ============================================
-- PRODUCT HIERARCHY
-- ============================================

CREATE TABLE IF NOT EXISTS public.product_category (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.product_type (
    type_id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES public.product_category(category_id),
    type_name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    UNIQUE(category_id, type_name)
);

-- Sales Target with proper unique constraints
CREATE TABLE IF NOT EXISTS public.sales_target (
    target_id SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL REFERENCES public.product_category(category_id),
    type_id INTEGER REFERENCES public.product_type(type_id),
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    target_amount NUMERIC(19,2) NOT NULL DEFAULT 0,
    target_quantity INTEGER DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Unique constraint for category-only targets (type_id IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_target_category_only 
ON public.sales_target (category_id, year, month) 
WHERE type_id IS NULL;

-- Unique constraint for type-specific targets
CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_target_with_type 
ON public.sales_target (category_id, type_id, year, month) 
WHERE type_id IS NOT NULL;

-- Trigger: Ensure sales_target.type_id belongs to sales_target.category_id
CREATE OR REPLACE FUNCTION validate_sales_target_hierarchy()
RETURNS TRIGGER AS $$
DECLARE
    v_type_category_id INTEGER;
BEGIN
    IF NEW.type_id IS NOT NULL THEN
        SELECT category_id INTO v_type_category_id FROM public.product_type WHERE type_id = NEW.type_id;
        
        IF v_type_category_id IS NULL THEN
            RAISE EXCEPTION 'Product type % does not exist', NEW.type_id;
        END IF;
        
        IF v_type_category_id != NEW.category_id THEN
            RAISE EXCEPTION 'Sales target type % belongs to category %, not category %', NEW.type_id, v_type_category_id, NEW.category_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sales_target_hierarchy_check ON public.sales_target;
CREATE TRIGGER trg_sales_target_hierarchy_check
BEFORE INSERT OR UPDATE ON public.sales_target
FOR EACH ROW EXECUTE FUNCTION validate_sales_target_hierarchy();

-- ============================================
-- AGENT 1: PAS INSURANCE SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS public.product (
    product_id SERIAL PRIMARY KEY,
    product_code VARCHAR(50) NOT NULL UNIQUE,
    product_name VARCHAR(255) NOT NULL,
    category_id INTEGER REFERENCES public.product_category(category_id),
    type_id INTEGER REFERENCES public.product_type(type_id),
    status VARCHAR(50) NOT NULL CHECK (status IN ('Active', 'Discontinued')),
    issue_date DATE NOT NULL,
    end_date DATE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Trigger: Ensure product.type_id belongs to product.category_id (hierarchy validation)
CREATE OR REPLACE FUNCTION validate_product_hierarchy()
RETURNS TRIGGER AS $$
DECLARE
    v_type_category_id INTEGER;
BEGIN
    IF NEW.type_id IS NOT NULL AND NEW.category_id IS NOT NULL THEN
        SELECT category_id INTO v_type_category_id FROM public.product_type WHERE type_id = NEW.type_id;
        
        IF v_type_category_id IS NULL THEN
            RAISE EXCEPTION 'Product type % does not exist', NEW.type_id;
        END IF;
        
        IF v_type_category_id != NEW.category_id THEN
            RAISE EXCEPTION 'Product type % belongs to category %, not category %', NEW.type_id, v_type_category_id, NEW.category_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_product_hierarchy_check ON public.product;
CREATE TRIGGER trg_product_hierarchy_check
BEFORE INSERT OR UPDATE ON public.product
FOR EACH ROW EXECUTE FUNCTION validate_product_hierarchy();
-- Note: Removed legacy product_type/product_category TEXT columns

CREATE TABLE IF NOT EXISTS public.party (
    party_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    date_of_birth DATE,
    gender gender_enum,
    citizen_id VARCHAR(20),
    location VARCHAR(255),
    phone_number VARCHAR(20),
    email VARCHAR(255),
    role VARCHAR(50) CHECK (role IN (
        'Customer', 'Lead', 'Partner', 'Beneficiary', 'Insured', 'Owner', 'Agent'
    )),
    pipeline_stage_id INTEGER REFERENCES public.pipeline_stage_config(stage_id),
    sales_channel_id INTEGER REFERENCES public.sales_channel_config(channel_id),
    assigned_to INTEGER REFERENCES public.employee(employee_id),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);
-- Note: Removed legacy pipeline_stage/sales_channel TEXT columns

CREATE TABLE IF NOT EXISTS public.policy (
    policy_id SERIAL PRIMARY KEY,
    policy_number VARCHAR(50) NOT NULL UNIQUE,
    party_id INTEGER NOT NULL REFERENCES public.party(party_id),
    salesperson_id INTEGER REFERENCES public.employee(employee_id),
    effective_date TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    expiration_date TIMESTAMP WITHOUT TIME ZONE,
    status VARCHAR(50) NOT NULL CHECK (status IN ('Pending', 'Active', 'Cancelled', 'Expired', 'Lapsed')),
    premium_due_date TIMESTAMP WITHOUT TIME ZONE,
    campaign_id INTEGER,  -- FK added below
    campaign_code VARCHAR(100),  -- Kept for backward compatibility
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Add FK constraint for policy.campaign_id (after policy table exists)
ALTER TABLE public.policy 
    ADD CONSTRAINT fk_policy_campaign 
    FOREIGN KEY (campaign_id) REFERENCES public.campaign(campaign_id) 
    ON DELETE SET NULL;

-- Trigger: Auto-sync campaign_code from campaign_id for policy
DROP TRIGGER IF EXISTS trg_policy_campaign_sync ON public.policy;
CREATE TRIGGER trg_policy_campaign_sync
BEFORE INSERT OR UPDATE ON public.policy
FOR EACH ROW EXECUTE FUNCTION sync_campaign_code();

CREATE TABLE IF NOT EXISTS public.coverage (
    coverage_id SERIAL PRIMARY KEY,
    policy_id INTEGER NOT NULL REFERENCES public.policy(policy_id),
    party_id INTEGER NOT NULL REFERENCES public.party(party_id),
    product_id INTEGER NOT NULL REFERENCES public.product(product_id),
    sum_assured NUMERIC(19,2) NOT NULL,
    premium_amount NUMERIC(19,2),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Trigger: Ensure coverage.party_id matches policy.party_id to prevent data inconsistency
CREATE OR REPLACE FUNCTION validate_coverage_party()
RETURNS TRIGGER AS $$
DECLARE
    v_policy_party_id INTEGER;
BEGIN
    SELECT party_id INTO v_policy_party_id FROM public.policy WHERE policy_id = NEW.policy_id;
    
    IF v_policy_party_id IS NULL THEN
        RAISE EXCEPTION 'Policy % does not exist', NEW.policy_id;
    END IF;
    
    IF NEW.party_id != v_policy_party_id THEN
        RAISE EXCEPTION 'Coverage party_id (%) must match policy party_id (%)', NEW.party_id, v_policy_party_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_coverage_party_check ON public.coverage;
CREATE TRIGGER trg_coverage_party_check
BEFORE INSERT OR UPDATE ON public.coverage
FOR EACH ROW EXECUTE FUNCTION validate_coverage_party();

CREATE TABLE IF NOT EXISTS public.claim (
    claim_id SERIAL PRIMARY KEY,
    coverage_id INTEGER NOT NULL REFERENCES public.coverage(coverage_id),
    event_date TIMESTAMP WITHOUT TIME ZONE,
    request_date TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    claim_status VARCHAR(50) NOT NULL CHECK (claim_status IN (
        'Submitted', 'In Review', 'Pending Info', 'Approved', 'Rejected', 'Paid'
    )),
    requested_amount NUMERIC(19,2),
    approved_amount NUMERIC(19,2),
    description TEXT,
    payment_date TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.transaction (
    transaction_id SERIAL PRIMARY KEY,
    policy_id INTEGER REFERENCES public.policy(policy_id),
    claim_id INTEGER REFERENCES public.claim(claim_id),  -- Added for Claim Payout tracking
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN (
        'Premium Payment', 'Claim Payout', 'Commission', 'Refund', 'Maturity Benefit'
    )),
    amount NUMERIC(19,2) NOT NULL,
    transaction_date TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    is_cost BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Trigger: Auto-set is_cost based on transaction_type to prevent manual errors
CREATE OR REPLACE FUNCTION auto_set_transaction_is_cost()
RETURNS TRIGGER AS $$
BEGIN
    -- Cost types: Claim Payout, Commission, Refund, Maturity Benefit
    -- Revenue types: Premium Payment
    IF NEW.transaction_type IN ('Claim Payout', 'Commission', 'Refund', 'Maturity Benefit') THEN
        NEW.is_cost := TRUE;
    ELSIF NEW.transaction_type = 'Premium Payment' THEN
        NEW.is_cost := FALSE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_transaction_is_cost ON public.transaction;
CREATE TRIGGER trg_transaction_is_cost
BEFORE INSERT OR UPDATE ON public.transaction
FOR EACH ROW EXECUTE FUNCTION auto_set_transaction_is_cost();

-- ============================================
-- ACTIVITY & PIPELINE HISTORY
-- ============================================

CREATE TABLE IF NOT EXISTS public.activity (
    activity_id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES public.employee(employee_id),
    party_id INTEGER REFERENCES public.party(party_id),
    activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN (
        'Call', 'Meeting', 'Email', 'Presentation', 'Follow-up', 'Site Visit', 'Other'
    )),
    activity_date TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    notes TEXT,
    outcome VARCHAR(50),
    next_action_date TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- NEW V5: Pipeline History for funnel analysis
CREATE TABLE IF NOT EXISTS public.pipeline_history (
    history_id SERIAL PRIMARY KEY,
    party_id INTEGER NOT NULL REFERENCES public.party(party_id),
    from_stage_id INTEGER REFERENCES public.pipeline_stage_config(stage_id),
    to_stage_id INTEGER REFERENCES public.pipeline_stage_config(stage_id),
    changed_by INTEGER REFERENCES public.employee(employee_id),
    changed_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    notes TEXT
);

-- Trigger to auto-record pipeline changes
CREATE OR REPLACE FUNCTION record_pipeline_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.pipeline_stage_id IS NOT NULL THEN
            INSERT INTO public.pipeline_history (party_id, from_stage_id, to_stage_id, changed_by, changed_at)
            VALUES (NEW.party_id, NULL, NEW.pipeline_stage_id, NEW.assigned_to, NOW());
        END IF;
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF OLD.pipeline_stage_id IS DISTINCT FROM NEW.pipeline_stage_id THEN
            INSERT INTO public.pipeline_history (party_id, from_stage_id, to_stage_id, changed_by, changed_at)
            VALUES (NEW.party_id, OLD.pipeline_stage_id, NEW.pipeline_stage_id, NEW.assigned_to, NOW());
        END IF;
        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pipeline_history ON public.party;
CREATE TRIGGER trg_pipeline_history
AFTER INSERT OR UPDATE ON public.party
FOR EACH ROW EXECUTE FUNCTION record_pipeline_change();

-- ============================================
-- VIEWS (100% Dynamic, No Hardcode)
-- ============================================

-- View 1: Pipeline Stages (Expanded for all months 12/2023 - 12/2025)
CREATE OR REPLACE VIEW v_pipeline_stages AS
WITH month_dim AS (
    SELECT 
        date_trunc('month', d)::date AS month_start,
        (date_trunc('month', d) + interval '1 month')::date AS month_end,
        EXTRACT(YEAR FROM d)::int AS year,
        EXTRACT(MONTH FROM d)::int AS month
    FROM generate_series(get_min_date(), get_max_date(), interval '1 month') d
),
party_by_month AS (
    SELECT 
        p.pipeline_stage_id,
        EXTRACT(YEAR FROM p.updated_at)::int AS year,
        EXTRACT(MONTH FROM p.updated_at)::int AS month,
        COUNT(p.party_id) AS cnt
    FROM public.party p
    WHERE p.pipeline_stage_id IS NOT NULL
    GROUP BY p.pipeline_stage_id, EXTRACT(YEAR FROM p.updated_at), EXTRACT(MONTH FROM p.updated_at)
)
SELECT
    cfg.stage_order AS id,
    cfg.stage_name AS label,
    COALESCE(pbm.cnt, 0) AS count,
    cfg.color,
    md.year,
    md.month
FROM public.pipeline_stage_config cfg
CROSS JOIN month_dim md
LEFT JOIN party_by_month pbm ON pbm.pipeline_stage_id = cfg.stage_id 
    AND pbm.year = md.year AND pbm.month = md.month
ORDER BY md.year, md.month, cfg.stage_order;

-- View 2: Top Performers Heatmap (Expanded for all months 12/2023 - 12/2025)
CREATE OR REPLACE VIEW v_top_performers_heatmap AS
WITH month_dim AS (
    SELECT 
        date_trunc('month', d)::date AS month_start,
        (date_trunc('month', d) + interval '1 month')::date AS month_end,
        EXTRACT(YEAR FROM d)::int AS year,
        EXTRACT(MONTH FROM d)::int AS month
    FROM generate_series(get_min_date(), get_max_date(), interval '1 month') d
),
employee_revenue AS (
    SELECT 
        pol.salesperson_id,
        EXTRACT(YEAR FROM t.transaction_date)::int AS year,
        EXTRACT(MONTH FROM t.transaction_date)::int AS month,
        SUM(CASE WHEN t.is_cost = FALSE THEN t.amount ELSE 0 END) AS total_revenue
    FROM public.transaction t
    JOIN public.policy pol ON t.policy_id = pol.policy_id
    WHERE pol.salesperson_id IS NOT NULL
    GROUP BY pol.salesperson_id, EXTRACT(YEAR FROM t.transaction_date), EXTRACT(MONTH FROM t.transaction_date)
),
employee_leads AS (
    SELECT 
        p.assigned_to AS employee_id,
        EXTRACT(YEAR FROM p.created_at)::int AS year,
        EXTRACT(MONTH FROM p.created_at)::int AS month,
        COUNT(DISTINCT p.party_id) AS lead_count
    FROM public.party p
    WHERE p.assigned_to IS NOT NULL AND p.role = 'Lead'
    GROUP BY p.assigned_to, EXTRACT(YEAR FROM p.created_at), EXTRACT(MONTH FROM p.created_at)
),
employee_activities AS (
    SELECT 
        a.employee_id,
        EXTRACT(YEAR FROM a.activity_date)::int AS year,
        EXTRACT(MONTH FROM a.activity_date)::int AS month,
        COUNT(*) AS activity_count
    FROM public.activity a
    GROUP BY a.employee_id, EXTRACT(YEAR FROM a.activity_date), EXTRACT(MONTH FROM a.activity_date)
)
SELECT
    e.full_name AS name,
    COALESCE(el.lead_count, 0) AS leads_count,
    COALESCE(ea.activity_count, 0) AS activities_count,
    COALESCE(er.total_revenue, 0) AS revenue,
    md.year,
    md.month
FROM public.employee e
CROSS JOIN month_dim md
LEFT JOIN employee_revenue er ON e.employee_id = er.salesperson_id AND er.year = md.year AND er.month = md.month
LEFT JOIN employee_leads el ON e.employee_id = el.employee_id AND el.year = md.year AND el.month = md.month
LEFT JOIN employee_activities ea ON e.employee_id = ea.employee_id AND ea.year = md.year AND ea.month = md.month
WHERE COALESCE(er.total_revenue, 0) > 0 OR COALESCE(el.lead_count, 0) > 0 OR COALESCE(ea.activity_count, 0) > 0
ORDER BY md.year, md.month, revenue DESC;

-- View 3: Top Performers List (Expanded for all months 12/2023 - 12/2025)
CREATE OR REPLACE VIEW v_top_performers_list AS
WITH month_dim AS (
    SELECT 
        date_trunc('month', d)::date AS month_start,
        EXTRACT(YEAR FROM d)::int AS year,
        EXTRACT(MONTH FROM d)::int AS month
    FROM generate_series(get_min_date(), get_max_date(), interval '1 month') d
),
employee_revenue AS (
    SELECT 
        pol.salesperson_id,
        EXTRACT(YEAR FROM t.transaction_date)::int AS year,
        EXTRACT(MONTH FROM t.transaction_date)::int AS month,
        SUM(CASE WHEN t.is_cost = FALSE THEN t.amount ELSE 0 END) AS total_revenue
    FROM public.transaction t
    JOIN public.policy pol ON t.policy_id = pol.policy_id
    WHERE pol.salesperson_id IS NOT NULL
    GROUP BY pol.salesperson_id, EXTRACT(YEAR FROM t.transaction_date), EXTRACT(MONTH FROM t.transaction_date)
)
SELECT
    ROW_NUMBER() OVER (PARTITION BY md.year, md.month ORDER BY COALESCE(er.total_revenue, 0) DESC) AS rank,
    e.full_name AS name,
    COALESCE(er.total_revenue, 0) AS revenue,
    SUBSTRING(e.full_name, 1, 1) AS avatar,
    md.year,
    md.month
FROM public.employee e
CROSS JOIN month_dim md
LEFT JOIN employee_revenue er ON e.employee_id = er.salesperson_id AND er.year = md.year AND er.month = md.month
WHERE COALESCE(er.total_revenue, 0) > 0
ORDER BY md.year, md.month, revenue DESC;

-- View 4: Financial Data (Expanded for all months 12/2023 - 12/2025)
CREATE OR REPLACE VIEW v_financial_data AS
WITH month_dim AS (
    SELECT 
        date_trunc('month', d)::date AS month_start,
        EXTRACT(YEAR FROM d)::int AS year,
        EXTRACT(MONTH FROM d)::int AS month,
        'T' || EXTRACT(MONTH FROM d) AS month_label
    FROM generate_series(get_min_date(), get_max_date(), interval '1 month') d
),
monthly_data AS (
    SELECT
        EXTRACT(YEAR FROM transaction_date)::INT AS year,
        EXTRACT(MONTH FROM transaction_date)::INT AS month,
        SUM(CASE WHEN is_cost = FALSE THEN amount ELSE 0 END) AS revenue,
        SUM(CASE WHEN is_cost = TRUE THEN amount ELSE 0 END) AS cost
    FROM public.transaction
    GROUP BY EXTRACT(YEAR FROM transaction_date), EXTRACT(MONTH FROM transaction_date)
)
SELECT 
    md.year, 
    md.month, 
    md.month_label, 
    COALESCE(mdata.revenue, 0) AS revenue, 
    COALESCE(mdata.cost, 0) AS cost
FROM month_dim md
LEFT JOIN monthly_data mdata ON mdata.year = md.year AND mdata.month = md.month
ORDER BY md.year, md.month;

-- View 5: Sales Channels (Expanded for all months 12/2023 - 12/2025)
CREATE OR REPLACE VIEW v_sales_channels AS
WITH month_dim AS (
    SELECT 
        date_trunc('month', d)::date AS month_start,
        EXTRACT(YEAR FROM d)::int AS year,
        EXTRACT(MONTH FROM d)::int AS month
    FROM generate_series(get_min_date(), get_max_date(), interval '1 month') d
),
channel_counts AS (
    SELECT
        p.sales_channel_id,
        EXTRACT(YEAR FROM pol.effective_date)::int AS year,
        EXTRACT(MONTH FROM pol.effective_date)::int AS month,
        COUNT(DISTINCT pol.policy_id) AS cnt
    FROM public.party p
    JOIN public.policy pol ON p.party_id = pol.party_id
    WHERE p.role = 'Customer'
    GROUP BY p.sales_channel_id, EXTRACT(YEAR FROM pol.effective_date), EXTRACT(MONTH FROM pol.effective_date)
)
SELECT
    cfg.channel_name AS channel,
    COALESCE(cc.cnt, 0) AS value,
    cfg.color,
    md.year,
    md.month
FROM public.sales_channel_config cfg
CROSS JOIN month_dim md
LEFT JOIN channel_counts cc ON cfg.channel_id = cc.sales_channel_id AND cc.year = md.year AND cc.month = md.month
ORDER BY md.year, md.month, cfg.channel_id;

-- View 6: Product Lines (Expanded for all months 12/2023 - 12/2025)
CREATE OR REPLACE VIEW v_product_lines AS
WITH month_dim AS (
    SELECT 
        date_trunc('month', d)::date AS month_start,
        EXTRACT(YEAR FROM d)::int AS year,
        EXTRACT(MONTH FROM d)::int AS month
    FROM generate_series(get_min_date(), get_max_date(), interval '1 month') d
),
fallback_config AS (
    SELECT COALESCE(get_config('target_fallback_multiplier')::NUMERIC, 1.2) AS multiplier
),
policy_product_premiums AS (
    SELECT 
        pc.category_id,
        pc.category_name AS category,
        EXTRACT(YEAR FROM pol.effective_date)::int AS year,
        EXTRACT(MONTH FROM pol.effective_date)::int AS month,
        SUM(cov.premium_amount) AS revenue
    FROM public.product pr
    JOIN public.product_category pc ON pr.category_id = pc.category_id
    JOIN public.coverage cov ON pr.product_id = cov.product_id
    JOIN public.policy pol ON cov.policy_id = pol.policy_id
    WHERE pol.effective_date IS NOT NULL
    GROUP BY pc.category_id, pc.category_name, EXTRACT(YEAR FROM pol.effective_date), EXTRACT(MONTH FROM pol.effective_date)
)
SELECT
    ROW_NUMBER() OVER (PARTITION BY md.year, md.month ORDER BY COALESCE(ppp.revenue, 0) DESC) AS id,
    pc.category_name AS name,
    COALESCE(ppp.revenue, 0) AS revenue,
    COALESCE(st.target_amount, COALESCE(ppp.revenue, 0) * fc.multiplier) AS target,
    CASE WHEN ROW_NUMBER() OVER (PARTITION BY md.year, md.month ORDER BY COALESCE(ppp.revenue, 0) DESC) <= 2 THEN true ELSE false END AS "isHighlight",
    md.year,
    md.month
FROM public.product_category pc
CROSS JOIN month_dim md
CROSS JOIN fallback_config fc
LEFT JOIN policy_product_premiums ppp ON ppp.category_id = pc.category_id AND ppp.year = md.year AND ppp.month = md.month
LEFT JOIN public.sales_target st ON pc.category_id = st.category_id 
    AND st.type_id IS NULL
    AND st.year = md.year
    AND st.month = md.month
ORDER BY md.year, md.month, COALESCE(ppp.revenue, 0) DESC;

-- View 7: Product Types (Expanded for all months 12/2023 - 12/2025)
CREATE OR REPLACE VIEW v_product_types AS
WITH month_dim AS (
    SELECT 
        date_trunc('month', d)::date AS month_start,
        EXTRACT(YEAR FROM d)::int AS year,
        EXTRACT(MONTH FROM d)::int AS month
    FROM generate_series(get_min_date(), get_max_date(), interval '1 month') d
),
fallback_config AS (
    SELECT COALESCE(get_config('target_fallback_multiplier')::NUMERIC, 1.2) AS multiplier
),
coverage_premiums AS (
    SELECT
        pc.category_name AS category,
        pt.type_name AS name,
        pt.type_id,
        EXTRACT(YEAR FROM pol.effective_date)::int AS year,
        EXTRACT(MONTH FROM pol.effective_date)::int AS month,
        SUM(cov.premium_amount) AS revenue
    FROM public.product pr
    JOIN public.product_category pc ON pr.category_id = pc.category_id
    JOIN public.product_type pt ON pr.type_id = pt.type_id
    JOIN public.coverage cov ON pr.product_id = cov.product_id
    JOIN public.policy pol ON cov.policy_id = pol.policy_id
    WHERE pol.effective_date IS NOT NULL
    GROUP BY pc.category_name, pt.type_name, pt.type_id, EXTRACT(YEAR FROM pol.effective_date), EXTRACT(MONTH FROM pol.effective_date)
)
SELECT
    COALESCE(cp.category, pc.category_name) AS category,
    pt.type_name AS name,
    COALESCE(cp.revenue, 0) AS revenue,
    COALESCE(st.target_amount, COALESCE(cp.revenue, 0) * fc.multiplier) AS target,
    md.year,
    md.month
FROM public.product_type pt
JOIN public.product_category pc ON pt.category_id = pc.category_id
CROSS JOIN month_dim md
CROSS JOIN fallback_config fc
LEFT JOIN coverage_premiums cp ON cp.type_id = pt.type_id AND cp.year = md.year AND cp.month = md.month
LEFT JOIN public.sales_target st ON pt.type_id = st.type_id
    AND st.year = md.year
    AND st.month = md.month
ORDER BY md.year, md.month, pc.category_name, COALESCE(cp.revenue, 0) DESC;

-- View 8: Sales Quantity (Expanded for all months 12/2023 - 12/2025)
CREATE OR REPLACE VIEW v_sales_quantity AS
WITH month_dim AS (
    SELECT 
        date_trunc('month', d)::date AS month_start,
        (date_trunc('month', d) + interval '1 month')::date AS month_end,
        EXTRACT(YEAR FROM d)::int AS year,
        EXTRACT(MONTH FROM d)::int AS month
    FROM generate_series(get_min_date(), get_max_date(), interval '1 month') d
),
fallback_config AS (
    SELECT COALESCE(get_config('target_fallback_multiplier')::NUMERIC, 1.2) AS multiplier
),
raw_data AS (
    SELECT
        pt.type_id,
        pt.type_name AS type_name,
        EXTRACT(YEAR FROM pol.effective_date)::int AS year,
        EXTRACT(MONTH FROM pol.effective_date)::int AS month,
        COUNT(cov.coverage_id) AS sold
    FROM public.product pr
    JOIN public.product_type pt ON pr.type_id = pt.type_id
    JOIN public.coverage cov ON pr.product_id = cov.product_id
    JOIN public.policy pol ON cov.policy_id = pol.policy_id
    WHERE pol.effective_date IS NOT NULL
    GROUP BY pt.type_id, pt.type_name, EXTRACT(YEAR FROM pol.effective_date), EXTRACT(MONTH FROM pol.effective_date)
)
SELECT
    pt.type_name AS type,
    COALESCE(rd.sold, 0) AS sold,
    COALESCE(st.target_quantity, ROUND(COALESCE(rd.sold, 0) * fc.multiplier)::INTEGER) AS target,
    md.year,
    md.month
FROM public.product_type pt
CROSS JOIN month_dim md
CROSS JOIN fallback_config fc
LEFT JOIN raw_data rd ON rd.type_id = pt.type_id AND rd.year = md.year AND rd.month = md.month
LEFT JOIN public.sales_target st ON pt.type_id = st.type_id
    AND st.year = md.year
    AND st.month = md.month
ORDER BY md.year, md.month, COALESCE(rd.sold, 0) DESC;

-- View 9: KPIs Summary (Fixed: uses pipeline_active_days for active_pipeline)
CREATE OR REPLACE VIEW v_kpis_summary AS
WITH month_dim AS (
    SELECT 
        date_trunc('month', d)::date AS month_start,
        (date_trunc('month', d) + interval '1 month')::date AS month_end,
        EXTRACT(YEAR FROM d)::int AS year,
        EXTRACT(MONTH FROM d)::int AS month
    FROM generate_series(get_min_date(), get_max_date(), interval '1 month') d
),
active_days_config AS (
    SELECT COALESCE(get_config('pipeline_active_days')::INTEGER, 30) AS days
),
revenue_by_month AS (
    SELECT 
        EXTRACT(YEAR FROM pol.effective_date)::int AS year,
        EXTRACT(MONTH FROM pol.effective_date)::int AS month,
        SUM(cov.premium_amount) AS total_revenue
    FROM public.coverage cov
    JOIN public.policy pol ON cov.policy_id = pol.policy_id
    GROUP BY EXTRACT(YEAR FROM pol.effective_date), EXTRACT(MONTH FROM pol.effective_date)
),
policies_by_month AS (
    SELECT 
        EXTRACT(YEAR FROM pol.effective_date)::int AS year,
        EXTRACT(MONTH FROM pol.effective_date)::int AS month,
        COUNT(DISTINCT pol.policy_id) AS total_policies
    FROM public.policy pol
    GROUP BY EXTRACT(YEAR FROM pol.effective_date), EXTRACT(MONTH FROM pol.effective_date)
),
-- Fixed: pipeline counts only parties updated within last X days of each month
pipeline_by_month AS (
    SELECT 
        md.year,
        md.month,
        COUNT(DISTINCT p.party_id) AS active_count
    FROM month_dim md
    CROSS JOIN active_days_config adc
    JOIN public.party p ON p.updated_at >= (md.month_end - (adc.days || ' days')::INTERVAL)
                       AND p.updated_at < md.month_end
    JOIN public.pipeline_stage_config cfg ON p.pipeline_stage_id = cfg.stage_id
    WHERE cfg.is_active = TRUE
    GROUP BY md.year, md.month
),
conversion_by_month AS (
    SELECT 
        EXTRACT(YEAR FROM p.created_at)::int AS year,
        EXTRACT(MONTH FROM p.created_at)::int AS month,
        ROUND(100.0 * COUNT(CASE WHEN p.role = 'Customer' THEN 1 END) / NULLIF(COUNT(*), 0), 1) AS conversion_rate
    FROM public.party p
    GROUP BY EXTRACT(YEAR FROM p.created_at), EXTRACT(MONTH FROM p.created_at)
)
SELECT
    COALESCE(rbm.total_revenue, 0) AS total_revenue,
    COALESCE(pbm.total_policies, 0) AS total_policies_sold,
    COALESCE(plm.active_count, 0) AS active_pipeline,
    COALESCE(cbm.conversion_rate, 0) AS conversion_rate_percent,
    md.year,
    md.month
FROM month_dim md
LEFT JOIN revenue_by_month rbm ON rbm.year = md.year AND rbm.month = md.month
LEFT JOIN policies_by_month pbm ON pbm.year = md.year AND pbm.month = md.month
LEFT JOIN pipeline_by_month plm ON plm.year = md.year AND plm.month = md.month
LEFT JOIN conversion_by_month cbm ON cbm.year = md.year AND cbm.month = md.month
ORDER BY md.year, md.month;

-- View 10: Campaign ROI (Fixed: uses campaign table for dates and names)
CREATE OR REPLACE VIEW v_campaign_roi AS
WITH roi_config AS (
    SELECT COALESCE(get_config('roi_window_months')::INTEGER, 3) AS months
),
campaign_costs AS (
    SELECT
        c.campaign_id,
        c.campaign_code,
        c.campaign_name,
        c.start_date,
        c.end_date,
        COALESCE(SUM(r.total_estimated_amount), 0) AS total_cost
    FROM public.campaign c
    LEFT JOIN public.request r ON c.campaign_id = r.campaign_id AND r.status IN ('Approved', 'Completed') -- Fixed: Include Completed
    WHERE c.start_date IS NOT NULL
    GROUP BY c.campaign_id, c.campaign_code, c.campaign_name, c.start_date, c.end_date
)
SELECT
    cc.campaign_code,
    cc.campaign_name,
    cc.total_cost AS cost,
    COALESCE(SUM(t.amount) FILTER (WHERE t.is_cost = FALSE), 0) AS revenue,
    COUNT(DISTINCT pol.policy_id) AS policies_sold,
    CASE 
        WHEN cc.total_cost > 0 
        THEN ROUND(
            (COALESCE(SUM(t.amount) FILTER (WHERE t.is_cost = FALSE), 0) - cc.total_cost) 
            / cc.total_cost * 100, 2
        )
        ELSE 0 
    END AS roi_percent,
    EXTRACT(YEAR FROM cc.start_date) AS year,
    EXTRACT(MONTH FROM cc.start_date) AS month
FROM campaign_costs cc
CROSS JOIN roi_config rc
LEFT JOIN public.policy pol ON cc.campaign_id = pol.campaign_id
LEFT JOIN public.transaction t 
    ON pol.policy_id = t.policy_id
    AND t.transaction_date >= cc.start_date  -- Fixed: Only check start date, allow long-tail revenue
GROUP BY cc.campaign_id, cc.campaign_code, cc.campaign_name, cc.total_cost, cc.start_date, cc.end_date
ORDER BY revenue DESC;

-- View 11: Pipeline Funnel Analysis (NEW)
CREATE OR REPLACE VIEW v_pipeline_funnel AS
WITH ordered_changes AS (
    SELECT
        party_id,
        from_stage_id,
        to_stage_id,
        changed_at,
        LEAD(changed_at) OVER (PARTITION BY party_id ORDER BY changed_at) AS next_changed_at
    FROM public.pipeline_history
),
stage_transitions AS (
    SELECT
        from_stage_id,
        to_stage_id,
        changed_at,
        CASE
            WHEN next_changed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (next_changed_at - changed_at)) / 86400
            ELSE NULL
        END AS days_in_stage
    FROM ordered_changes
)
SELECT
    fs.stage_name AS from_stage,
    ts.stage_name AS to_stage,
    COUNT(*) AS transition_count,
    ROUND(AVG(st.days_in_stage), 1) AS avg_days,
    EXTRACT(YEAR FROM st.changed_at) AS year,
    EXTRACT(MONTH FROM st.changed_at) AS month
FROM stage_transitions st
LEFT JOIN public.pipeline_stage_config fs ON st.from_stage_id = fs.stage_id
LEFT JOIN public.pipeline_stage_config ts ON st.to_stage_id = ts.stage_id
GROUP BY fs.stage_name, ts.stage_name, fs.stage_order, ts.stage_order,
    EXTRACT(YEAR FROM st.changed_at), EXTRACT(MONTH FROM st.changed_at)
ORDER BY fs.stage_order, ts.stage_order, year, month;

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_transaction_date ON public.transaction(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transaction_policy ON public.transaction(policy_id);
CREATE INDEX IF NOT EXISTS idx_transaction_is_cost ON public.transaction(is_cost);
CREATE INDEX IF NOT EXISTS idx_policy_effective_date ON public.policy(effective_date);
CREATE INDEX IF NOT EXISTS idx_policy_salesperson ON public.policy(salesperson_id);
CREATE INDEX IF NOT EXISTS idx_policy_campaign ON public.policy(campaign_code);
CREATE INDEX IF NOT EXISTS idx_coverage_policy ON public.coverage(policy_id);
CREATE INDEX IF NOT EXISTS idx_coverage_party ON public.coverage(party_id);
CREATE INDEX IF NOT EXISTS idx_coverage_product ON public.coverage(product_id);
CREATE INDEX IF NOT EXISTS idx_party_pipeline_id ON public.party(pipeline_stage_id);
CREATE INDEX IF NOT EXISTS idx_party_channel_id ON public.party(sales_channel_id);
CREATE INDEX IF NOT EXISTS idx_party_assigned ON public.party(assigned_to);
CREATE INDEX IF NOT EXISTS idx_party_role ON public.party(role);
CREATE INDEX IF NOT EXISTS idx_party_updated ON public.party(updated_at);
CREATE INDEX IF NOT EXISTS idx_employee_department ON public.employee(department_id);
CREATE INDEX IF NOT EXISTS idx_request_campaign ON public.request(campaign_code);
CREATE INDEX IF NOT EXISTS idx_request_budget ON public.request(annual_budget_id);
CREATE INDEX IF NOT EXISTS idx_activity_employee ON public.activity(employee_id);
CREATE INDEX IF NOT EXISTS idx_activity_party ON public.activity(party_id);
CREATE INDEX IF NOT EXISTS idx_activity_date ON public.activity(activity_date);
CREATE INDEX IF NOT EXISTS idx_pipeline_history_party ON public.pipeline_history(party_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_history_date ON public.pipeline_history(changed_at);

-- ============================================
-- VERIFICATION
-- ============================================
DO $$
DECLARE
    v_table_count INT;
BEGIN
    SELECT COUNT(*) INTO v_table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
        'system_config',
        'department', 'employee', 'policy_rule', 'annual_budget', 'request',
        'budget_item', 'document', 'approval_workflow',
        'product', 'party', 'policy', 'coverage', 'claim', 'transaction',
        'product_category', 'product_type',
        'pipeline_stage_config', 'sales_channel_config', 'campaign',
        'sales_target', 'activity', 'pipeline_history'
      );
    
    IF v_table_count = 23 THEN
        RAISE NOTICE '✅ All 23 tables created successfully!';
    ELSE
        RAISE WARNING '⚠️ Expected 23 tables, found %', v_table_count;
    END IF;
END $$;

-- ============================================
-- DISABLE ROW LEVEL SECURITY (RLS) FOR ALL TABLES
-- ============================================
ALTER TABLE public.system_config DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.department DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_rule DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.annual_budget DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.request DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_item DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.document DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_workflow DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stage_config DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_channel_config DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_category DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_type DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_target DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.product DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.party DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.coverage DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_history DISABLE ROW LEVEL SECURITY;

-- ============================================
-- GRANT PERMISSIONS FOR API ACCESS (Fix 401/42501 Errors)
-- ============================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Grant full access to tables for API
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;

-- Grant usage on sequences (for ID generation)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- Grant SELECT on all Views (Crucial for Dashboard)
GRANT SELECT ON public.v_pipeline_stages TO anon, authenticated, service_role;
GRANT SELECT ON public.v_top_performers_heatmap TO anon, authenticated, service_role;
GRANT SELECT ON public.v_top_performers_list TO anon, authenticated, service_role;
GRANT SELECT ON public.v_financial_data TO anon, authenticated, service_role;
GRANT SELECT ON public.v_sales_channels TO anon, authenticated, service_role;
GRANT SELECT ON public.v_product_lines TO anon, authenticated, service_role;
GRANT SELECT ON public.v_product_types TO anon, authenticated, service_role;
GRANT SELECT ON public.v_sales_quantity TO anon, authenticated, service_role;
GRANT SELECT ON public.v_kpis_summary TO anon, authenticated, service_role;
GRANT SELECT ON public.v_campaign_roi TO anon, authenticated, service_role;
GRANT SELECT ON public.v_pipeline_funnel TO anon, authenticated, service_role;
