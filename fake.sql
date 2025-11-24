-- ============================================
-- BEEBOX INTELLIGENCE - REALISTIC DATA GENERATION
-- Database: PostgreSQL (Supabase)
-- Period: Dynamic (Current Quarter/Month)
-- Design: Production-quality data with accurate business logic
-- ============================================

-- Clean up existing data
DO $$ BEGIN TRUNCATE TABLE public.transaction CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN TRUNCATE TABLE public.claim CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN TRUNCATE TABLE public.coverage CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN TRUNCATE TABLE public.policy CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN TRUNCATE TABLE public.party CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN TRUNCATE TABLE public.product CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN TRUNCATE TABLE public."employee" CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN TRUNCATE TABLE public."department" CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN TRUNCATE TABLE public."document" CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN TRUNCATE TABLE public."budget_item" CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN TRUNCATE TABLE public."approval_workflow" CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN TRUNCATE TABLE public."request" CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN TRUNCATE TABLE public."policy_rule" CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN TRUNCATE TABLE public."annual_budget" CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- ============================================
-- CONFIGURATION PARAMETERS (Realistic Business Rules)
-- ============================================

DO $$
DECLARE
    -- Commission & Cost Rates
    COMMISSION_RATE NUMERIC := 0.15;  -- 15% commission
    OPERATIONAL_COST_MIN NUMERIC := 0.35;  -- 35% minimum operational cost
    OPERATIONAL_COST_MAX NUMERIC := 0.50;  -- 50% maximum operational cost
    
    -- Claim Statistics
    CLAIM_PROBABILITY NUMERIC := 0.03;  -- 3% of coverages will have claims (realistic for 3-month period)
    CLAIM_APPROVAL_RATE NUMERIC := 0.70;  -- 70% claims approved
    CLAIM_AMOUNT_RATIO_MIN NUMERIC := 0.05;  -- Claim is 5-50% of sum assured
    CLAIM_AMOUNT_RATIO_MAX NUMERIC := 0.50;
    
    -- Pipeline Conversion Rates (Realistic Funnel)
    LEAD_TO_CONSULT_RATE NUMERIC := 0.80;  -- 80% leads move to consultation
    CONSULT_TO_CLOSING_RATE NUMERIC := 0.60;  -- 60% move to closing stage
    CLOSING_TO_UNDERWRITING_RATE NUMERIC := 0.40;  -- 40% reach underwriting
    UNDERWRITING_TO_ISSUED_RATE NUMERIC := 0.50;  -- 50% get issued
    
    -- Sales Growth Parameters
    BASE_POLICIES_PER_MONTH INT := 50;  -- Base number of policies
    GROWTH_VARIANCE NUMERIC := 0.20;  -- ±20% variance per month
    
    v_total_leads INT;
    v_total_policies_needed INT;
    v_month_count INT;
    v_monthly_counts INT[] := ARRAY[]::INT[]; -- Store monthly counts for consistency
    
    -- Dynamic Date Variables
    -- Anchor theo thời gian hiện tại (động 3 tháng gần nhất)
    v_anchor_date DATE := CURRENT_DATE;
    v_current_year INT := EXTRACT(YEAR FROM v_anchor_date);
    v_current_month INT := EXTRACT(MONTH FROM v_anchor_date);
    v_start_date DATE := DATE_TRUNC('month', v_anchor_date) - INTERVAL '2 months';
    v_end_date DATE := LEAST(v_anchor_date, (DATE_TRUNC('month', v_anchor_date) + INTERVAL '1 month' - INTERVAL '1 day')::DATE);
    
    -- Name Arrays
    v_last_names TEXT[] := ARRAY['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý'];
    v_middle_names TEXT[] := ARRAY['Văn', 'Thị', 'Minh', 'Đức', 'Thành', 'Ngọc', 'Quang', 'Tuấn', 'Hải', 'Thanh', 'Xuân', 'Thu', 'Hồng', 'Gia', 'Bảo'];
    v_first_names TEXT[] := ARRAY['Hùng', 'Dũng', 'Cường', 'Long', 'Hải', 'Phong', 'Lan', 'Mai', 'Hoa', 'Hương', 'Thảo', 'Trang', 'Linh', 'Huyền', 'Tâm', 'An', 'Bình', 'Sơn', 'Tùng', 'Nam'];
    
    v_event_date TIMESTAMP;
    v_request_date TIMESTAMP;
    v_payment_date TIMESTAMP;
    r RECORD;  -- dùng cho các vòng FOR IN SELECT
BEGIN
    
    -- ============================================
    -- AGENT 2: BUDGET VALIDATION SYSTEM
    -- ============================================
    
    -- 1. Departments
    INSERT INTO public."department" ("department_id", "department_name") VALUES
    (1, 'Sales ATO - Vùng 1'),
    (2, 'Sales ATO - Vùng 2'),
    (3, 'Marketing'),
    (4, 'Tài chính'),
    (5, 'Operations')
    ON CONFLICT (department_id) DO UPDATE SET department_name = EXCLUDED.department_name;
    
    -- 2. Employees with realistic hierarchy
    INSERT INTO public."employee" ("employee_id", "full_name", "email", "department_id", "manager_id", "role", leads_count, activities_count, revenue)
    VALUES (1, 'Nguyễn Văn CEO', 'ceo@beebox.vn', 1, NULL, 'CEO', 0, 0, 0)
    ON CONFLICT (employee_id) DO UPDATE SET full_name = EXCLUDED.full_name;
    
    INSERT INTO public."employee" ("employee_id", "full_name", "email", "department_id", "manager_id", "role", leads_count, activities_count, revenue)
    VALUES
    (2, 'Trần Thị Giám Đốc 1', 'gdv1@beebox.vn', 1, 1, 'Sales_Manager', 0, 0, 0),
    (3, 'Lê Hoàng Marketing', 'marketing@beebox.vn', 3, 1, 'Marketing_Manager', 0, 0, 0),
    (4, 'Phạm Minh Finance', 'finance@beebox.vn', 4, 1, 'Finance_Controller', 0, 0, 0),
    (5, 'Nguyễn Thị Giám Đốc 2', 'gdv2@beebox.vn', 2, 1, 'Sales_Manager', 0, 0, 0)
    ON CONFLICT (employee_id) DO UPDATE SET full_name = EXCLUDED.full_name;
    
    PERFORM setval('employee_employee_id_seq', (SELECT MAX(employee_id) FROM public.employee));
    
    -- Sales Team
    INSERT INTO public."employee" ("full_name", "email", "department_id", "manager_id", "role", leads_count, activities_count, revenue)
    SELECT
        v_last_names[1 + floor(random() * array_length(v_last_names, 1))::int] || ' ' ||
        v_middle_names[1 + floor(random() * array_length(v_middle_names, 1))::int] || ' ' ||
        v_first_names[1 + floor(random() * array_length(v_first_names, 1))::int],
        'sales' || i || '@beebox.vn',
        CASE WHEN i % 2 = 0 THEN 2 ELSE 1 END, -- Phân bổ đều vào Dept 1 và 2
        CASE WHEN i % 2 = 0 THEN 5 ELSE 2 END, -- Manager tương ứng (5 cho Dept 2, 2 cho Dept 1)
        'Sales',
        CASE WHEN i <= 2 THEN (100 + RANDOM() * 50)::INT ELSE (50 + RANDOM() * 50)::INT END,
        CASE WHEN i <= 2 THEN (90 + RANDOM() * 40)::INT ELSE (45 + RANDOM() * 45)::INT END,
        0  -- Will be calculated from actual transactions
    FROM generate_series(1, 50) i;
    
    -- 3. Policy Rules
    INSERT INTO public."policy_rule" ("rule_name", "rule_value", "description") VALUES
    ('Định mức quà tặng', 300000, 'Chi phí quà tặng không quá 300.000 VNĐ/khách'),
    ('Định mức thuê hội trường', 10000000, 'Chi phí thuê hội trường không quá 10 triệu VNĐ/sự kiện'),
    ('Định mức tea-break', 150000, 'Chi phí tea-break không quá 150.000 VNĐ/khách'),
    ('Tỷ lệ hoa hồng tối đa', 20, 'Hoa hồng không được vượt quá 20%')
    ON CONFLICT DO NOTHING;
    
    -- 4. Annual Budgets
    INSERT INTO public."annual_budget" ("department_id", "year", "category", "total_amount", "amount_spent")
    SELECT
        dept.department_id,
        v_current_year,
        category_name,
        (base_budget * dept_multiplier * (0.8 + RANDOM() * 0.4))::BIGINT,
        (base_budget * dept_multiplier * (0.5 + RANDOM() * 0.3))::BIGINT
    FROM public."department" dept
    CROSS JOIN LATERAL (
        SELECT * FROM (VALUES
            ('Hội thảo khách hàng', 3000000000::BIGINT, 
             CASE WHEN dept.department_name LIKE '%Sales%' THEN 1.5 ELSE 0.8 END),
            ('Thi đua bán hàng', 2000000000::BIGINT,
             CASE WHEN dept.department_name LIKE '%Sales%' THEN 1.2 ELSE 0.5 END),
            ('Chiến dịch Marketing', 2500000000::BIGINT,
             CASE WHEN dept.department_name = 'Marketing' THEN 1.8 ELSE 0.3 END)
        ) AS t(category_name, base_budget, dept_multiplier)
    ) categories
    ON CONFLICT DO NOTHING;
    
    -- 5. Activity Requests
    INSERT INTO public."request" ("request_code", "title", "requester_id", "department_id", "description", "status", "created_date", "total_estimated_amount")
    SELECT
        'REQ-' || v_current_year || '-' || LPAD(dates.month_num::TEXT, 2, '0') || '-' || LPAD(req_num::TEXT, 3, '0'),
        event_types.event_name || ' Tháng ' || dates.month_num || '/' || v_current_year,
        dept_map.requester_id,
        dept_map.department_id,
        'Sự kiện ' || event_types.event_type || ' với ' || (50 + RANDOM() * 200)::INT || ' khách hàng',
        CASE 
            WHEN request_created_date < v_end_date - INTERVAL '15 days' THEN 
                CASE WHEN RANDOM() < 0.95 THEN 'Approved' ELSE 'Completed' END
            WHEN request_created_date < v_end_date - INTERVAL '5 days' THEN
                CASE WHEN RANDOM() < 0.80 THEN 'Approved' ELSE 'Pending' END
            ELSE 'Pending'
        END,
        request_created_date,
        0
    FROM generate_series(0, 2) month_offset
    CROSS JOIN generate_series(1, 2) req_num
    CROSS JOIN LATERAL (
        SELECT * FROM (VALUES
            ('hội thảo', 'Hội thảo Sống Khỏe'),
            ('workshop', 'Workshop Bảo vệ Gia đình'),
            ('tri ân', 'Sự kiện Tri ân Khách hàng')
        ) AS t(event_type, event_name)
        ORDER BY RANDOM() LIMIT 1
    ) event_types
    CROSS JOIN LATERAL (
        SELECT 
            start_of_month AS start_dt,
            month_end AS end_dt,
            start_of_month + (RANDOM() * (month_end - start_of_month))::INT * INTERVAL '1 day' AS request_created_date,
            EXTRACT(MONTH FROM start_of_month)::INT AS month_num
        FROM (
            SELECT 
                (DATE_TRUNC('month', v_start_date) + month_offset * INTERVAL '1 month')::DATE AS start_of_month,
                CASE 
                    WHEN (DATE_TRUNC('month', v_start_date) + month_offset * INTERVAL '1 month')::DATE = DATE_TRUNC('month', v_end_date)
                        THEN v_end_date
                    ELSE ((DATE_TRUNC('month', v_start_date) + month_offset * INTERVAL '1 month') + INTERVAL '1 month' - INTERVAL '1 day')::DATE
                END AS month_end
        ) lim
    ) dates
    CROSS JOIN LATERAL (
        SELECT
            dept_id AS department_id,
            COALESCE(
                (SELECT e.employee_id FROM public.employee e WHERE e.department_id = dept_id ORDER BY RANDOM() LIMIT 1),
                1  -- fallback CEO if chưa có nhân sự phòng ban
            ) AS requester_id
        FROM (VALUES ((ARRAY[1,2,3,4,5])[1 + (RANDOM()*4)::INT])) AS pick(dept_id)
    ) dept_map
    ON CONFLICT ("request_code") DO NOTHING;
    
    -- ============================================
    -- AGENT 1: INSURANCE DATA GENERATION
    -- ============================================
    
    -- 1. Products
    INSERT INTO public.product (product_code, product_name, product_type, status, issue_date, end_date, product_category)
    VALUES 
    ('BH-SK-001', 'Bảo hiểm Sức khỏe Toàn diện', 'Bảo vệ sức khỏe', 'Active', '2023-01-01', NULL, 'Bảo hiểm sức khỏe'),
    ('BH-NT-001', 'Bảo hiểm Nhân thọ Trọn đời', 'Bảo vệ 100%', 'Active', '2023-01-01', NULL, 'Bảo hiểm nhân thọ'),
    ('BH-GD-001', 'Bảo hiểm Giáo dục Tương lai', 'Giáo dục', 'Active', '2023-06-01', NULL, 'Bảo hiểm giáo dục'),
    ('BH-HT-001', 'Bảo hiểm Hưu trí An nhàn', 'Hưu trí', 'Active', '2023-06-01', NULL, 'Bảo hiểm hưu trí'),
    ('BH-TN-001', 'Bảo hiểm Tai nạn 24/7', 'Tai nạn', 'Active', '2023-01-01', NULL, 'Bảo hiểm tai nạn'),
    ('BH-BHI-001', 'Bảo hiểm Bệnh hiểm nghèo', 'Bệnh hiểm nghèo', 'Active', '2023-03-01', NULL, 'Bảo hiểm bệnh hiểm nghèo'),
    ('BH-DL-001', 'Bảo hiểm Du lịch Quốc tế', 'Du lịch', 'Active', '2023-01-01', NULL, 'Bảo hiểm du lịch'),
    ('BH-NHA-001', 'Bảo hiểm Nhà tư nhân', 'Tài sản', 'Active', '2023-01-01', NULL, 'Bảo hiểm tài sản'),
    ('BH-OTO-001', 'Bảo hiểm Vật chất Xe ô tô', 'Xe cơ giới', 'Active', '2023-01-01', NULL, 'Bảo hiểm xe cơ giới'),
    ('ILP-DT-001', 'Bảo hiểm Liên kết Đầu tư', 'Đầu tư', 'Active', '2024-01-01', NULL, 'Bảo hiểm liên kết đầu tư'),
    ('BH-UT-001', 'Bảo hiểm Ung thư 360', 'Bệnh hiểm nghèo', 'Active', '2024-01-01', NULL, 'Bảo hiểm bệnh hiểm nghèo'),
    ('HTTH-TS-001', 'Bảo hiểm thưởng sống cao', 'Thưởng sống', 'Active', '2024-01-01', NULL, 'Bảo hiểm nhân thọ'),
    -- [NEW] Additional Products for Variety
    ('BH-SK-002', 'Bảo hiểm Nha khoa Cao cấp', 'Nha khoa', 'Active', '2024-01-01', NULL, 'Bảo hiểm sức khỏe'),
    ('BH-SK-003', 'Bảo hiểm Thai sản Hạnh phúc', 'Thai sản', 'Active', '2024-01-01', NULL, 'Bảo hiểm sức khỏe'),
    ('BH-SK-004', 'Bảo hiểm Trợ cấp Y tế', 'Trợ cấp', 'Active', '2024-01-01', NULL, 'Bảo hiểm sức khỏe'),
    ('BH-NT-002', 'Bảo hiểm Tử kỳ Linh hoạt', 'Tử kỳ', 'Active', '2024-01-01', NULL, 'Bảo hiểm nhân thọ'),
    ('BH-NT-003', 'Bảo hiểm Hỗn hợp Tích lũy', 'Hỗn hợp', 'Active', '2024-01-01', NULL, 'Bảo hiểm nhân thọ'),
    ('BH-OTO-002', 'Bảo hiểm TNDS Ô tô', 'TNDS', 'Active', '2024-01-01', NULL, 'Bảo hiểm xe cơ giới'),
    ('BH-OTO-003', 'Bảo hiểm Vật chất Xe máy', 'Xe máy', 'Active', '2024-01-01', NULL, 'Bảo hiểm xe cơ giới'),
    ('BH-NHA-002', 'Bảo hiểm Cháy nổ Bắt buộc', 'Tài sản', 'Active', '2024-01-01', NULL, 'Bảo hiểm tài sản'),
    ('BH-DL-002', 'Bảo hiểm Du lịch Trong nước', 'Du lịch', 'Active', '2024-01-01', NULL, 'Bảo hiểm du lịch'),
    ('BH-TN-002', 'Bảo hiểm Tai nạn Lao động', 'Tai nạn', 'Active', '2024-01-01', NULL, 'Bảo hiểm tai nạn'),
    ('BH-GD-002', 'Bảo hiểm Học vấn Toàn diện', 'Giáo dục', 'Active', '2024-01-01', NULL, 'Bảo hiểm giáo dục'),
    ('BH-HT-002', 'Bảo hiểm Hưu trí Tự nguyện', 'Hưu trí', 'Active', '2024-01-01', NULL, 'Bảo hiểm hưu trí'),
    ('ILP-DT-002', 'Bảo hiểm Đầu tư Thịnh vượng', 'Đầu tư', 'Active', '2024-01-01', NULL, 'Bảo hiểm liên kết đầu tư')
    ON CONFLICT (product_code) DO NOTHING;
    
    -- 2. Calculate total policies needed (Using Array for Consistency)
    v_total_policies_needed := 0;
    FOR r IN 
        SELECT generate_series(
            DATE_TRUNC('month', v_start_date)::DATE,
            DATE_TRUNC('month', v_end_date)::DATE,
            INTERVAL '1 month'
        ) as d
    LOOP
        v_month_count := (BASE_POLICIES_PER_MONTH * (1 + (RANDOM() * 2 - 1) * GROWTH_VARIANCE))::INT;
        v_monthly_counts := array_append(v_monthly_counts, v_month_count);
        v_total_policies_needed := v_total_policies_needed + v_month_count;
    END LOOP;
    
    -- Calculate required leads based on funnel
    v_total_leads := (v_total_policies_needed / 
                      (LEAD_TO_CONSULT_RATE * CONSULT_TO_CLOSING_RATE * 
                       CLOSING_TO_UNDERWRITING_RATE * UNDERWRITING_TO_ISSUED_RATE))::INT;
    
    -- 3. Party - Pipeline Prospects (Fixed Funnel Logic)
    -- Calculate cumulative probabilities based on conversion rates
    -- Leads (100%) -> Consult (80%) -> Closing (48%) -> Underwriting (19.2%) -> Issued (9.6%)
    -- Prospects distribution:
    -- Leads Only: 20% (1 - 0.8)
    -- Consult Only: 32% (0.8 * (1 - 0.6))
    -- Closing Only: 28.8% (0.8 * 0.6 * (1 - 0.4))
    -- Underwriting Only: 19.2% (Remaining)
    WITH lead_pool AS (
        SELECT 
            gs AS i,
            ROW_NUMBER() OVER () AS rn,
            COUNT(*) OVER () AS total_leads
        FROM generate_series(1, v_total_leads) gs
    )
    INSERT INTO public.party (name, gender, date_of_birth, citizen_id, location, phone_number, email, role, pipeline_stage, sales_channel)
    SELECT
        v_last_names[1 + floor(random() * array_length(v_last_names, 1))::int] || ' ' ||
        v_middle_names[1 + floor(random() * array_length(v_middle_names, 1))::int] || ' ' ||
        v_first_names[1 + floor(random() * array_length(v_first_names, 1))::int],
        (ARRAY['Male'::gender_enum, 'Female'::gender_enum])[1 + (RANDOM())::int],
        -- đảm bảo tuổi 18-60
        (CURRENT_DATE - INTERVAL '60 years') + ((RANDOM() * (42 * 365))::INT) * INTERVAL '1 day',
        (100000000000 + (RANDOM() * 899999999999)::BIGINT), -- 12-digit citizen id
        (ARRAY['Hà Nội', 'TP.HCM', 'Đà Nẵng', 'Cần Thơ', 'Hải Phòng'])[1 + (RANDOM() * 4)::int],
        (84000000000 + (RANDOM() * 999999999)::BIGINT), -- Số E.164: +84 và 9 chữ số
        'prospect' || lp.i || '@example.com',
        'Prospect',
        -- Phân bổ deterministic theo tỷ lệ để luôn đủ 4 stage
        CASE 
            WHEN lp.rn <= lp.total_leads * 0.20 THEN 'Leads mới'         -- 20%
            WHEN lp.rn <= lp.total_leads * 0.52 THEN 'Đang tư vấn'       -- 32%
            WHEN lp.rn <= lp.total_leads * 0.81 THEN 'Đang chốt'         -- 29%
            ELSE 'Thẩm định'                                            -- 19%
        END,
        CASE WHEN RANDOM() < 0.6 THEN 'Hội thảo' ELSE 'Tư vấn 1-1' END
    FROM lead_pool lp;
    
    -- 4. Chuyển đổi Prospects -> Customers và tạo Policy + Coverage
    -- 4a. Chuẩn bị kế hoạch phát hành theo từng tháng (3 tháng gần nhất)
    CREATE TEMP TABLE tmp_issue_plan AS
    WITH month_plan AS (
        SELECT 
            idx,
            v_monthly_counts[idx] AS qty,
            DATE_TRUNC('month', v_start_date) + (idx - 1) * INTERVAL '1 month' AS month_start,
            SUM(v_monthly_counts[idx]) OVER (ORDER BY idx) AS cum_end
        FROM generate_subscripts(v_monthly_counts, 1) AS idx
    )
    SELECT 
        idx,
        qty,
        month_start,
        cum_end,
        COALESCE(LAG(cum_end) OVER (ORDER BY idx), 0) + 1 AS cum_start
    FROM month_plan;

    -- 4b. Chọn prospects theo kế hoạch và đánh dấu thành khách hàng phát hành
    CREATE TEMP TABLE tmp_issue AS
    WITH prospect_pool AS (
        SELECT party_id, ROW_NUMBER() OVER (ORDER BY party_id) AS rn
        FROM public.party
        WHERE role = 'Prospect'
          AND pipeline_stage IN ('Đang chốt', 'Thẩm định')
    )
    SELECT 
        p.party_id,
        plan.month_start
    FROM tmp_issue_plan plan
    JOIN prospect_pool p
      ON p.rn BETWEEN plan.cum_start AND plan.cum_end;

    UPDATE public.party pt
    SET role = 'Customer',
        pipeline_stage = 'Phát hành',
        sales_channel = COALESCE(pt.sales_channel, 'Tư vấn 1-1')
    FROM tmp_issue t
    WHERE pt.party_id = t.party_id;

    -- 4c. Tạo policy (hiệu lực trong tháng phát hành) cho các khách hàng được chọn
    CREATE TEMP TABLE tmp_policy AS
    WITH base AS (
        SELECT 
            t.party_id,
            t.month_start,
            ROW_NUMBER() OVER (ORDER BY t.party_id) AS rn,
            eff.eff_date
        FROM tmp_issue t
        CROSS JOIN LATERAL (
            SELECT 
                GREATEST(t.month_start::date, v_start_date) AS eff_start,
                LEAST((t.month_start + INTERVAL '27 days')::date, v_end_date) AS eff_end
        ) bounds
        CROSS JOIN LATERAL (
            SELECT GREATEST((bounds.eff_end - bounds.eff_start), 0) AS offset_days
        ) o
        CROSS JOIN LATERAL (
            SELECT bounds.eff_start + (RANDOM() * o.offset_days)::INT * INTERVAL '1 day' AS eff_date
        ) eff
    ),
    start_num AS (
        SELECT COALESCE(MAX(NULLIF(regexp_replace(policy_number, '\D', '', 'g'), '')::INTEGER), 0) AS base_num FROM public.policy
    ),
    ins AS (
        INSERT INTO public.policy (policy_number, party_id, effective_date, expiration_date, status, premium_due_date, campaign_code)
        SELECT
            'POL-' || LPAD((start_num.base_num + base.rn)::TEXT, 8, '0'),                     -- duy trì unique, nối tiếp dữ liệu cũ
            base.party_id,
            base.eff_date,
            base.eff_date + INTERVAL '1 year' - INTERVAL '1 day',
            'Active',
            base.eff_date + INTERVAL '1 year', -- Annual Premium: Due date is next year
            'CMP-' || TO_CHAR(base.eff_date, 'YYYYMM')
        FROM base
        CROSS JOIN start_num
        RETURNING policy_id, party_id, effective_date
    )
    SELECT * FROM ins;

    -- 4d. Tạo coverage (1-2 sản phẩm/policy) với phí và số tiền bảo hiểm thực tế
    WITH product_pool AS (
        SELECT 
            product_id,
            product_category,
            ROW_NUMBER() OVER (ORDER BY product_id) - 1 AS idx,
            COUNT(*) OVER () AS total_cnt
        FROM public.product
        WHERE product_category IS NOT NULL
    )
    INSERT INTO public.coverage (policy_id, party_id, product_id, sum_assured, premium_amount)
    SELECT
        p.policy_id,
        p.party_id,
        pr.product_id,
        val.sa,
        -- Premium Logic: Life ~1.5%, Health ~3%, Others ~2% of Sum Assured
        (val.sa * CASE 
            WHEN pr.product_category = 'Bảo hiểm nhân thọ' THEN (0.012 + RANDOM() * 0.008)
            WHEN pr.product_category = 'Bảo hiểm sức khỏe' THEN (0.025 + RANDOM() * 0.015)
            ELSE 0.02 
         END)::BIGINT
    FROM tmp_policy p
    CROSS JOIN LATERAL (
        -- Chọn 1-2 sản phẩm
        SELECT product_id, product_category
        FROM product_pool
        WHERE (product_pool.idx IN ((p.policy_id + 0) % product_pool.total_cnt, (p.policy_id + 3) % product_pool.total_cnt))
        ORDER BY product_pool.idx
        LIMIT (1 + (RANDOM() * 1.1)::INT)
    ) pr
    CROSS JOIN LATERAL (
        SELECT (300000000 + RANDOM() * 700000000)::BIGINT AS sa -- Sum Assured: 300tr - 1 tỷ
    ) val;
    
    -- 5a. Budget Items (tạo đầy đủ, khớp tổng tiền request)
    INSERT INTO public."budget_item" ("request_id", "item_name", "description", "requested_amount", "vendor_quote_link")
    SELECT
        req.request_id,
        items.item_name,
        items.item_desc,
        (items.base_amount * (0.9 + RANDOM() * 0.2))::BIGINT,
        'https://vendor.example.com/quote/' || req.request_code || '-' || items.idx
    FROM public."request" req
    CROSS JOIN LATERAL (
        SELECT * FROM (
            VALUES
                (1, 'Hội trường', 'Thuê hội trường tiêu chuẩn', 20000000),
                (2, 'Tea-break', 'Phục vụ tea-break', 15000000),
                (3, 'Quà tặng', 'Quà tặng khách hàng', 10000000),
                (4, 'Truyền thông', 'Quảng bá sự kiện', 12000000)
        ) AS v(idx, item_name, item_desc, base_amount)
        ORDER BY RANDOM()
        LIMIT 2 + (RANDOM() * 2)::INT  -- 2-3 hạng mục
    ) items;

    -- 5a2. Cập nhật tổng tiền request dựa trên budget items
    UPDATE public."request" req
    SET total_estimated_amount = COALESCE(b.total, 0)
    FROM (
        SELECT request_id, SUM(requested_amount) AS total
        FROM public."budget_item"
        GROUP BY request_id
    ) b
    WHERE req.request_id = b.request_id;

    -- 5b. Document (đính kèm báo giá/agenda) cho mỗi request
    INSERT INTO public."document" ("request_id", "file_name", "file_path", "uploaded_by_id", "upload_timestamp")
    SELECT
        req.request_id,
        'bao_gia_' || req.request_code || '.pdf',
        '/uploads/' || req.request_code || '/bao_gia.pdf',
        req.requester_id,
        LEAST(req.created_date + (1 + (RANDOM() * 3)::INT) * INTERVAL '1 day', v_end_date)
    FROM public."request" req
    ON CONFLICT DO NOTHING;
    
    -- 5c. Approval Workflow (Fixed Logic)
    INSERT INTO public."approval_workflow" ("request_id", "step_number", "approver_id", "status", "comment", "action_timestamp")
    SELECT
        req.request_id,
        step_num,
        CASE step_num
            WHEN 1 THEN approvers.dept_owner_id  -- trưởng phòng/phụ trách bộ phận
            WHEN 2 THEN approvers.finance_id     -- kiểm soát tài chính
            WHEN 3 THEN approvers.ceo_id         -- CEO
        END as approver_id,
        CASE 
            WHEN req.status IN ('Approved', 'Completed') THEN 'Approved'
            WHEN req.status = 'Rejected' THEN CASE WHEN step_num = 1 THEN 'Rejected' ELSE 'Skipped' END
            WHEN req.status = 'Pending' THEN 'Pending'
            ELSE 'Pending'
        END as status,
        CASE WHEN req.status IN ('Approved', 'Completed') THEN 'Đã phê duyệt' ELSE NULL END as comment,
        CASE 
            WHEN req.status IN ('Approved', 'Completed') THEN req.created_date + (step_num * INTERVAL '1 day')
            ELSE NULL
        END as action_timestamp
    FROM public."request" req
    CROSS JOIN LATERAL (
        SELECT
            CASE req.department_id
                WHEN 1 THEN 2  -- Sales Manager
                WHEN 3 THEN 3  -- Marketing Manager
                WHEN 4 THEN 4  -- Finance Controller
                WHEN 5 THEN 1  -- Operations: CEO phê duyệt
                ELSE 1
            END AS dept_owner_id,
            CASE 
                WHEN req.department_id = 4 THEN 1  -- tránh lặp CFO, đẩy CEO vào bước 2
                ELSE 4
            END AS finance_id,
            1 AS ceo_id
    ) approvers
    CROSS JOIN generate_series(1, 3) step_num;

    -- Coverages đã được tạo ở bước 4d; tiếp tục sinh claim dựa trên coverages hiện có

    -- 7. Claims (Fixed Consistency)
    INSERT INTO public.claim (coverage_id, event_date, request_date, claim_status, requested_amount, approved_amount, payment_date)
    SELECT
        cov.coverage_id,
        claim_event_date,
        claim_request_date,
        final_claim_status,
        requested_amt,
        -- Approved amount only if Approved
        CASE 
            WHEN final_claim_status = 'Approved' THEN (requested_amt * (0.80 + RANDOM() * 0.15))::BIGINT
            ELSE NULL 
        END,
        -- Payment date only if Approved
        CASE 
            WHEN final_claim_status = 'Approved' THEN LEAST(claim_request_date + ((5 + RANDOM() * 10)::INT * INTERVAL '1 day'), v_end_date)
            ELSE NULL 
        END
    FROM public.coverage cov
    JOIN public.policy pol ON cov.policy_id = pol.policy_id
    JOIN public.product pr ON cov.product_id = pr.product_id -- Join Product to check category
    CROSS JOIN LATERAL (
        SELECT LEAST(pol.effective_date + (RANDOM() * 60)::INT * INTERVAL '1 day', v_end_date) AS event_dt
    ) claim_data
    CROSS JOIN LATERAL (
        SELECT claim_data.event_dt AS claim_event_date,
               LEAST(claim_data.event_dt + ((1 + RANDOM() * 13)::INT * INTERVAL '1 day'), v_end_date) AS claim_request_date
    ) dates
    CROSS JOIN LATERAL (
        SELECT 
            CASE
                WHEN claim_request_date < v_end_date - INTERVAL '20 days' THEN
                    CASE WHEN RANDOM() < CLAIM_APPROVAL_RATE THEN 'Approved' ELSE 'Rejected' END
                WHEN claim_request_date < v_end_date - INTERVAL '7 days' THEN
                    CASE 
                        WHEN RANDOM() < (CLAIM_APPROVAL_RATE * 0.8) THEN 'Approved'
                        WHEN RANDOM() < 0.85 THEN 'Pending'
                        ELSE 'Rejected'
                    END
                ELSE 'Pending'
            END AS final_claim_status,
            -- Claim Amount Logic: Life = 100% SA, Health = Partial
            CASE 
                WHEN pr.product_category = 'Bảo hiểm nhân thọ' THEN cov.sum_assured
                ELSE (cov.sum_assured * (CLAIM_AMOUNT_RATIO_MIN + RANDOM() * (CLAIM_AMOUNT_RATIO_MAX - CLAIM_AMOUNT_RATIO_MIN)))
            END::BIGINT AS requested_amt
    ) status_calc
    WHERE pol.effective_date >= v_start_date 
      AND pol.effective_date <= v_end_date
      AND RANDOM() < CLAIM_PROBABILITY;

    -- Các giao dịch premium/chi phí được sinh bên dưới dựa trên policy/coverage vừa tạo

    -- 13. Update Annual Budget Spent (Consistency Fix)
    -- Update amount_spent based on actual approved requests
    UPDATE public."annual_budget" ab
    SET amount_spent = COALESCE(spent.total, 0)
    FROM (
        SELECT 
            req.department_id,
            EXTRACT(YEAR FROM req.created_date) as yr,
            -- Map request title/type to budget category roughly
            CASE 
                WHEN req.title LIKE '%Hội thảo%' OR req.title LIKE '%Workshop%' THEN 'Hội thảo khách hàng'
                WHEN req.title LIKE '%Tri ân%' THEN 'Thi đua bán hàng'
                ELSE 'Chiến dịch Marketing'
            END as category_mapped,
            SUM(req.total_estimated_amount) as total
        FROM public."request" req
        WHERE req.status IN ('Approved', 'Completed')
        GROUP BY req.department_id, EXTRACT(YEAR FROM req.created_date), category_mapped
    ) spent
    WHERE ab.department_id = spent.department_id 
      AND ab.year = spent.yr::INT
      AND ab.category = spent.category_mapped;
    
    -- 8. Transactions - Premium Payments (Single transaction per policy)
    INSERT INTO public.transaction (policy_id, transaction_type, amount, transaction_date, is_cost, transaction_month)
    SELECT
        pol.policy_id,
        'Thanh toán phí bảo hiểm',
        policy_total_premium.total_premium,
        LEAST(pol.effective_date + INTERVAL '1 day', v_end_date),
        FALSE,
        EXTRACT(MONTH FROM pol.effective_date)::INTEGER
    FROM public.policy pol
    JOIN (
        SELECT policy_id, SUM(premium_amount) AS total_premium
        FROM public.coverage
        GROUP BY policy_id
    ) policy_total_premium ON pol.policy_id = policy_total_premium.policy_id
    WHERE pol.effective_date >= v_start_date AND pol.effective_date <= v_end_date;
    
    -- 9. Transactions - Commission Costs
    INSERT INTO public.transaction (policy_id, transaction_type, amount, transaction_date, is_cost, transaction_month)
    SELECT
        pol.policy_id,
        'Chi phí hoa hồng',
        (policy_total_premium.total_premium * COMMISSION_RATE)::BIGINT,
        LEAST(pol.effective_date + INTERVAL '2 days', v_end_date),
        TRUE,
        EXTRACT(MONTH FROM pol.effective_date)::INTEGER
    FROM public.policy pol
    JOIN (
        SELECT policy_id, SUM(premium_amount) AS total_premium
        FROM public.coverage
        GROUP BY policy_id
    ) policy_total_premium ON pol.policy_id = policy_total_premium.policy_id
    WHERE pol.effective_date >= v_start_date AND pol.effective_date <= v_end_date;
    
    -- 10. Transactions - Operational Costs
    INSERT INTO public.transaction (policy_id, transaction_type, amount, transaction_date, is_cost, transaction_month)
    SELECT
        pol.policy_id,
        'Chi phí vận hành',
        (policy_total_premium.total_premium * (OPERATIONAL_COST_MIN + RANDOM() * (OPERATIONAL_COST_MAX - OPERATIONAL_COST_MIN)))::BIGINT,
        LEAST(pol.effective_date + INTERVAL '5 days', v_end_date),
        TRUE,
        EXTRACT(MONTH FROM pol.effective_date)::INTEGER
    FROM public.policy pol
    JOIN (
        SELECT policy_id, SUM(premium_amount) AS total_premium
        FROM public.coverage
        GROUP BY policy_id
    ) policy_total_premium ON pol.policy_id = policy_total_premium.policy_id
    WHERE pol.effective_date >= v_start_date AND pol.effective_date <= v_end_date
      AND RANDOM() < 0.70;

    -- 10b. Transactions - Claim Payouts (cost)
    INSERT INTO public.transaction (policy_id, transaction_type, amount, transaction_date, is_cost, transaction_month)
    SELECT
        pol.policy_id,
        'Chi trả bồi thường',
        COALESCE(cl.approved_amount, 0),  -- chi ra, giữ dương để cộng vào cost
        cl.payment_date,
        TRUE,
        EXTRACT(MONTH FROM cl.payment_date)::INTEGER
    FROM public.claim cl
    JOIN public.coverage cov ON cov.coverage_id = cl.coverage_id
    JOIN public.policy pol ON pol.policy_id = cov.policy_id
    WHERE cl.payment_date IS NOT NULL;
    
    -- [NEW] 10c. Transactions - Budget Expenses (Marketing & Events Costs)
    -- Map Approved Requests to Transactions to reflect real financial health
    INSERT INTO public.transaction (policy_id, transaction_type, amount, transaction_date, is_cost, transaction_month)
    SELECT
        NULL, -- Không gắn với policy cụ thể (Chi phí doanh nghiệp)
        'Chi phí hoạt động: ' || req.title,
        req.total_estimated_amount,
        req.created_date + INTERVAL '5 days', -- Chi tiền sau khi duyệt 5 ngày
        TRUE,
        EXTRACT(MONTH FROM req.created_date)::INTEGER
    FROM public.request req
    WHERE req.status IN ('Approved', 'Completed')
      AND req.total_estimated_amount > 0;
    
    -- 11. Update Employee Revenue (Pareto Distribution Logic - 20% sales tạo ra 80% doanh thu)
    -- 11. Update Employee Revenue (Pareto Distribution Logic - Procedural Loop Approach)
    -- Create a "deck" of cards where top performers have more cards
    CREATE TEMP TABLE tmp_sales_deck AS
    WITH sales_staff AS (
        SELECT employee_id, ROW_NUMBER() OVER (ORDER BY employee_id) as rn
        FROM public.employee 
        WHERE role = 'Sales'
    )
    SELECT employee_id FROM sales_staff
    CROSS JOIN generate_series(1, CASE WHEN rn <= 10 THEN 5 ELSE 1 END); -- Top 10 get 5 tickets, others get 1

    CREATE INDEX idx_deck ON tmp_sales_deck(employee_id);

    -- Create temp table to store assignments
    CREATE TEMP TABLE tmp_assignments (
        policy_id INTEGER,
        employee_id INTEGER
    );

    -- Loop through each policy to force fresh random selection
    FOR r IN 
        SELECT policy_id 
        FROM public.policy 
        WHERE effective_date >= DATE_TRUNC('month', v_anchor_date) AND effective_date <= v_end_date
    LOOP
        INSERT INTO tmp_assignments (policy_id, employee_id)
        SELECT 
            r.policy_id,
            employee_id
        FROM tmp_sales_deck
        OFFSET floor(random() * (SELECT COUNT(*) FROM tmp_sales_deck))
        LIMIT 1;
    END LOOP;

    -- Update revenue based on assignments
    WITH employee_revenue AS (
        SELECT 
            ta.employee_id,
            SUM(t.amount) AS total_revenue
        FROM tmp_assignments ta
        JOIN public.transaction t ON ta.policy_id = t.policy_id
        WHERE t.transaction_type = 'Thanh toán phí bảo hiểm'
        GROUP BY ta.employee_id
    ),
    activity_counts AS (
        SELECT 
            ta.employee_id,
            COUNT(*) AS policy_count
        FROM tmp_assignments ta
        GROUP BY ta.employee_id
    )
    UPDATE public."employee" e
    SET revenue = COALESCE(er.total_revenue, 0),
        leads_count = COALESCE(ac.policy_count * (3 + RANDOM()*2)::INT, 0), -- 3-5 leads/deal
        activities_count = COALESCE(ac.policy_count * (5 + RANDOM()*5)::INT, 0) -- 5-10 activities/deal
    FROM employee_revenue er
    LEFT JOIN activity_counts ac ON ac.employee_id = er.employee_id
    WHERE e.employee_id = er.employee_id;
    
    -- 12. Fix Sequences
    PERFORM setval('department_department_id_seq', COALESCE((SELECT MAX(department_id) FROM public.department), 0) + 1, false);
    PERFORM setval('employee_employee_id_seq', COALESCE((SELECT MAX(employee_id) FROM public.employee), 0) + 1, false);
    PERFORM setval('product_product_id_seq', COALESCE((SELECT MAX(product_id) FROM public.product), 0) + 1, false);
    PERFORM setval('party_party_id_seq', COALESCE((SELECT MAX(party_id) FROM public.party), 0) + 1, false);
    PERFORM setval('policy_policy_id_seq', COALESCE((SELECT MAX(policy_id) FROM public.policy), 0) + 1, false);
    PERFORM setval('coverage_coverage_id_seq', COALESCE((SELECT MAX(coverage_id) FROM public.coverage), 0) + 1, false);
    PERFORM setval('claim_claim_id_seq', COALESCE((SELECT MAX(claim_id) FROM public.claim), 0) + 1, false);
    PERFORM setval('transaction_transaction_id_seq', COALESCE((SELECT MAX(transaction_id) FROM public.transaction), 0) + 1, false);
    PERFORM setval('request_request_id_seq', COALESCE((SELECT MAX(request_id) FROM public.request), 0) + 1, false);
    PERFORM setval('annual_budget_annual_budget_id_seq', COALESCE((SELECT MAX(annual_budget_id) FROM public.annual_budget), 0) + 1, false);
    PERFORM setval('policy_rule_rule_id_seq', COALESCE((SELECT MAX(rule_id) FROM public.policy_rule), 0) + 1, false);
    PERFORM setval('budget_item_item_id_seq', COALESCE((SELECT MAX(item_id) FROM public.budget_item), 0) + 1, false);
    PERFORM setval('document_document_id_seq', COALESCE((SELECT MAX(document_id) FROM public.document), 0) + 1, false);
    PERFORM setval('approval_workflow_step_id_seq', COALESCE((SELECT MAX(step_id) FROM public.approval_workflow), 0) + 1, false);
    
END $$;
