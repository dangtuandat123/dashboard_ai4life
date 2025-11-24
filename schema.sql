-- ============================================
-- BEEBOX INTELLIGENCE - DATABASE SCHEMA
-- Database: PostgreSQL (Supabase)
-- Purpose: Create all tables for both Agent 1 (PAS) and Agent 2 (Budget Validation)
-- ============================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM type for Gender
DO $$ BEGIN
    CREATE TYPE gender_enum AS ENUM ('Male', 'Female');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- AGENT 2: BUDGET VALIDATION SYSTEM TABLES
-- ============================================

-- 1. Department
CREATE TABLE IF NOT EXISTS public.department (
    department_id SERIAL PRIMARY KEY,
    department_name TEXT NOT NULL
);

-- 2. Employee
CREATE TABLE IF NOT EXISTS public.employee (
    employee_id SERIAL PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT,
    department_id INTEGER REFERENCES public.department(department_id),
    manager_id INTEGER REFERENCES public.employee(employee_id),
    role TEXT,
    leads_count INTEGER DEFAULT 0,
    activities_count INTEGER DEFAULT 0,
    revenue NUMERIC(15,3) DEFAULT 0  -- Tăng lên 15 để an toàn hơn khi lưu số liệu lớn
);

-- 3. Policy Rule
CREATE TABLE IF NOT EXISTS public.policy_rule (
    rule_id SERIAL PRIMARY KEY,
    rule_name TEXT NOT NULL,
    rule_value NUMERIC,
    description TEXT
);

-- 4. Annual Budget
CREATE TABLE IF NOT EXISTS public.annual_budget (
    annual_budget_id SERIAL PRIMARY KEY,
    department_id INTEGER REFERENCES public.department(department_id),
    year INTEGER,
    category TEXT,
    total_amount NUMERIC NOT NULL,  -- Thêm NOT NULL để tránh generated column trả về NULL
    amount_spent NUMERIC DEFAULT 0,
    amount_remaining NUMERIC GENERATED ALWAYS AS (total_amount - amount_spent) STORED
);

-- 5. Request (Activity Request)
CREATE TABLE IF NOT EXISTS public.request (
    request_id SERIAL PRIMARY KEY,
    request_code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    requester_id INTEGER REFERENCES public.employee(employee_id),
    department_id INTEGER REFERENCES public.department(department_id),
    description TEXT,
    status TEXT CHECK (status IN ('Draft', 'Pending', 'Approved', 'Rejected', 'Completed')),
    created_date TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    total_estimated_amount NUMERIC DEFAULT 0
);

-- 6. Budget Item
CREATE TABLE IF NOT EXISTS public.budget_item (
    item_id SERIAL PRIMARY KEY,
    request_id INTEGER REFERENCES public.request(request_id),
    item_name TEXT NOT NULL,
    description TEXT,
    requested_amount NUMERIC NOT NULL,
    vendor_quote_link TEXT
);

-- 7. Document
CREATE TABLE IF NOT EXISTS public.document (
    document_id SERIAL PRIMARY KEY,
    request_id INTEGER REFERENCES public.request(request_id),
    file_name TEXT,
    file_path TEXT,
    uploaded_by_id INTEGER REFERENCES public.employee(employee_id),
    upload_timestamp TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- 8. Approval Workflow
CREATE TABLE IF NOT EXISTS public.approval_workflow (
    step_id SERIAL PRIMARY KEY,
    request_id INTEGER REFERENCES public.request(request_id),
    step_number INTEGER,
    approver_id INTEGER REFERENCES public.employee(employee_id),
    status TEXT CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Skipped')),
    comment TEXT,
    action_timestamp TIMESTAMP WITHOUT TIME ZONE
);

-- ============================================
-- AGENT 1: PAS INSURANCE SYSTEM TABLES
-- ============================================

-- 1. Product
CREATE TABLE IF NOT EXISTS public.product (
    product_id SERIAL PRIMARY KEY,
    product_code VARCHAR NOT NULL UNIQUE,
    product_name VARCHAR NOT NULL,
    product_type VARCHAR NOT NULL,
    status VARCHAR NOT NULL,
    issue_date DATE NOT NULL,
    end_date DATE,
    product_category VARCHAR(100)
);

-- 2. Party
CREATE TABLE IF NOT EXISTS public.party (
    party_id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    date_of_birth TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    gender gender_enum NOT NULL,
    citizen_id BIGINT,
    location VARCHAR NOT NULL,
    phone_number BIGINT,
    email VARCHAR,
    role VARCHAR,
    pipeline_stage VARCHAR(50),
    sales_channel VARCHAR(50)
);

-- 3. Policy
CREATE TABLE IF NOT EXISTS public.policy (
    policy_id SERIAL PRIMARY KEY,
    policy_number VARCHAR(50) NOT NULL UNIQUE,
    party_id INTEGER NOT NULL REFERENCES public.party(party_id),
    effective_date TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    expiration_date TIMESTAMP WITHOUT TIME ZONE,
    status VARCHAR NOT NULL,
    premium_due_date TIMESTAMP WITHOUT TIME ZONE,
    campaign_code VARCHAR NOT NULL
);

-- 4. Coverage
CREATE TABLE IF NOT EXISTS public.coverage (
    coverage_id SERIAL PRIMARY KEY,
    policy_id INTEGER NOT NULL REFERENCES public.policy(policy_id),
    party_id INTEGER NOT NULL REFERENCES public.party(party_id),
    product_id INTEGER NOT NULL REFERENCES public.product(product_id),
    sum_assured NUMERIC NOT NULL,
    premium_amount NUMERIC
);

-- 5. Claim
CREATE TABLE IF NOT EXISTS public.claim (
    claim_id SERIAL PRIMARY KEY,
    coverage_id INTEGER NOT NULL REFERENCES public.coverage(coverage_id),
    event_date TIMESTAMP WITHOUT TIME ZONE,
    request_date TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    claim_status VARCHAR NOT NULL,
    requested_amount NUMERIC,
    approved_amount NUMERIC,
    description VARCHAR,
    payment_date TIMESTAMP WITHOUT TIME ZONE
);

-- 6. Transaction
CREATE TABLE IF NOT EXISTS public.transaction (
    transaction_id SERIAL PRIMARY KEY,
    policy_id INTEGER REFERENCES public.policy(policy_id),
    transaction_type VARCHAR NOT NULL,
    amount NUMERIC NOT NULL,
    transaction_date TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    is_cost BOOLEAN DEFAULT FALSE,
    transaction_month INTEGER
);

-- View 2: Pipeline Stages
CREATE OR REPLACE VIEW v_pipeline_stages AS
SELECT
    CASE pipeline_stage
        WHEN 'Leads mới' THEN 1
        WHEN 'Đang tư vấn' THEN 2
        WHEN 'Đang chốt' THEN 3
        WHEN 'Thẩm định' THEN 4
        WHEN 'Phát hành' THEN 5
        ELSE 0
    END AS id,
    pipeline_stage AS label,
    COUNT(*) AS count,
    CASE pipeline_stage
        WHEN 'Leads mới' THEN '#3b82f6'
        WHEN 'Đang tư vấn' THEN '#6366f1'
        WHEN 'Đang chốt' THEN '#a855f7'
        WHEN 'Thẩm định' THEN '#f97316'
        WHEN 'Phát hành' THEN '#14b8a6'
        ELSE '#9ca3af'
    END AS color
FROM public.party
WHERE pipeline_stage IS NOT NULL
GROUP BY pipeline_stage
ORDER BY id;

-- View 3: Top Performers Heatmap
CREATE OR REPLACE VIEW v_top_performers_heatmap AS
SELECT
    full_name AS name,
    leads_count AS "nhanVon",
    activities_count AS "hoatDong",
    revenue AS "doanhThu"  -- Giữ nguyên raw value (VNĐ)
FROM public.employee
WHERE revenue > 0
ORDER BY revenue DESC
LIMIT 20;

-- View 4: Top Performers List
CREATE OR REPLACE VIEW v_top_performers_list AS
SELECT
    ROW_NUMBER() OVER (ORDER BY revenue DESC) AS rank,
    full_name AS name,
    revenue AS revenue,  -- Giữ nguyên raw value (VNĐ)
    SUBSTRING(full_name, 1, 1) AS avatar
FROM public.employee
WHERE revenue > 0
ORDER BY revenue DESC
LIMIT 20;

-- View 5: Financial Data (Last 3 Months) - FIXED SORT ORDER
CREATE OR REPLACE VIEW v_financial_data AS
WITH anchor_tx AS (
    SELECT COALESCE(MAX(transaction_date)::date, CURRENT_DATE) AS anchor_date
    FROM public.transaction
),
monthly_data AS (
    SELECT
        TO_CHAR(transaction_date, 'YYYY-MM') as sort_key,  -- Để sort đúng qua năm
        'T' || EXTRACT(MONTH FROM transaction_date) AS month,
        SUM(CASE WHEN is_cost = FALSE THEN amount ELSE 0 END) AS revenue,
        SUM(CASE WHEN is_cost = TRUE THEN amount ELSE 0 END) AS cost
    FROM public.transaction
    CROSS JOIN anchor_tx
    WHERE transaction_date >= DATE_TRUNC('month', anchor_tx.anchor_date) - INTERVAL '2 months'
      AND transaction_date < DATE_TRUNC('month', anchor_tx.anchor_date) + INTERVAL '1 month'
    GROUP BY TO_CHAR(transaction_date, 'YYYY-MM'), EXTRACT(MONTH FROM transaction_date)
)
SELECT month, revenue, cost
FROM monthly_data
ORDER BY sort_key;

-- View 6: Sales Channels
CREATE OR REPLACE VIEW v_sales_channels AS
SELECT
    sales_channel AS channel,
    COUNT(*) AS value,
    CASE sales_channel
        WHEN 'Hội thảo' THEN '#f97316'
        WHEN 'Tư vấn 1-1' THEN '#8b5cf6'
        ELSE '#6b7280'
    END AS color
FROM public.party p
JOIN public.policy pol ON p.party_id = pol.party_id
CROSS JOIN (SELECT COALESCE(MAX(effective_date)::date, CURRENT_DATE) AS anchor_date FROM public.policy) anchor
WHERE p.role = 'Customer' 
  AND p.sales_channel IS NOT NULL
  AND EXTRACT(YEAR FROM pol.effective_date) = EXTRACT(YEAR FROM anchor.anchor_date)
  AND EXTRACT(MONTH FROM pol.effective_date) = EXTRACT(MONTH FROM anchor.anchor_date)
GROUP BY p.sales_channel;

-- View 7: Product Lines (Current Month)
CREATE OR REPLACE VIEW v_product_lines AS
WITH anchor_pol AS (
    SELECT COALESCE(MAX(effective_date)::date, CURRENT_DATE) AS anchor_date
    FROM public.policy
),
policy_product_premiums AS (
    SELECT 
        pr.product_category AS category,
        pol.policy_id,
        SUM(cov.premium_amount) AS policy_premium
    FROM public.product pr
    JOIN public.coverage cov ON pr.product_id = cov.product_id
    JOIN public.policy pol ON cov.policy_id = pol.policy_id
    CROSS JOIN anchor_pol
    WHERE pr.product_category IS NOT NULL
      AND pol.effective_date IS NOT NULL
      AND EXTRACT(YEAR FROM pol.effective_date) = EXTRACT(YEAR FROM anchor_pol.anchor_date)
      AND EXTRACT(MONTH FROM pol.effective_date) = EXTRACT(MONTH FROM anchor_pol.anchor_date)
    GROUP BY pr.product_category, pol.policy_id
)
SELECT
    ROW_NUMBER() OVER (ORDER BY revenue DESC) AS id,
    category AS name,
    revenue,
    target,
    CASE WHEN ROW_NUMBER() OVER (ORDER BY revenue DESC) <= 2 THEN true ELSE false END AS "isHighlight"
FROM (
    SELECT
        category,
        SUM(policy_premium) AS revenue,
        -- Target multiplier: 0.75 (vượt 133%) to 1.35 (đạt 74%)
        -- Hash-based cho consistent randomness
        ROUND(SUM(policy_premium) * (
            0.75 + (hashtext(category)::BIGINT::NUMERIC % 100) / 100.0 * 0.6
        ), 0) AS target
    FROM policy_product_premiums
    GROUP BY category
) subq
ORDER BY revenue DESC;

-- View 8: Product Types (Current Month)  
CREATE OR REPLACE VIEW v_product_types AS
WITH anchor_pol AS (
    SELECT COALESCE(MAX(effective_date)::date, CURRENT_DATE) AS anchor_date
    FROM public.policy
),
coverage_premiums AS (
    SELECT
        pr.product_category AS category,
        pr.product_type AS name,
        cov.coverage_id,
        cov.premium_amount
    FROM public.product pr
    JOIN public.coverage cov ON pr.product_id = cov.product_id
    JOIN public.policy pol ON cov.policy_id = pol.policy_id
    CROSS JOIN anchor_pol
    WHERE pr.product_category IS NOT NULL 
      AND pr.product_type IS NOT NULL
      AND pol.effective_date IS NOT NULL
      AND EXTRACT(YEAR FROM pol.effective_date) = EXTRACT(YEAR FROM anchor_pol.anchor_date)
      AND EXTRACT(MONTH FROM pol.effective_date) = EXTRACT(MONTH FROM anchor_pol.anchor_date)
)
SELECT
    category,
    name,
    SUM(premium_amount) AS revenue,
    -- Target multiplier: 0.7 (vượt 142%) to 1.4 (đạt 71%)
    ROUND(SUM(premium_amount) * (
        0.7 + (hashtext(name)::BIGINT::NUMERIC % 100) / 100.0 * 0.7
    ), 0) AS target
FROM coverage_premiums
GROUP BY category, name
ORDER BY category, revenue DESC;

-- View 9: Sales Quantity (Current Month) - Individual Products with Short Names
CREATE OR REPLACE VIEW v_sales_quantity AS
WITH anchor_pol AS (
    SELECT COALESCE(MAX(effective_date)::date, CURRENT_DATE) AS anchor_date
    FROM public.policy
),
raw_data AS (
    SELECT
        -- Logic rút gọn tên đặt vào đây
        REPLACE(
            REPLACE(
                REPLACE(pr.product_name, 'Bảo hiểm ', ''),
                ' cá nhân', ''),
            ' toàn diện', '') AS type_name,
        cov.coverage_id
    FROM public.product pr
    JOIN public.coverage cov ON pr.product_id = cov.product_id
    JOIN public.policy pol ON cov.policy_id = pol.policy_id
    JOIN anchor_pol ON TRUE
    WHERE pol.effective_date IS NOT NULL
      AND EXTRACT(YEAR FROM pol.effective_date) = EXTRACT(YEAR FROM anchor_pol.anchor_date)
      AND EXTRACT(MONTH FROM pol.effective_date) = EXTRACT(MONTH FROM anchor_pol.anchor_date)
)
SELECT
    type_name AS type,
    COUNT(coverage_id) AS sold,
    -- Target multiplier: 0.75 (vượt 133%) to 1.35 (đạt 74%)
    ROUND(COUNT(coverage_id) * (
        0.75 + (hashtext(type_name)::BIGINT::NUMERIC % 100) / 100.0 * 0.6
    ))::INTEGER AS target
FROM raw_data
GROUP BY type_name  -- Group by đúng tên đã rút gọn
ORDER BY sold DESC
LIMIT 10;


-- View 10: KPIs Summary (Last 3 Months)
CREATE OR REPLACE VIEW v_kpis_summary AS
WITH anchor_pol AS (
    SELECT COALESCE(MAX(effective_date)::date, CURRENT_DATE) AS anchor_date
    FROM public.policy
)
SELECT
    (SELECT SUM(cov.premium_amount)
     FROM public.coverage cov
     JOIN public.policy pol ON cov.policy_id = pol.policy_id
     WHERE pol.effective_date >= DATE_TRUNC('month', anchor_pol.anchor_date)
       AND pol.effective_date < DATE_TRUNC('month', anchor_pol.anchor_date) + INTERVAL '1 month') AS total_revenue_millions,
    
    (SELECT COUNT(DISTINCT pol.policy_id)
     FROM public.policy pol
     WHERE pol.effective_date >= DATE_TRUNC('month', anchor_pol.anchor_date)
       AND pol.effective_date < DATE_TRUNC('month', anchor_pol.anchor_date) + INTERVAL '1 month') AS total_policies_sold,
    
    (SELECT COUNT(*)
     FROM public.party
     WHERE pipeline_stage IN ('Đang tư vấn', 'Đang chốt', 'Thẩm định', 'Phát hành')) AS active_pipeline,
    
    (SELECT ROUND(100.0 * COUNT(CASE WHEN role = 'Customer' THEN 1 END) / NULLIF(COUNT(*), 0), 1)
     FROM public.party) AS conversion_rate_percent
FROM anchor_pol;

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
        'department', 'employee', 'policy_rule', 'annual_budget', 'request',
        'budget_item', 'document', 'approval_workflow',
        'product', 'party', 'policy', 'coverage', 'claim', 'transaction'
      );
    
    IF v_table_count = 14 THEN
        -- Success
    ELSE
        -- Warning
    END IF;
END $$;

-- Performance Optimization
CREATE INDEX IF NOT EXISTS idx_transaction_date ON public.transaction(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transaction_policy ON public.transaction(policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_effective_date ON public.policy(effective_date);
CREATE INDEX IF NOT EXISTS idx_coverage_policy ON public.coverage(policy_id);
CREATE INDEX IF NOT EXISTS idx_party_pipeline ON public.party(pipeline_stage);
