-- fake.sql - deterministic seed data for BeeBox Intelligence DB v5
-- Time range: 2023-12 to 2025-12
-- No random(); seasonal + weekly effects included

SET client_encoding = 'UTF8';
SET TIME ZONE 'Asia/Ho_Chi_Minh';

BEGIN;

-- ============================================================
-- SYSTEM CONFIG
-- ============================================================
-- Table: public.system_config
-- Columns: config_id, config_key, config_value, description, created_at, updated_at
INSERT INTO public.system_config (config_id, config_key, config_value, description, created_at, updated_at)
VALUES
  (1, 'target_fallback_multiplier', '1.2', 'Multiplier for target if no sales_target defined', '2023-12-01', '2023-12-01'),
  (2, 'default_color', '#9ca3af', 'Default color for UI elements', '2023-12-01', '2023-12-01'),
  (3, 'pipeline_active_days', '30', 'Days to consider party as active in pipeline', '2023-12-01', '2023-12-01'),
  (4, 'roi_window_months', '3', 'Months window to calculate campaign ROI', '2023-12-01', '2023-12-01')
ON CONFLICT (config_key) DO NOTHING;

-- ============================================================
-- DEPARTMENT
-- ============================================================
-- Table: public.department
-- Columns: department_id, department_name, created_at, updated_at
INSERT INTO public.department (department_id, department_name, created_at, updated_at)
VALUES
  (1, 'ATO - Vùng 1', '2023-12-01', '2023-12-01'),
  (2, 'Sales', '2023-12-01', '2023-12-01'),
  (3, 'Marketing', '2023-12-01', '2023-12-01'),
  (4, 'Tài chính', '2023-12-01', '2023-12-01'),
  (5, 'Admin', '2023-12-01', '2023-12-01');
-- ============================================================
-- EMPLOYEE
-- ============================================================
-- Table: public.employee
-- Columns: employee_id, full_name, email, department_id, manager_id, role, created_at, updated_at
WITH name_arrays AS (
  SELECT
    ARRAY['Nguyễn','Trần','Lê','Phạm','Hoàng','Huỳnh','Phan','Vũ','Võ','Đặng','Bùi','Đỗ','Hồ','Ngô','Dương','Lý','Đinh','Trương','Đoàn','Mai'] AS last_names,
    ARRAY['Văn','Thị','Hữu','Minh','Thanh','Quang','Khánh','Ngọc','Bảo','Gia','Đức','Anh','Thu','Hoài','Tuấn','Hải'] AS mid_names,
    ARRAY['An','Bình','Chi','Dũng','Hà','Hạnh','Hòa','Huy','Hương','Khôi','Linh','Long','Mai','Nam','Nhi','Phúc','Quân','Thảo','Trang','Tuấn','Uyên','Vy'] AS first_names
),
base AS (
  SELECT gs AS employee_id,
         CASE
           WHEN gs <= 2 THEN 1
           WHEN gs <= 6 THEN 2
           WHEN gs <= 14 THEN 1
           WHEN gs <= 41 THEN 2
           WHEN gs <= 51 THEN 3
           WHEN gs <= 56 THEN 4
           ELSE 5
         END AS department_id,
         CASE
           WHEN gs <= 6 THEN 'Sales_Manager'
           WHEN gs <= 41 THEN 'Sales'
           WHEN gs <= 51 THEN 'Marketing_Staff'
           WHEN gs <= 56 THEN 'Finance_Controller'
           ELSE 'Admin'
         END AS role,
         (SELECT last_names[1 + ((gs - 1) % array_length(last_names,1))] FROM name_arrays) AS last_name,
         (SELECT mid_names[1 + ((gs - 1) % array_length(mid_names,1))] FROM name_arrays) AS mid_name,
         (SELECT first_names[1 + ((gs - 1) % array_length(first_names,1))] FROM name_arrays) AS first_name,
         (timestamp '2023-12-01' + (gs * interval '1 day')) AS created_at
  FROM generate_series(1,60) gs
),
with_mgr AS (
  SELECT *,
         CASE
           WHEN employee_id <= 6 THEN NULL
           WHEN department_id = 1 THEN 1 + ((employee_id - 7) % 2)
           WHEN employee_id <= 41 THEN 3 + ((employee_id - 7) % 4)
           WHEN employee_id <= 51 THEN 57
           WHEN employee_id <= 56 THEN 57
           ELSE NULL
         END AS manager_id
  FROM base
)
INSERT INTO public.employee (employee_id, full_name, email, department_id, manager_id, role, created_at, updated_at)
SELECT employee_id,
       last_name || ' ' || mid_name || ' ' || first_name AS full_name,
       'nv' || lpad(employee_id::text, 3, '0') || '@beebox.vn' AS email,
       department_id,
       manager_id,
       role,
       created_at,
       created_at + ((employee_id % 7) * interval '1 day') AS updated_at
FROM with_mgr;
-- ============================================================
-- POLICY RULE
-- ============================================================
-- Table: public.policy_rule
-- Columns: rule_id, rule_name, rule_value, description, created_at, updated_at
INSERT INTO public.policy_rule (rule_id, rule_name, rule_value, description, created_at, updated_at)
VALUES
  (1, 'gift_budget_per_customer', 300000, 'Chi phí quà tặng không quá 300.000 VNĐ/khách', '2023-12-01', '2023-12-01'),
  (2, 'event_venue_cap', 20000000, 'Trần chi phí thuê địa điểm mỗi ngày', '2023-12-01', '2023-12-01'),
  (3, 'approval_auto_limit', 5000000, 'Ngưỡng tự duyệt của AI Agent', '2023-12-01', '2023-12-01'),
  (4, 'marketing_roi_min', 1.5, 'ROI tối thiểu cho chiến dịch', '2023-12-01', '2023-12-01'),
  (5, 'sales_bonus_rate', 0.03, 'Tỷ lệ thưởng doanh số', '2023-12-01', '2023-12-01'),
  (6, 'travel_allowance_daily', 800000, 'Phụ cấp công tác theo ngày', '2023-12-01', '2023-12-01'),
  (7, 'lead_conversion_target', 0.08, 'Tỷ lệ chuyển đổi lead mục tiêu', '2023-12-01', '2023-12-01'),
  (8, 'claim_auto_approve_limit', 5000000, 'Ngưỡng bồi thường tự duyệt', '2023-12-01', '2023-12-01'),
  (9, 'training_cost_cap', 15000000, 'Trần chi phí đào tạo theo chương trình', '2023-12-01', '2023-12-01');

-- ============================================================
-- PIPELINE STAGE CONFIG
-- ============================================================
-- Table: public.pipeline_stage_config
-- Columns: stage_id, stage_name, stage_order, color, is_active, created_at
INSERT INTO public.pipeline_stage_config (stage_id, stage_name, stage_order, color, is_active, created_at)
VALUES
  (1, 'Leads mới', 1, '#3b82f6', FALSE, '2023-12-01'),
  (2, 'Đang tư vấn', 2, '#6366f1', TRUE, '2023-12-01'),
  (3, 'Đang chốt', 3, '#a855f7', TRUE, '2023-12-01'),
  (4, 'Thẩm định', 4, '#f97316', TRUE, '2023-12-01'),
  (5, 'Phát hành', 5, '#14b8a6', TRUE, '2023-12-01')
ON CONFLICT (stage_name) DO NOTHING;

-- ============================================================
-- SALES CHANNEL CONFIG
-- ============================================================
-- Table: public.sales_channel_config
-- Columns: channel_id, channel_name, color, created_at
INSERT INTO public.sales_channel_config (channel_id, channel_name, color, created_at)
VALUES
  (1, 'Hội thảo', '#f97316', '2023-12-01'),
  (2, 'Tư vấn 1-1', '#8b5cf6', '2023-12-01'),
  (3, 'Telesale', '#10b981', '2023-12-01'),
  (4, 'Online', '#3b82f6', '2023-12-01'),
  (5, 'Referral', '#ec4899', '2023-12-01')
ON CONFLICT (channel_name) DO NOTHING;

-- ============================================================
-- CAMPAIGN
-- ============================================================
-- Table: public.campaign
-- Columns: campaign_id, campaign_code, campaign_name, description, start_date, end_date, status, created_at, updated_at
INSERT INTO public.campaign (campaign_id, campaign_code, campaign_name, description, start_date, end_date, status, created_at, updated_at)
VALUES
  -- 2023
  (1, 'HCM_1223', 'Tổng kết năm HCM 12/2023', 'Chiến dịch cuối năm 2023', '2023-12-01', '2023-12-31', 'Completed', '2023-12-01', '2024-01-01'),
  (2, 'HN_1223', 'Workshop Hà Nội 12/2023', 'Workshop cuối năm tại Hà Nội', '2023-12-05', '2023-12-28', 'Completed', '2023-12-01', '2024-01-01'),
  (3, 'DN_1223', 'Activation Đà Nẵng 12/2023', 'Activation cuối năm', '2023-12-10', '2023-12-25', 'Completed', '2023-12-01', '2024-01-01'),
  -- 2024
  (4, 'HCM_0124', 'Hội thảo HCM Tháng 1/2024', 'Chiến dịch hội thảo khách hàng tại HCM', '2024-01-01', '2024-01-31', 'Completed', '2023-12-15', '2024-02-01'),
  (5, 'HN_0124', 'Roadshow Hà Nội Tháng 1/2024', 'Chiến dịch roadshow tại Hà Nội', '2024-01-05', '2024-01-30', 'Completed', '2023-12-20', '2024-02-05'),
  (6, 'DN_0224', 'Workshop Đà Nẵng Tháng 2/2024', 'Workshop khách hàng tại Đà Nẵng', '2024-02-01', '2024-02-28', 'Completed', '2024-01-15', '2024-03-01'),
  (7, 'HCM_0224', 'Hội thảo HCM Tháng 2/2024', 'Hội thảo Tết tại HCM', '2024-02-01', '2024-02-29', 'Completed', '2024-01-20', '2024-03-01'),
  (8, 'CT_0324', 'Activation Cần Thơ Tháng 3/2024', 'Activation địa phương tại Cần Thơ', '2024-03-01', '2024-03-31', 'Completed', '2024-02-15', '2024-04-01'),
  (9, 'HN_0324', 'Roadshow Hà Nội Tháng 3/2024', 'Roadshow Q1 tại Hà Nội', '2024-03-05', '2024-03-28', 'Completed', '2024-02-20', '2024-04-01'),
  (10, 'HCM_0424', 'Hội thảo HCM Tháng 4/2024', 'Chiến dịch hội thảo khách hàng Q2', '2024-04-01', '2024-04-30', 'Completed', '2024-03-15', '2024-05-01'),
  (11, 'DN_0424', 'Workshop Đà Nẵng Tháng 4/2024', 'Workshop Q2 tại Đà Nẵng', '2024-04-05', '2024-04-28', 'Completed', '2024-03-20', '2024-05-01'),
  (12, 'HP_0524', 'Roadshow Hải Phòng Tháng 5/2024', 'Chiến dịch roadshow tại Hải Phòng', '2024-05-01', '2024-05-31', 'Completed', '2024-04-15', '2024-06-01'),
  (13, 'CT_0524', 'Activation Cần Thơ Tháng 5/2024', 'Activation Q2 tại Cần Thơ', '2024-05-05', '2024-05-28', 'Completed', '2024-04-20', '2024-06-01'),
  (14, 'HN_0624', 'Workshop Hà Nội Tháng 6/2024', 'Workshop khách hàng tại Hà Nội', '2024-06-01', '2024-06-30', 'Completed', '2024-05-15', '2024-07-01'),
  (15, 'HCM_0624', 'Hội thảo HCM Tháng 6/2024', 'Hội thảo Q2 tại HCM', '2024-06-05', '2024-06-28', 'Completed', '2024-05-20', '2024-07-01'),
  (16, 'HCM_0724', 'Hội thảo HCM Tháng 7/2024', 'Chiến dịch hội thảo khách hàng Q3', '2024-07-01', '2024-07-31', 'Completed', '2024-06-15', '2024-08-01'),
  (17, 'HN_0724', 'Roadshow Hà Nội Tháng 7/2024', 'Roadshow Q3 tại Hà Nội', '2024-07-05', '2024-07-28', 'Completed', '2024-06-20', '2024-08-01'),
  (18, 'DN_0824', 'Activation Đà Nẵng Tháng 8/2024', 'Activation khách hàng tại Đà Nẵng', '2024-08-01', '2024-08-31', 'Completed', '2024-07-15', '2024-09-01'),
  (19, 'HP_0824', 'Workshop Hải Phòng Tháng 8/2024', 'Workshop Q3 tại Hải Phòng', '2024-08-05', '2024-08-28', 'Completed', '2024-07-20', '2024-09-01'),
  (20, 'CT_0924', 'Roadshow Cần Thơ Tháng 9/2024', 'Roadshow Q3 tại Cần Thơ', '2024-09-01', '2024-09-30', 'Completed', '2024-08-15', '2024-10-01'),
  (21, 'HCM_0924', 'Hội thảo HCM Tháng 9/2024', 'Hội thảo Q3 tại HCM', '2024-09-05', '2024-09-28', 'Completed', '2024-08-20', '2024-10-01'),
  (22, 'HCM_1024', 'Hội thảo HCM Tháng 10/2024', 'Chiến dịch hội thảo khách hàng Q4', '2024-10-01', '2024-10-31', 'Completed', '2024-09-15', '2024-11-01'),
  (23, 'DN_1024', 'Activation Đà Nẵng Tháng 10/2024', 'Activation Q4 tại Đà Nẵng', '2024-10-05', '2024-10-28', 'Completed', '2024-09-20', '2024-11-01'),
  (24, 'HN_1124', 'Workshop Hà Nội Tháng 11/2024', 'Workshop cuối năm tại Hà Nội', '2024-11-01', '2024-11-30', 'Completed', '2024-10-15', '2024-12-01'),
  (25, 'CT_1124', 'Roadshow Cần Thơ Tháng 11/2024', 'Roadshow cuối năm tại Cần Thơ', '2024-11-05', '2024-11-28', 'Completed', '2024-10-20', '2024-12-01'),
  (26, 'HCM_1224', 'Tổng kết năm HCM Tháng 12/2024', 'Sự kiện tổng kết năm 2024', '2024-12-01', '2024-12-31', 'Completed', '2024-11-15', '2025-01-01'),
  (27, 'HN_1224', 'Workshop Hà Nội Tháng 12/2024', 'Workshop cuối năm HN', '2024-12-05', '2024-12-28', 'Completed', '2024-11-20', '2025-01-01'),
  -- 2025
  (28, 'HN_0125', 'Kick-off 2025 Hà Nội', 'Sự kiện khởi động năm mới', '2025-01-01', '2025-01-31', 'Active', '2024-12-15', '2025-01-15'),
  (29, 'HCM_0125', 'Hội thảo HCM Tháng 1/2025', 'Chiến dịch đầu năm', '2025-01-05', '2025-01-28', 'Active', '2024-12-20', '2025-01-15'),
  (30, 'HCM_0225', 'Hội thảo Tết HCM 2025', 'Chiến dịch hội thảo sau Tết', '2025-02-01', '2025-02-28', 'Active', '2025-01-15', '2025-02-15'),
  (31, 'DN_0225', 'Activation Đà Nẵng Tháng 2/2025', 'Activation Tết tại Đà Nẵng', '2025-02-05', '2025-02-25', 'Active', '2025-01-20', '2025-02-15'),
  (32, 'DN_0325', 'Roadshow Đà Nẵng Q1/2025', 'Roadshow Q1 2025 tại Đà Nẵng', '2025-03-01', '2025-03-31', 'Active', '2025-02-15', '2025-03-15'),
  (33, 'HN_0325', 'Workshop Hà Nội Tháng 3/2025', 'Workshop Q1 HN', '2025-03-05', '2025-03-28', 'Active', '2025-02-20', '2025-03-15'),
  (34, 'HCM_0425', 'Hội thảo HCM Tháng 4/2025', 'Hội thảo Q2', '2025-04-01', '2025-04-30', 'Draft', '2025-03-15', '2025-03-15'),
  (35, 'CT_0425', 'Activation Cần Thơ Tháng 4/2025', 'Activation Q2 CT', '2025-04-05', '2025-04-28', 'Draft', '2025-03-20', '2025-03-20'),
  (36, 'HP_0525', 'Roadshow Hải Phòng Tháng 5/2025', 'Roadshow Q2 HP', '2025-05-01', '2025-05-31', 'Draft', '2025-04-15', '2025-04-15'),
  (37, 'HCM_1225', 'Hội thảo cuối năm HCM 2025', 'Chiến dịch cuối năm 2025', '2025-12-01', '2025-12-31', 'Draft', '2025-11-01', '2025-11-01')
ON CONFLICT (campaign_code) DO NOTHING;
-- ============================================================
-- PRODUCT CATEGORY
-- ============================================================
-- Table: public.product_category
-- Columns: category_id, category_name, description, created_at
INSERT INTO public.product_category (category_id, category_name, description, created_at)
VALUES
  (1, 'Life', 'Bảo hiểm nhân thọ', '2023-12-01'),
  (2, 'Health', 'Bảo hiểm sức khỏe', '2023-12-01'),
  (3, 'Investment', 'Bảo hiểm đầu tư', '2023-12-01'),
  (4, 'Accident', 'Bảo hiểm tai nạn', '2023-12-01');

-- ============================================================
-- PRODUCT TYPE
-- ============================================================
-- Table: public.product_type
-- Columns: type_id, category_id, type_name, description, created_at
INSERT INTO public.product_type (type_id, category_id, type_name, description, created_at)
VALUES
  (1, 1, 'Liên kết chung', 'Sản phẩm chính', '2023-12-01'),
  (2, 1, 'Truyền thống', 'Bổ trợ', '2023-12-01'),
  (3, 2, 'Thẻ sức khỏe', 'Sản phẩm chính', '2023-12-01'),
  (4, 2, 'Bệnh hiểm nghèo', 'Bổ trợ', '2023-12-01'),
  (5, 3, 'Liên kết đơn vị', 'Sản phẩm chính', '2023-12-01'),
  (6, 3, 'Hưu trí', 'Bổ trợ', '2023-12-01'),
  (7, 4, 'Tai nạn cá nhân', 'Sản phẩm chính', '2023-12-01'),
  (8, 4, 'Du lịch', 'Bổ trợ', '2023-12-01');

-- ============================================================
-- PRODUCT
-- ============================================================
-- Table: public.product
-- Columns: product_id, product_code, product_name, category_id, type_id, status, issue_date, end_date, created_at, updated_at
INSERT INTO public.product (product_id, product_code, product_name, category_id, type_id, status, issue_date, end_date, created_at, updated_at)
VALUES
  -- Note: issue_date is the actual product launch date (before system go-live), created_at is when data was entered into this system
  (1, 'UL01', 'BH Liên kết chung Vững Bước', 1, 1, 'Active', '2019-01-01', NULL, '2023-12-01', '2023-12-01'),
  (2, 'UL02', 'BH Liên kết chung An Gia', 1, 1, 'Active', '2020-06-01', NULL, '2023-12-01', '2023-12-01'),
  (3, 'TR01', 'BH Truyền thống Tử kỳ', 1, 2, 'Active', '2021-03-01', NULL, '2023-12-01', '2023-12-01'),
  (4, 'TR02', 'BH Truyền thống Giáo dục', 1, 2, 'Active', '2021-10-01', NULL, '2023-12-01', '2023-12-01'),
  (5, 'HL01', 'BH Sức khỏe Toàn diện', 2, 3, 'Active', '2019-05-01', NULL, '2023-12-01', '2023-12-01'),
  (6, 'HL02', 'BH Y tế Cao cấp', 2, 3, 'Active', '2022-01-15', NULL, '2023-12-01', '2023-12-01'),
  (7, 'CR01', 'Rider Nha khoa', 2, 4, 'Active', '2020-08-01', NULL, '2023-12-01', '2023-12-01'),
  (8, 'CR02', 'Rider Thai sản', 2, 4, 'Active', '2021-07-01', NULL, '2023-12-01', '2023-12-01'),
  (9, 'IV01', 'BH Liên kết đơn vị Tăng trưởng', 3, 5, 'Active', '2021-01-01', NULL, '2023-12-01', '2023-12-01'),
  (10, 'IV02', 'BH Đầu tư Linh hoạt', 3, 5, 'Active', '2022-06-01', NULL, '2023-12-01', '2023-12-01'),
  (11, 'IVR1', 'Rider Bảo vệ tăng cường', 3, 6, 'Active', '2021-05-01', NULL, '2023-12-01', '2023-12-01'),
  (12, 'IVR2', 'Rider Miễn khấu trừ', 3, 6, 'Discontinued', '2019-02-01', '2023-12-31', '2023-12-01', '2023-12-31'),
  (13, 'AC01', 'BH Tai nạn 24/7', 4, 7, 'Active', '2018-09-01', NULL, '2023-12-01', '2023-12-01'),
  (14, 'AC02', 'BH Tai nạn mở rộng', 4, 7, 'Active', '2020-04-01', NULL, '2023-12-01', '2023-12-01'),
  (15, 'ACR1', 'Rider Trợ cấp nằm viện', 4, 8, 'Active', '2019-11-01', NULL, '2023-12-01', '2023-12-01'),
  (16, 'ACR2', 'Rider Phẫu thuật', 4, 8, 'Active', '2021-02-01', NULL, '2023-12-01', '2023-12-01');
-- ============================================================
-- TEMP MONTH DIMENSION
-- ============================================================
-- Used for generating seasonal data (12/2023 -> 12/2025)
-- Added: kpi_factor to create varied KPI achievement scenarios
CREATE TEMP TABLE tmp_months AS
SELECT month_start,
       month_end,
       year,
       month,
       days_in_month,
       (CASE month
          WHEN 1 THEN 1.10
          WHEN 2 THEN 1.25
          WHEN 3 THEN 0.95
          WHEN 4 THEN 0.95
          WHEN 5 THEN 1.00
          WHEN 6 THEN 1.00
          WHEN 7 THEN 0.85
          WHEN 8 THEN 0.95
          WHEN 9 THEN 1.05
          WHEN 10 THEN 1.10
          WHEN 11 THEN 1.40
          WHEN 12 THEN 1.60
        END
        + CASE WHEN year = 2025 AND month = 12 THEN 0.60 ELSE 0 END) AS season_factor,
       (1 + (year - 2023) * 0.12) AS year_factor,
       -- KPI Achievement Factor: determines actual vs target ratio
       -- Creates realistic distribution: ~30% exceed, ~40% on-target, ~30% below
       CASE
         -- VƯỢT KPI (>110%): Q4 months, December, February (bonus seasons)
         WHEN month IN (11, 12) THEN 1.15 + ((year - 2023) * 0.02)  -- Exceed: 115-119%
         WHEN month = 2 THEN 1.12  -- Tết bonus: 112%
         WHEN month = 10 THEN 1.08  -- Pre-year-end push: 108%
         -- ĐẠT KPI (90-110%): Most regular months
         WHEN month IN (1, 5, 6, 9) THEN 1.00 + ((year - 2023) * 0.01)  -- On target: 100-102%
         WHEN month = 3 THEN 0.98  -- Post-Tết slowdown: 98%
         WHEN month = 4 THEN 0.95  -- Q2 start: 95%
         -- CHƯA ĐỦ KPI (<90%): Summer slump, slow months
         WHEN month = 7 THEN 0.78 + ((year - 2023) * 0.02)  -- Summer slump: 78-82%
         WHEN month = 8 THEN 0.85  -- Recovery: 85%
         ELSE 1.00
       END AS kpi_factor
FROM (
  SELECT date_trunc('month', d)::date AS month_start,
         (date_trunc('month', d) + interval '1 month - 1 day')::date AS month_end,
         EXTRACT(YEAR FROM d)::int AS year,
         EXTRACT(MONTH FROM d)::int AS month,
         EXTRACT(DAY FROM (date_trunc('month', d) + interval '1 month - 1 day'))::int AS days_in_month
  FROM generate_series('2023-12-01'::date, '2025-12-01'::date, interval '1 month') d
) m;

-- ============================================================
-- SALES TARGET
-- ============================================================
-- Table: public.sales_target
-- Columns: target_id, category_id, type_id, year, month, target_amount, target_quantity, created_at, updated_at
WITH cat AS (
  SELECT category_id,
         CASE category_id
           WHEN 1 THEN 200000000  -- Reduced from 8B to 200M
           WHEN 2 THEN 100000000  -- Reduced from 4B to 100M
           WHEN 3 THEN 80000000   -- Reduced from 3.5B to 80M
           WHEN 4 THEN 50000000   -- Reduced from 2B to 50M
           ELSE 70000000          -- Reduced from 3B to 70M
         END AS base_amount,
         CASE category_id
           WHEN 1 THEN 45   -- Reduced from 220
           WHEN 2 THEN 65   -- Reduced from 320
           WHEN 3 THEN 35   -- Reduced from 180
           WHEN 4 THEN 50   -- Reduced from 260
           ELSE 40          -- Reduced from 200
         END AS base_qty
  FROM public.product_category
),
types AS (
  SELECT type_id, category_id,
         CASE type_id
           WHEN 1 THEN 0.65
           WHEN 2 THEN 0.35
           WHEN 3 THEN 0.60
           WHEN 4 THEN 0.40
           WHEN 5 THEN 0.70
           WHEN 6 THEN 0.30
           WHEN 7 THEN 0.65
           WHEN 8 THEN 0.35
           ELSE 0.50
         END AS type_ratio
  FROM public.product_type
),
targets AS (
  SELECT c.category_id,
         NULL::int AS type_id,
         m.year,
         m.month,
         ROUND(c.base_amount * m.season_factor * m.year_factor)::numeric(19,2) AS target_amount,
         ROUND(c.base_qty * m.season_factor * m.year_factor)::int AS target_quantity,
         m.month_start
  FROM cat c
  CROSS JOIN tmp_months m
  UNION ALL
  SELECT t.category_id,
         t.type_id,
         m.year,
         m.month,
         ROUND(c.base_amount * t.type_ratio * m.season_factor * m.year_factor)::numeric(19,2) AS target_amount,
         ROUND(c.base_qty * t.type_ratio * m.season_factor * m.year_factor)::int AS target_quantity,
         m.month_start
  FROM types t
  JOIN cat c ON c.category_id = t.category_id
  CROSS JOIN tmp_months m
)
INSERT INTO public.sales_target (target_id, category_id, type_id, year, month, target_amount, target_quantity, created_at, updated_at)
SELECT row_number() over (order by category_id, type_id NULLS FIRST, year, month) AS target_id,
       category_id,
       type_id,
       year,
       month,
       target_amount,
       target_quantity,
       -- Ensure created_at is within range (min = 2023-12-01)
       GREATEST(month_start - interval '7 days', timestamp '2023-12-01')::timestamp AS created_at,
       month_start::timestamp AS updated_at
FROM targets;
-- ============================================================
-- ANNUAL BUDGET
-- ============================================================
-- Table: public.annual_budget
-- Columns: annual_budget_id, department_id, year, category, total_amount, amount_spent, amount_remaining (generated), created_at, updated_at
WITH dept_categories AS (
  SELECT 1 AS department_id, 'Hội thảo khách hàng' AS category, 2800000000::numeric AS base_amount
  UNION ALL SELECT 1, 'Activation địa phương', 1600000000::numeric
  UNION ALL SELECT 1, 'Chăm sóc khách hàng', 1200000000::numeric
  UNION ALL SELECT 2, 'Đào tạo Sales', 900000000::numeric
  UNION ALL SELECT 2, 'Incentive nội bộ', 1100000000::numeric
  UNION ALL SELECT 2, 'Chi phí di chuyển', 700000000::numeric
  UNION ALL SELECT 3, 'Digital Marketing', 2200000000::numeric
  UNION ALL SELECT 3, 'PR/Branding', 1400000000::numeric
  UNION ALL SELECT 3, 'Nội dung/Creative', 900000000::numeric
  UNION ALL SELECT 4, 'Tuân thủ/Pháp lý', 600000000::numeric
  UNION ALL SELECT 4, 'Hệ thống kế toán', 900000000::numeric
  UNION ALL SELECT 4, 'Kiểm toán', 700000000::numeric
  UNION ALL SELECT 5, 'Văn phòng phẩm', 450000000::numeric
  UNION ALL SELECT 5, 'Hạ tầng IT', 900000000::numeric
  UNION ALL SELECT 5, 'Phúc lợi nội bộ', 650000000::numeric
),
years AS (
  SELECT 2023 AS year UNION ALL SELECT 2024 UNION ALL SELECT 2025
)
INSERT INTO public.annual_budget (annual_budget_id, department_id, year, category, total_amount, amount_spent, created_at, updated_at)
SELECT row_number() over (order by year, department_id, category) AS annual_budget_id,
       dc.department_id,
       y.year,
       dc.category,
       ROUND(dc.base_amount * (1 + (y.year - 2023) * 0.12), 2)::numeric(19,2) AS total_amount,
       0::numeric(19,2) AS amount_spent,
       -- Ensure created_at is within range (min = 2023-12-01)
       CASE WHEN y.year = 2023 THEN timestamp '2023-12-01' ELSE make_date(y.year, 1, 1)::timestamp END AS created_at,
       CASE WHEN y.year = 2023 THEN timestamp '2023-12-01' ELSE make_date(y.year, 1, 1)::timestamp END AS updated_at
FROM dept_categories dc
CROSS JOIN years y;

-- ============================================================
-- REQUEST
-- ============================================================
-- Table: public.request
-- Columns: request_id, request_code, title, requester_id, department_id, description, status, event_date, total_estimated_amount, annual_budget_id, campaign_code, created_at, updated_at
WITH dept_base AS (
  SELECT 1 AS department_id, 8 AS base_count UNION ALL
  SELECT 2, 4 UNION ALL
  SELECT 3, 7 UNION ALL
  SELECT 4, 2 UNION ALL
  SELECT 5, 2
),
month_dept AS (
  SELECT m.month_start, m.month_end, m.year, m.month, m.days_in_month, m.season_factor, m.year_factor,
         d.department_id,
         GREATEST(1, ROUND(d.base_count * m.season_factor * m.year_factor
           + CASE WHEN m.year = 2025 AND m.month = 12 THEN 2 ELSE 0 END))::int AS req_count
  FROM tmp_months m
  JOIN dept_base d ON TRUE
),
req_seed AS (
  SELECT month_start, month_end, year, month, days_in_month, department_id, season_factor,
         generate_series(1, req_count) AS seq_in_month
  FROM month_dept
),
req_rows AS (
  SELECT row_number() over (order by month_start, department_id, seq_in_month) AS request_id,
         month_start, month_end, year, month, days_in_month, department_id, season_factor, seq_in_month,
         (month_start + ((seq_in_month * 3 + department_id + month) % days_in_month) * interval '1 day'
          + ((seq_in_month % 8) * interval '1 hour')) AS created_at
  FROM req_seed
),
budget_pool AS (
  SELECT annual_budget_id, department_id, year, category,
         row_number() over (partition by department_id, year order by annual_budget_id) as rn,
         count(*) over (partition by department_id, year) as cnt
  FROM public.annual_budget
),
emp_pool AS (
  SELECT employee_id, department_id,
         row_number() over (partition by department_id order by employee_id) as rn,
         count(*) over (partition by department_id) as cnt
  FROM public.employee
),
req_enriched AS (
  SELECT r.*,
         b.annual_budget_id,
         b.category,
         e.employee_id AS requester_id,
         CASE
           WHEN (r.request_id % 20) = 0 THEN 'Rejected'
           WHEN (r.request_id % 7) = 0 THEN 'Draft'
           WHEN (r.request_id % 5) = 0 THEN 'Pending'
           -- Completed: approved requests from past months (event_date < 2025-11-01)
           WHEN r.month_start < timestamp '2025-11-01' AND (r.request_id % 3) = 0 THEN 'Completed'
           ELSE 'Approved'
         END AS status
  FROM req_rows r
  JOIN budget_pool b ON b.department_id = r.department_id AND b.year = r.year AND b.rn = ((r.request_id - 1) % b.cnt) + 1
  JOIN emp_pool e ON e.department_id = r.department_id AND e.rn = ((r.request_id - 1) % e.cnt) + 1
),
event_meta AS (
  SELECT request_id,
         CASE (request_id % 5)
           WHEN 0 THEN 'HCM'
           WHEN 1 THEN 'HN'
           WHEN 2 THEN 'DN'
           WHEN 3 THEN 'CT'
           ELSE 'HP'
         END AS city_code,
         CASE (request_id % 4)
           WHEN 0 THEN 'Hội thảo'
           WHEN 1 THEN 'Roadshow'
           WHEN 2 THEN 'Workshop'
           ELSE 'Tư vấn 1-1'
         END AS event_type
  FROM req_enriched
),
category_cost AS (
  SELECT * FROM (VALUES
    ('Hội thảo khách hàng', 100000000::numeric),
    ('Activation địa phương', 70000000::numeric),
    ('Chăm sóc khách hàng', 50000000::numeric),
    ('Đào tạo Sales', 42000000::numeric),
    ('Incentive nội bộ', 34000000::numeric),
    ('Chi phí di chuyển', 25000000::numeric),
    ('Digital Marketing', 75000000::numeric),
    ('PR/Branding', 65000000::numeric),
    ('Nội dung/Creative', 50000000::numeric),
    ('Tuân thủ/Pháp lý', 25000000::numeric),
    ('Hệ thống kế toán', 40000000::numeric),
    ('Kiểm toán', 33000000::numeric),
    ('Văn phòng phẩm', 16000000::numeric),
    ('Hạ tầng IT', 40000000::numeric),
    ('Phúc lợi nội bộ', 30000000::numeric)
  ) AS t(category, base_event)
),
req_final AS (
  SELECT r.*,
         em.city_code,
         em.event_type,
         cc.base_event,
         -- Fixed: event_date must stay within same year as annual_budget (trigger validation)
         -- Clamp event_date to stay within the budget year
         LEAST(
           r.created_at + (3 + (r.request_id % 18)) * interval '1 day',
           make_timestamp(r.year, 12, 31, 23, 59, 59),  -- Don't exceed budget year
           timestamp '2025-12-31 23:59:59'
         ) AS event_date
  FROM req_enriched r
  JOIN event_meta em ON em.request_id = r.request_id
  JOIN category_cost cc ON cc.category = r.category
)
INSERT INTO public.request (request_id, request_code, title, requester_id, department_id, description, status, event_date, total_estimated_amount, annual_budget_id, campaign_id, campaign_code, created_at, updated_at)
SELECT request_id,
       'REQ-' || to_char(created_at, 'YYMM') || '-' || lpad(request_id::text, 5, '0') AS request_code,
       event_type || ' ' || city_code || ' ' || to_char(event_date, 'MM/YYYY') AS title,
       requester_id,
       department_id,
       'Kế hoạch ' || event_type || ' tại ' || city_code || ', theo ngân sách ' || category AS description,
       status,
       event_date,
       ROUND(base_event * (1 + (request_id % 5) * 0.03) * season_factor, 2)::numeric(19,2) AS total_estimated_amount,
       annual_budget_id,
       -- campaign_id: lookup from campaign table based on campaign_code pattern
       (SELECT c.campaign_id FROM public.campaign c WHERE c.campaign_code = city_code || '_' || to_char(event_date, 'MMYY') LIMIT 1) AS campaign_id,
       CASE WHEN status = 'Approved' AND department_id IN (1,3) THEN city_code || '_' || to_char(event_date, 'MMYY') ELSE NULL END AS campaign_code,
       created_at,
       created_at + ((request_id % 5) * interval '1 day') AS updated_at
FROM req_final;
-- ============================================================
-- BUDGET ITEM
-- ============================================================
-- Table: public.budget_item
-- Columns: item_id, request_id, item_name, description, requested_amount, vendor_quote_link, created_at, updated_at
WITH item_templates AS (
  SELECT 1 AS item_order, 'Thuê địa điểm' AS item_name, 0.32::numeric AS ratio, 'Chi phí thuê hội trường' AS description
  UNION ALL SELECT 2, 'Tea-break', 0.12, 'Tea-break và nước uống'
  UNION ALL SELECT 3, 'Quà tặng khách mời', 0.18, 'Quà tặng và vật phẩm'
  UNION ALL SELECT 4, 'Truyền thông & ads', 0.20, 'Quảng bá trước sự kiện'
  UNION ALL SELECT 5, 'In ấn & backdrop', 0.10, 'POSM/Backdrop'
  UNION ALL SELECT 6, 'Nhân sự & vận hành', 0.08, 'Nhân sự hỗ trợ'
),
item_pick AS (
  SELECT r.request_id,
         r.total_estimated_amount,
         r.created_at,
         t.item_order,
         t.item_name,
         t.description,
         t.ratio,
         (3 + (r.request_id % 4)) AS item_count
  FROM public.request r
  JOIN item_templates t ON t.item_order <= (3 + (r.request_id % 4))
),
ratio_sum AS (
  SELECT request_id, SUM(ratio) AS sum_ratio
  FROM item_pick
  GROUP BY request_id
)
INSERT INTO public.budget_item (item_id, request_id, item_name, description, requested_amount, vendor_quote_link, created_at, updated_at)
SELECT row_number() over (order by ip.request_id, ip.item_order) AS item_id,
       ip.request_id,
       ip.item_name,
       ip.description,
       ROUND(ip.total_estimated_amount * ip.ratio / rs.sum_ratio, 2) AS requested_amount,
       'https://vendor.example.com/quote/' || ip.request_id || '/' || ip.item_order AS vendor_quote_link,
       ip.created_at + (ip.item_order * interval '1 hour') AS created_at,
       ip.created_at + (ip.item_order * interval '2 hours') AS updated_at
FROM item_pick ip
JOIN ratio_sum rs ON rs.request_id = ip.request_id;

-- ============================================================
-- DOCUMENT
-- ============================================================
-- Table: public.document
-- Columns: document_id, request_id, file_name, file_path, uploaded_by_id, upload_timestamp
WITH req AS (
  SELECT request_id, request_code, status, created_at, requester_id
  FROM public.request
),
doc_templates AS (
  SELECT 1 AS doc_order, 'proposal' AS suffix, 'pdf' AS ext
  UNION ALL SELECT 2, 'budget', 'xlsx'
),
doc_pick AS (
  SELECT r.request_id, r.request_code, r.status, r.created_at, r.requester_id,
         t.doc_order, t.suffix, t.ext,
         CASE
           WHEN r.status IN ('Approved', 'Completed') THEN 2  -- Fixed: added Completed
           WHEN r.status = 'Pending' THEN 1
           WHEN r.status = 'Rejected' THEN 1
           ELSE 0
         END AS doc_count
  FROM req r
  CROSS JOIN doc_templates t
)
INSERT INTO public.document (document_id, request_id, file_name, file_path, uploaded_by_id, upload_timestamp)
SELECT row_number() over (order by dp.request_id, dp.doc_order) AS document_id,
       dp.request_id,
       dp.request_code || '_' || dp.suffix || '.' || dp.ext AS file_name,
       '/uploads/requests/' || dp.request_code || '/' || dp.request_code || '_' || dp.suffix || '.' || dp.ext AS file_path,
       dp.requester_id AS uploaded_by_id,
       LEAST(dp.created_at + (dp.doc_order * interval '1 day'), timestamp '2025-12-31 23:59:59') AS upload_timestamp
FROM doc_pick dp
WHERE dp.doc_order <= dp.doc_count;
-- ============================================================
-- APPROVAL WORKFLOW
-- ============================================================
-- Table: public.approval_workflow
-- Columns: step_id, request_id, step_number, approver_id, status, comment, action_timestamp, created_at
WITH steps AS (
  SELECT 1 AS step_number UNION ALL SELECT 2 UNION ALL SELECT 3
),
req AS (
  SELECT request_id, status, created_at, department_id
  FROM public.request
  WHERE status != 'Draft'  -- Draft requests don't enter approval workflow
),
dept_manager AS (
  SELECT department_id, MIN(employee_id) AS manager_id
  FROM public.employee
  GROUP BY department_id
),
finance_approver AS (
  SELECT MIN(employee_id) AS approver_id FROM public.employee WHERE role = 'Finance_Controller'
),
admin_approver AS (
  SELECT MIN(employee_id) AS approver_id FROM public.employee WHERE role = 'Admin'
),
wf AS (
  SELECT r.request_id, s.step_number, r.status, r.created_at, r.department_id
  FROM req r
  CROSS JOIN steps s
)
INSERT INTO public.approval_workflow (step_id, request_id, step_number, approver_id, status, comment, action_timestamp, created_at)
SELECT row_number() over (order by wf.request_id, wf.step_number) AS step_id,
       wf.request_id,
       wf.step_number,
       CASE wf.step_number
         WHEN 1 THEN dm.manager_id
         WHEN 2 THEN fa.approver_id
         ELSE aa.approver_id
       END AS approver_id,
       CASE
         WHEN wf.status IN ('Approved', 'Completed') THEN 'Approved'  -- Fixed: added Completed
         WHEN wf.status = 'Rejected' THEN CASE WHEN wf.step_number = 2 THEN 'Rejected' WHEN wf.step_number = 1 THEN 'Approved' ELSE 'Skipped' END
         WHEN wf.status = 'Pending' THEN CASE WHEN wf.step_number = 1 THEN 'Approved' ELSE 'Pending' END
         ELSE 'Pending'
       END AS status,
       CASE
         WHEN wf.status = 'Rejected' AND wf.step_number = 2 THEN 'Thiếu chứng từ/định mức'
         WHEN wf.status IN ('Approved', 'Completed') THEN 'Đã phê duyệt'  -- Fixed: added Completed
         WHEN wf.status = 'Pending' THEN 'Đang chờ xử lý'
         ELSE NULL
       END AS comment,
       CASE
         WHEN wf.status IN ('Approved', 'Completed') THEN LEAST(wf.created_at + (wf.step_number * interval '1 day'), timestamp '2025-12-31 23:59:59')  -- Fixed: added Completed
         WHEN wf.status = 'Rejected' AND wf.step_number = 2 THEN LEAST(wf.created_at + interval '2 day', timestamp '2025-12-31 23:59:59')
         ELSE NULL
       END AS action_timestamp,
       LEAST(wf.created_at + (wf.step_number * interval '1 day'), timestamp '2025-12-31 23:59:59') AS created_at
FROM wf
LEFT JOIN dept_manager dm ON dm.department_id = wf.department_id
CROSS JOIN finance_approver fa
CROSS JOIN admin_approver aa;
-- ============================================================
-- PARTY
-- ============================================================
-- Table: public.party
-- Columns: party_id, name, date_of_birth, gender, citizen_id, location, phone_number, email, role, pipeline_stage_id, sales_channel_id, assigned_to, created_at, updated_at
WITH role_base AS (
  SELECT 'Lead'::text AS role, 80 AS base_count UNION ALL
  SELECT 'Customer', 70 UNION ALL
  SELECT 'Partner', 8 UNION ALL
  SELECT 'Beneficiary', 6 UNION ALL
  SELECT 'Agent', 6 UNION ALL
  SELECT 'Insured', 40 UNION ALL  -- Added: người được bảo hiểm (có thể khác Customer)
  SELECT 'Owner', 25    -- Added: chủ hợp đồng
),
role_counts AS (
  -- Apply kpi_factor to adjust actual party counts vs target
  SELECT m.month_start, m.month_end, m.year, m.month, m.days_in_month, m.season_factor, m.year_factor, m.kpi_factor,
         r.role,
         GREATEST(1, ROUND(r.base_count * m.season_factor * m.year_factor * m.kpi_factor  -- Apply kpi_factor
           + CASE WHEN m.year = 2025 AND m.month = 12 THEN 12 ELSE 0 END))::int AS role_count
  FROM tmp_months m
  JOIN role_base r ON TRUE
),
party_seed AS (
  SELECT month_start, month_end, year, month, days_in_month, role,
         generate_series(1, role_count) AS seq_in_role
  FROM role_counts
),
party_rows AS (
  SELECT row_number() over (order by month_start, role, seq_in_role) AS party_id,
         month_start, month_end, year, month, days_in_month, role, seq_in_role,
         (month_start + ((seq_in_role * 2 + month) % days_in_month) * interval '1 day'
          + interval '09:00') AS base_date
  FROM party_seed
),
names AS (
  SELECT
    ARRAY['Nguyễn','Trần','Lê','Phạm','Hoàng','Huỳnh','Phan','Vũ','Võ','Đặng','Bùi','Đỗ','Hồ','Ngô','Dương','Lý','Đinh','Trương','Đoàn','Mai','Tạ','Phùng','Đoàn','Vương','Lâm'] AS last_names,
    ARRAY['Văn','Thị','Hữu','Minh','Thanh','Quang','Khánh','Ngọc','Bảo','Gia','Đức','Anh','Thu','Hoài','Tuấn','Hải','Phương','Hà'] AS mid_names,
    ARRAY['An','Bình','Châu','Dũng','Hà','Hạnh','Hòa','Huy','Hương','Khôi','Linh','Long','Mai','Nam','Nhi','Phúc','Quân','Thảo','Trang','Tuấn','Uyên','Vy','Yến','Trí','Sơn','Khoa'] AS first_names
),
stage_ids AS (
  SELECT
    MAX(CASE WHEN stage_name = 'Leads mới' THEN stage_id END) AS stage_lead,
    MAX(CASE WHEN stage_name = 'Đang tư vấn' THEN stage_id END) AS stage_consult,
    MAX(CASE WHEN stage_name = 'Đang chốt' THEN stage_id END) AS stage_close,
    MAX(CASE WHEN stage_name = 'Thẩm định' THEN stage_id END) AS stage_review,
    MAX(CASE WHEN stage_name = 'Phát hành' THEN stage_id END) AS stage_issue
  FROM public.pipeline_stage_config
),
channel_list AS (
  SELECT channel_id,
         row_number() over (order by channel_id) AS rn,
         count(*) over () AS cnt
  FROM public.sales_channel_config
)
INSERT INTO public.party (party_id, name, date_of_birth, gender, citizen_id, location, phone_number, email, role, pipeline_stage_id, sales_channel_id, assigned_to, created_at, updated_at)
SELECT pr.party_id,
       ln || ' ' || mn || ' ' || fn AS name,
       -- Improved: Realistic age distribution (25-60 years old, weighted toward 30-45)
       (date '1965-01-01' + (
         (CASE
           WHEN (pr.party_id % 100) < 5 THEN 0 + ((pr.party_id * 17) % 1500)  -- 5% born 1965-1969 (55-60yo)
           WHEN (pr.party_id % 100) < 15 THEN 1500 + ((pr.party_id * 23) % 1825)  -- 10% born 1969-1974 (50-55yo)
           WHEN (pr.party_id % 100) < 35 THEN 3325 + ((pr.party_id * 31) % 1825)  -- 20% born 1974-1979 (45-50yo)
           WHEN (pr.party_id % 100) < 60 THEN 5150 + ((pr.party_id * 37) % 1825)  -- 25% born 1979-1984 (40-45yo)
           WHEN (pr.party_id % 100) < 80 THEN 6975 + ((pr.party_id * 41) % 1825)  -- 20% born 1984-1989 (35-40yo)
           WHEN (pr.party_id % 100) < 92 THEN 8800 + ((pr.party_id * 43) % 1825)  -- 12% born 1989-1994 (30-35yo)
           ELSE 10625 + ((pr.party_id * 47) % 1825)  -- 8% born 1994-1999 (25-30yo)
         END)::int * interval '1 day'
       ))::date AS date_of_birth,
       (CASE (pr.party_id % 2) WHEN 0 THEN 'Male' ELSE 'Female' END)::gender_enum AS gender,
       -- citizen_id: realistic format with varied patterns
       CASE WHEN pr.role IN ('Lead','Customer','Partner','Agent','Insured','Owner')
            THEN to_char(
              -- Base: birth province code (2 digits) + gender digit + birth year (2 digits) + sequence (6 digits)
              CASE (pr.party_id % 63)  -- 63 provinces
                WHEN 0 THEN 1 WHEN 1 THEN 2 WHEN 2 THEN 4 WHEN 3 THEN 6 WHEN 4 THEN 8
                WHEN 5 THEN 10 WHEN 6 THEN 11 WHEN 7 THEN 12 WHEN 8 THEN 14 WHEN 9 THEN 15
                ELSE 17 + (pr.party_id % 63)
              END::BIGINT * 10000000000  -- Province prefix (10^10)
              + ((pr.party_id % 2) * 4 + 1)::BIGINT * 1000000000  -- Gender digit (1=male 1900-1999, 0=female)
              + ((65 + (pr.party_id % 35))::BIGINT % 100) * 10000000  -- Birth year last 2 digits
              + (pr.party_id * 137 % 1000000)  -- Sequence (varied)
            , 'FM000000000000')
            ELSE NULL END AS citizen_id,
       -- Improved: Population-weighted location distribution (reflects real Vietnam demographics)
       CASE
         WHEN (pr.party_id % 100) < 30 THEN 'TP HCM'  -- 30%
         WHEN (pr.party_id % 100) < 50 THEN 'Hà Nội'  -- 20%
         WHEN (pr.party_id % 100) < 58 THEN 'Đà Nẵng'  -- 8%
         WHEN (pr.party_id % 100) < 65 THEN 'Cần Thơ'  -- 7%
         WHEN (pr.party_id % 100) < 71 THEN 'Hải Phòng'  -- 6%
         WHEN (pr.party_id % 100) < 76 THEN 'Bình Dương'  -- 5%
         WHEN (pr.party_id % 100) < 81 THEN 'Đồng Nai'  -- 5%
         WHEN (pr.party_id % 100) < 86 THEN 'Nghệ An'  -- 5%
         WHEN (pr.party_id % 100) < 91 THEN 'Quảng Ninh'  -- 5%
         WHEN (pr.party_id % 100) < 95 THEN 'Thanh Hóa'  -- 4%
         ELSE 'Khánh Hòa'  -- 5%
       END AS location,
       CASE WHEN pr.role IN ('Lead','Customer','Partner','Agent','Insured','Owner')
             THEN 
               -- Improved: Varied phone prefixes (Vietnamese mobile carriers)
               CASE
                 WHEN (pr.party_id % 5) = 0 THEN '090'  -- Mobifone
                 WHEN (pr.party_id % 5) = 1 THEN '091'  -- Vinaphone
                 WHEN (pr.party_id % 5) = 2 THEN '093'  -- Mobifone
                 WHEN (pr.party_id % 5) = 3 THEN '098'  -- Viettel
                 ELSE '097'  -- Viettel
               END || lpad(((pr.party_id * 73 + pr.party_id * 137) % 10000000)::text, 7, '0')
             ELSE NULL END AS phone_number,
       CASE WHEN pr.role IN ('Lead','Customer','Insured','Owner') AND (pr.party_id % 3) <> 0
            THEN 'user' || pr.party_id || '@mail.vn'
            ELSE NULL END AS email,
       pr.role,
       CASE
         WHEN pr.role = 'Lead' THEN (CASE WHEN pr.party_id % 3 = 0 THEN s.stage_consult WHEN pr.party_id % 3 = 1 THEN s.stage_close ELSE s.stage_lead END)
         WHEN pr.role = 'Customer' THEN s.stage_issue
         WHEN pr.role IN ('Insured','Owner') THEN s.stage_issue  -- Insured/Owner cùng stage với Customer
         WHEN pr.role IN ('Partner','Agent') THEN s.stage_close
         ELSE s.stage_review
       END AS pipeline_stage_id,
       CASE WHEN pr.role IN ('Lead','Customer','Partner','Agent','Insured','Owner')
            THEN (
              SELECT channel_id 
              FROM public.sales_channel_config 
              ORDER BY channel_id 
              LIMIT 1 OFFSET ((pr.party_id - 1) % (SELECT COUNT(*) FROM public.sales_channel_config))
            )
            ELSE NULL END AS sales_channel_id,
       CASE WHEN pr.role IN ('Lead','Customer')
            THEN (
              SELECT employee_id FROM public.employee
              WHERE role = 'Sales'
              ORDER BY employee_id
              LIMIT 1 OFFSET ((pr.party_id - 1) % (SELECT COUNT(*) FROM public.employee WHERE role = 'Sales'))
            )
            ELSE NULL END AS assigned_to,
       CASE
         WHEN EXTRACT(DOW FROM pr.base_date) = 0 THEN pr.base_date + interval '1 day'
         WHEN EXTRACT(DOW FROM pr.base_date) = 6 THEN pr.base_date + interval '2 days'
         ELSE pr.base_date
       END AS created_at,
       LEAST(
         CASE
           WHEN EXTRACT(DOW FROM pr.base_date) = 0 THEN pr.base_date + interval '1 day'
           WHEN EXTRACT(DOW FROM pr.base_date) = 6 THEN pr.base_date + interval '2 days'
           ELSE pr.base_date
         END + (CASE WHEN pr.role = 'Customer' THEN interval '30 days' ELSE interval '12 days' END),
         timestamp '2025-12-31 23:59:59'
       ) AS updated_at
FROM party_rows pr
CROSS JOIN names
CROSS JOIN stage_ids s
CROSS JOIN LATERAL (
  SELECT
    (SELECT last_names[1 + ((pr.party_id - 1) % array_length(last_names,1))] FROM names) AS ln,
    (SELECT mid_names[1 + ((pr.party_id - 1) % array_length(mid_names,1))] FROM names) AS mn,
    (SELECT first_names[1 + ((pr.party_id - 1) % array_length(first_names,1))] FROM names) AS fn
) nm;

-- Progress some leads across stages (pipeline history trigger will record)
UPDATE public.party
SET pipeline_stage_id = (SELECT stage_id FROM public.pipeline_stage_config WHERE stage_name = 'Đang tư vấn'),
    updated_at = LEAST(created_at + interval '10 days', timestamp '2025-12-31 23:59:59')
WHERE role = 'Lead' AND party_id % 4 = 0;

UPDATE public.party
SET pipeline_stage_id = (SELECT stage_id FROM public.pipeline_stage_config WHERE stage_name = 'Đang chốt'),
    updated_at = LEAST(created_at + interval '20 days', timestamp '2025-12-31 23:59:59')
WHERE role = 'Lead' AND party_id % 6 = 0;

UPDATE public.party
SET pipeline_stage_id = (SELECT stage_id FROM public.pipeline_stage_config WHERE stage_name = 'Thẩm định'),
    updated_at = LEAST(created_at + interval '35 days', timestamp '2025-12-31 23:59:59')
WHERE role = 'Lead' AND party_id % 10 = 0;

UPDATE public.party
SET pipeline_stage_id = (SELECT stage_id FROM public.pipeline_stage_config WHERE stage_name = 'Phát hành'),
    role = 'Customer',
    updated_at = LEAST(created_at + interval '45 days', timestamp '2025-12-31 23:59:59')
WHERE role = 'Lead' AND party_id % 12 = 0;

-- ============================================================
-- ACTIVITY
-- ============================================================
-- Table: public.activity
-- Columns: activity_id, employee_id, party_id, activity_type, activity_date, notes, outcome, next_action_date, created_at
WITH target_parties AS (
  SELECT party_id, assigned_to AS employee_id, role, created_at
  FROM public.party
  WHERE role IN ('Lead','Customer')
    AND assigned_to IS NOT NULL  -- Fixed: employee_id is NOT NULL in activity schema
),
activity_seed AS (
  SELECT party_id, employee_id, role, created_at,
         generate_series(1, CASE WHEN role = 'Lead' THEN 2 + (party_id % 2) ELSE 1 + (party_id % 2) END) AS seq
  FROM target_parties
),
activity_rows AS (
  SELECT row_number() over (order by party_id, seq) AS activity_id,
         party_id,
         employee_id,
         CASE (party_id + seq) % 6
           WHEN 0 THEN 'Call'
           WHEN 1 THEN 'Meeting'
           WHEN 2 THEN 'Email'
           WHEN 3 THEN 'Presentation'
           WHEN 4 THEN 'Follow-up'
           ELSE 'Site Visit'
         END AS activity_type,
         LEAST(created_at + (seq * interval '5 days'), timestamp '2025-12-31 23:59:59') AS activity_date,
         CASE (party_id + seq) % 4
           WHEN 0 THEN 'Đã liên hệ và gửi tài liệu'
           WHEN 1 THEN 'Khách hàng quan tâm'
           WHEN 2 THEN 'Chưa nghe máy'
           ELSE 'Hẹn lịch tư vấn'
         END AS notes,
         CASE (party_id + seq) % 5
           WHEN 0 THEN 'Interested'
           WHEN 1 THEN 'No Answer'
           WHEN 2 THEN 'Need Follow-up'
           WHEN 3 THEN 'Qualified'
           ELSE 'Not Interested'
         END AS outcome
  FROM activity_seed
)
INSERT INTO public.activity (activity_id, employee_id, party_id, activity_type, activity_date, notes, outcome, next_action_date, created_at)
SELECT activity_id,
       employee_id,
       party_id,
       activity_type,
       activity_date,
       notes,
       outcome,
       CASE
         WHEN outcome IN ('Interested','Need Follow-up') THEN LEAST(activity_date + interval '7 days', timestamp '2025-12-31 23:59:59')
         ELSE NULL
       END AS next_action_date,
       activity_date AS created_at
FROM activity_rows;
-- ============================================================
-- POLICY
-- ============================================================
-- Table: public.policy
-- Columns: policy_id, policy_number, party_id, salesperson_id, effective_date, expiration_date, status, premium_due_date, campaign_code, created_at, updated_at
WITH customers AS (
  SELECT party_id, assigned_to AS salesperson_id, created_at,
         row_number() over (order by party_id) AS rn
  FROM public.party
  WHERE role = 'Customer'
),
policy_seed AS (
  SELECT party_id, salesperson_id, created_at, 1 AS policy_seq
  FROM customers
  UNION ALL
  SELECT party_id, salesperson_id, created_at, 2 AS policy_seq
  FROM customers
  WHERE (rn % 2) = 0
),
policy_rows AS (
  SELECT row_number() over (order by party_id, policy_seq) AS policy_id,
         party_id,
         salesperson_id,
         LEAST(created_at + interval '10 days'
              + (policy_seq - 1) * interval '180 days'
              + (party_id % 10) * interval '1 day',
              timestamp '2025-12-31 10:00:00') AS effective_date
  FROM policy_seed
),
campaigns AS (
  -- Get ALL campaigns with global row_number for round-robin assignment
  SELECT c.campaign_id,
         c.campaign_code,
         date_trunc('month', c.start_date)::date AS month_start,
         row_number() over (order by c.start_date, c.campaign_code) AS rn
  FROM public.campaign c
  WHERE c.status IN ('Active', 'Completed')  -- Only campaigns with costs
),
campaign_count AS (
  SELECT COUNT(*) AS total_cnt FROM campaigns
),
policy_final AS (
  SELECT pr.*,
         CASE
           WHEN pr.policy_id % 12 = 0 THEN 'Cancelled'
           WHEN pr.policy_id % 10 = 0 THEN 'Lapsed'
           WHEN pr.effective_date <= timestamp '2024-06-30' AND pr.policy_id % 7 = 0 THEN 'Expired'
           WHEN pr.effective_date > timestamp '2025-06-01' THEN 'Pending'
           ELSE 'Active'
         END AS status,
         LEAST(pr.effective_date + interval '15 days', timestamp '2025-12-31 23:59:59') AS premium_due_date,
         pr.effective_date + interval '10 years' AS expiration_date
  FROM policy_rows pr
)
INSERT INTO public.policy (policy_id, policy_number, party_id, salesperson_id, effective_date, expiration_date, status, premium_due_date, campaign_id, campaign_code, created_at, updated_at)
SELECT policy_id,
       'POL-' || to_char(effective_date, 'YYMM') || '-' || lpad(policy_id::text, 6, '0') AS policy_number,
       party_id,
       salesperson_id,
       effective_date,
       CASE WHEN status IN ('Expired','Cancelled','Lapsed') THEN expiration_date ELSE NULL END AS expiration_date,
       status,
       premium_due_date,
       -- campaign_id: Assign to most recent campaign (lookback 3 months)
       CASE WHEN (policy_id % 3) != 2  -- 2/3 of policies have campaign
            THEN (
              SELECT cc.campaign_id
              FROM campaigns cc
              WHERE cc.month_start <= date_trunc('month', effective_date)::date
                AND cc.month_start >= (date_trunc('month', effective_date)::date - interval '3 months')
              ORDER BY cc.month_start DESC, cc.campaign_code
              LIMIT 1
            )
            ELSE NULL END AS campaign_id,
       CASE WHEN (policy_id % 3) != 2  -- 2/3 of policies have campaign
            THEN (
              SELECT cc.campaign_code
              FROM campaigns cc
              WHERE cc.month_start <= date_trunc('month', effective_date)::date
                AND cc.month_start >= (date_trunc('month', effective_date)::date - interval '3 months')
              ORDER BY cc.month_start DESC, cc.campaign_code
              LIMIT 1
            )
            ELSE NULL END AS campaign_code,
       effective_date AS created_at,
       LEAST(effective_date + interval '5 days', timestamp '2025-12-31 23:59:59') AS updated_at
FROM policy_final;

-- ============================================================
-- POLICY FOR CONVERTED CUSTOMERS (from Lead)
-- ============================================================
-- Ensure all Customers have at least one policy (runs AFTER main policy insert)
WITH converted_customers AS (
  SELECT party_id, assigned_to AS salesperson_id, created_at
  FROM public.party
  WHERE role = 'Customer'
    AND party_id NOT IN (SELECT DISTINCT party_id FROM public.policy)
),
new_policy_rows AS (
  SELECT 
    (SELECT COALESCE(MAX(policy_id), 0) FROM public.policy) + row_number() over (order by party_id) AS policy_id,
    party_id,
    salesperson_id,
    LEAST(created_at + interval '45 days', timestamp '2025-12-31 10:00:00') AS effective_date
  FROM converted_customers
)
INSERT INTO public.policy (policy_id, policy_number, party_id, salesperson_id, effective_date, expiration_date, status, premium_due_date, campaign_id, campaign_code, created_at, updated_at)
SELECT 
  policy_id,
  'POL-' || to_char(effective_date, 'YYMM') || '-' || lpad(policy_id::text, 6, '0') AS policy_number,
  party_id,
  salesperson_id,
  effective_date,
  NULL AS expiration_date,  -- Consistent with main block: Active policies have NULL expiration_date
  'Active' AS status,
  LEAST(effective_date + interval '1 month', timestamp '2025-12-31 23:59:59') AS premium_due_date,
  NULL AS campaign_id,  -- No campaign for converted customers
  NULL AS campaign_code,
  effective_date AS created_at,
  LEAST(effective_date + interval '5 days', timestamp '2025-12-31 23:59:59') AS updated_at
FROM new_policy_rows;

-- ============================================================
-- COVERAGE
-- ============================================================
-- Table: public.coverage
-- Columns: coverage_id, policy_id, party_id, product_id, sum_assured, premium_amount, created_at, updated_at
WITH product_list AS (
  SELECT product_id,
         row_number() over (order by product_id) AS rn,
         count(*) over () AS cnt
  FROM public.product
  WHERE status = 'Active'  -- Only select Active products, exclude Discontinued
    AND issue_date <= DATE '2025-12-31'  -- Deterministic: use fixed date instead of CURRENT_DATE
    AND (end_date IS NULL OR end_date >= DATE '2023-12-01')  -- Product was valid during data range
),
coverage_seed AS (
  SELECT p.policy_id, p.party_id, p.effective_date,
         CASE
           WHEN p.policy_id % 5 = 0 THEN 3
           WHEN p.policy_id % 3 = 0 THEN 2
           ELSE 1
         END AS cov_count
  FROM public.policy p
),
coverage_rows AS (
  SELECT row_number() over (order by policy_id, seq) AS coverage_id,
         policy_id,
         party_id,
         effective_date,
         seq
  FROM coverage_seed
  CROSS JOIN LATERAL generate_series(1, cov_count) AS seq
)
INSERT INTO public.coverage (coverage_id, policy_id, party_id, product_id, sum_assured, premium_amount, created_at, updated_at)
SELECT cr.coverage_id,
       cr.policy_id,
       cr.party_id,
       (SELECT product_id FROM product_list pl WHERE pl.rn = ((cr.policy_id + cr.seq - 1) % pl.cnt) + 1) AS product_id,
       -- Improved: More varied sum_assured with tiered distribution
       CASE
         WHEN cr.seq = 1 THEN  -- Main coverage: 300M - 2B with varied steps
           CASE
             WHEN (cr.policy_id % 100) < 5 THEN 2000000000  -- 5% Elite (2B)
             WHEN (cr.policy_id % 100) < 15 THEN 1500000000 + ((cr.policy_id * 17) % 5) * 100000000  -- 10% Premium (1.5B-1.9B)
             WHEN (cr.policy_id % 100) < 35 THEN 800000000 + ((cr.policy_id * 23) % 7) * 100000000  -- 20% Standard (800M-1.4B)
             WHEN (cr.policy_id % 100) < 60 THEN 500000000 + ((cr.policy_id * 31) % 6) * 50000000   -- 25% Basic (500M-750M)
             ELSE 300000000 + ((cr.policy_id * 37) % 8) * 25000000  -- 40% Entry (300M-475M)
           END
         ELSE  -- Rider coverage: 50M - 300M
           CASE
             WHEN (cr.coverage_id % 50) < 10 THEN 250000000 + ((cr.coverage_id * 13) % 5) * 10000000  -- 20% High rider
             WHEN (cr.coverage_id % 50) < 25 THEN 150000000 + ((cr.coverage_id * 19) % 10) * 10000000 -- 30% Medium rider
             ELSE 50000000 + ((cr.coverage_id * 29) % 10) * 10000000  -- 50% Basic rider
           END
       END AS sum_assured,
       -- Improved: Premium rate varies by tier (realistic age-based pricing simulation)
       CASE
         WHEN cr.seq = 1 THEN  -- Main coverage premium: 0.18% - 0.35% of sum_assured
           ROUND(
             CASE
               WHEN (cr.policy_id % 100) < 5 THEN 2000000000 * (0.0020 + ((cr.policy_id % 10) * 0.0002))
               WHEN (cr.policy_id % 100) < 15 THEN (1500000000 + ((cr.policy_id * 17) % 5) * 100000000) * (0.0022 + ((cr.policy_id % 10) * 0.0002))
               WHEN (cr.policy_id % 100) < 35 THEN (800000000 + ((cr.policy_id * 23) % 7) * 100000000) * (0.0025 + ((cr.policy_id % 10) * 0.0003))
               WHEN (cr.policy_id % 100) < 60 THEN (500000000 + ((cr.policy_id * 31) % 6) * 50000000) * (0.0028 + ((cr.policy_id % 10) * 0.0003))
               ELSE (300000000 + ((cr.policy_id * 37) % 8) * 25000000) * (0.0032 + ((cr.policy_id % 10) * 0.0003))
             END
           , 2)
         ELSE  -- Rider premium: 0.10% - 0.18%
           ROUND(
             CASE
               WHEN (cr.coverage_id % 50) < 10 THEN (250000000 + ((cr.coverage_id * 13) % 5) * 10000000) * 0.0012
               WHEN (cr.coverage_id % 50) < 25 THEN (150000000 + ((cr.coverage_id * 19) % 10) * 10000000) * 0.0014
               ELSE (50000000 + ((cr.coverage_id * 29) % 10) * 10000000) * 0.0016
             END
           , 2)
       END AS premium_amount,
       cr.effective_date AS created_at,
       LEAST(cr.effective_date + interval '1 day', timestamp '2025-12-31 23:59:59') AS updated_at
FROM coverage_rows cr;

-- ============================================================
-- COVERAGE FOR CONVERTED CUSTOMERS' POLICIES
-- ============================================================
-- Ensure all policies have at least one coverage
WITH policies_without_coverage AS (
  SELECT p.policy_id, p.party_id, p.effective_date
  FROM public.policy p
  WHERE p.policy_id NOT IN (SELECT DISTINCT policy_id FROM public.coverage)
),
product_list AS (
  SELECT product_id,
         row_number() over (order by product_id) AS rn,
         count(*) over () AS cnt
  FROM public.product
  WHERE status = 'Active'  -- Only Active products
    AND issue_date <= DATE '2025-12-31'  -- Deterministic
    AND (end_date IS NULL OR end_date >= DATE '2023-12-01')
)
INSERT INTO public.coverage (coverage_id, policy_id, party_id, product_id, sum_assured, premium_amount, created_at, updated_at)
SELECT 
  (SELECT COALESCE(MAX(coverage_id), 0) FROM public.coverage) + row_number() over (order by pwc.policy_id) AS coverage_id,
  pwc.policy_id,
  pwc.party_id,
  (SELECT product_id FROM product_list pl WHERE pl.rn = ((pwc.policy_id - 1) % pl.cnt) + 1) AS product_id,
  500000000 + (pwc.policy_id % 15) * 50000000 AS sum_assured,
  ROUND((500000000 + (pwc.policy_id % 15) * 50000000) * 0.0025, 2) AS premium_amount,
  pwc.effective_date AS created_at,
  LEAST(pwc.effective_date + interval '1 day', timestamp '2025-12-31 23:59:59') AS updated_at
FROM policies_without_coverage pwc;

-- ============================================================
-- CLAIM
-- ============================================================
-- Table: public.claim
-- Columns: claim_id, coverage_id, event_date, request_date, claim_status, requested_amount, approved_amount, description, payment_date, created_at, updated_at
WITH coverage_base AS (
  SELECT coverage_id, sum_assured, created_at
  FROM public.coverage
  WHERE (coverage_id % 20) = 0 OR (coverage_id % 33) = 0
),
claim_seed AS (
  SELECT row_number() over (order by coverage_id) AS claim_id,
         coverage_id,
         LEAST(created_at + interval '120 days' + ((coverage_id % 10) * interval '1 day'), timestamp '2025-12-31 23:59:59') AS request_date,
         LEAST(created_at + interval '110 days', timestamp '2025-12-31 23:59:59') AS event_date,
         sum_assured,
         (coverage_id % 10) AS bucket
  FROM coverage_base
)
INSERT INTO public.claim (claim_id, coverage_id, event_date, request_date, claim_status, requested_amount, approved_amount, description, payment_date, created_at, updated_at)
SELECT claim_id,
       coverage_id,
       event_date,
       request_date,
       CASE
         WHEN bucket IN (0,1) THEN 'Approved'
         WHEN bucket = 2 THEN 'Paid'
         WHEN bucket = 3 THEN 'In Review'
         WHEN bucket = 4 THEN 'Pending Info'
         WHEN bucket = 5 THEN 'Rejected'
         ELSE 'Submitted'
       END AS claim_status,
       CASE WHEN bucket = 4 THEN NULL ELSE ROUND(sum_assured * 0.08, 2) END AS requested_amount,
       CASE WHEN bucket IN (0,1,2) THEN ROUND(sum_assured * 0.06, 2) ELSE NULL END AS approved_amount,
       CASE WHEN bucket = 4 THEN 'Thiếu chứng từ' ELSE NULL END AS description,
       CASE WHEN bucket = 2 THEN LEAST(request_date + interval '20 days', timestamp '2025-12-31 23:59:59') ELSE NULL END AS payment_date,
       request_date AS created_at,
       LEAST(COALESCE(request_date + interval '10 days', request_date), timestamp '2025-12-31 23:59:59') AS updated_at
FROM claim_seed;
-- ============================================================
-- TRANSACTION
-- ============================================================
-- Table: public.transaction
-- Columns: transaction_id, policy_id, transaction_type, amount, transaction_date, is_cost, created_at
WITH policy_premium AS (
  SELECT p.policy_id, p.effective_date, p.status, p.expiration_date,
         SUM(c.premium_amount) AS premium,
         SUM(c.sum_assured) AS sum_assured
  FROM public.policy p
  JOIN public.coverage c ON c.policy_id = p.policy_id
  GROUP BY p.policy_id, p.effective_date, p.status, p.expiration_date
),
payment_schedule AS (
  SELECT pp.*, 
         CASE
           WHEN pp.effective_date < timestamp '2024-07-01' THEN 3
           WHEN pp.effective_date < timestamp '2025-01-01' THEN 2
           ELSE 1
         END AS txn_count
  FROM policy_premium pp
  WHERE pp.status = 'Active'  -- Only generate transactions for Active policies (not Pending/Cancelled/Lapsed/Expired)
),
premium_tx AS (
  SELECT ps.policy_id,
         'Premium Payment'::text AS transaction_type,
         ROUND(ps.premium * (1 + (gs - 1) * 0.02)
               * CASE WHEN EXTRACT(DOW FROM (ps.effective_date + (gs - 1) * interval '3 months')) IN (0,6) THEN 0.9 ELSE 1.0 END
               * CASE WHEN EXTRACT(MONTH FROM (ps.effective_date + (gs - 1) * interval '3 months')) IN (11,12) THEN 1.15 ELSE 1.0 END
               * CASE WHEN EXTRACT(MONTH FROM (ps.effective_date + (gs - 1) * interval '3 months')) = 2 THEN 1.10 ELSE 1.0 END
               * CASE WHEN EXTRACT(YEAR FROM (ps.effective_date + (gs - 1) * interval '3 months')) = 2025
                     AND EXTRACT(MONTH FROM (ps.effective_date + (gs - 1) * interval '3 months')) = 12 THEN 1.20 ELSE 1.0 END
              , 2)::numeric(19,2) AS amount,
         (ps.effective_date + (gs - 1) * interval '3 months' + (ps.policy_id % 5) * interval '1 day') AS transaction_date,
         FALSE AS is_cost
  FROM payment_schedule ps
  CROSS JOIN LATERAL generate_series(1, ps.txn_count) AS gs
),
commission_tx AS (
  SELECT policy_id,
         'Commission'::text AS transaction_type,
         ROUND(amount * 0.10, 2)::numeric(19,2) AS amount,
         transaction_date + interval '1 day' AS transaction_date,
         TRUE AS is_cost
  FROM premium_tx
  WHERE (EXTRACT(DAY FROM transaction_date)::int % 4) = 0
),
claim_tx AS (
  SELECT p.policy_id,
         c.claim_id,  -- Added: link to claim
         'Claim Payout'::text AS transaction_type,
         c.approved_amount::numeric(19,2) AS amount,
         COALESCE(c.payment_date, c.request_date + interval '15 days') AS transaction_date,
         TRUE AS is_cost
  FROM public.claim c
  JOIN public.coverage cov ON cov.coverage_id = c.coverage_id
  JOIN public.policy p ON p.policy_id = cov.policy_id
  WHERE c.claim_status IN ('Approved','Paid') AND c.approved_amount IS NOT NULL
),
maturity_tx AS (
  SELECT pp.policy_id,
         NULL::INTEGER AS claim_id,  -- No claim for maturity
         'Maturity Benefit'::text AS transaction_type,
         ROUND(pp.sum_assured * 0.20, 2)::numeric(19,2) AS amount,
         pp.expiration_date AS transaction_date,
         TRUE AS is_cost
  FROM policy_premium pp
  WHERE pp.status = 'Expired'
    AND pp.expiration_date IS NOT NULL
    AND pp.expiration_date <= timestamp '2025-12-31 23:59:59'
    AND (pp.policy_id % 50) = 0
),
premium_tx_with_claim AS (
  SELECT policy_id, NULL::INTEGER AS claim_id, transaction_type, amount, transaction_date, is_cost FROM premium_tx
),
commission_tx_with_claim AS (
  SELECT policy_id, NULL::INTEGER AS claim_id, transaction_type, amount, transaction_date, is_cost FROM commission_tx
),
all_tx AS (
  SELECT * FROM premium_tx_with_claim
  UNION ALL
  SELECT * FROM commission_tx_with_claim
  UNION ALL
  SELECT * FROM claim_tx
  UNION ALL
  SELECT * FROM maturity_tx
)
INSERT INTO public.transaction (transaction_id, policy_id, claim_id, transaction_type, amount, transaction_date, is_cost, created_at)
SELECT row_number() over (order by transaction_date, policy_id, transaction_type) AS transaction_id,
       policy_id,
       claim_id,
       transaction_type,
       amount,
       transaction_date,
       is_cost,
       transaction_date AS created_at
FROM all_tx
WHERE transaction_date <= timestamp '2025-12-31 23:59:59';
-- ============================================================
-- POST-PROCESS TIMESTAMPS
-- ============================================================
UPDATE public.request
SET updated_at = CASE WHEN status IN ('Approved', 'Completed') THEN event_date ELSE created_at END;  -- Fixed: added Completed

UPDATE public.budget_item
SET updated_at = LEAST(created_at + interval '1 day', timestamp '2025-12-31 23:59:59');

UPDATE public.annual_budget
SET updated_at = make_date(year, 12, 31)::timestamp;

UPDATE public.claim
SET updated_at = LEAST(COALESCE(payment_date, request_date + interval '7 days'), timestamp '2025-12-31 23:59:59');

-- Align pipeline history timestamps with party timeline
WITH ranked AS (
  SELECT ph.history_id,
         ph.party_id,
         row_number() over (partition by ph.party_id order by ph.history_id) AS rn,
         p.created_at
  FROM public.pipeline_history ph
  JOIN public.party p ON p.party_id = ph.party_id
)
UPDATE public.pipeline_history ph
SET changed_at = LEAST(r.created_at + (r.rn * interval '7 days'), timestamp '2025-12-31 23:59:59'),
    notes = COALESCE(ph.notes, 'Auto stage sync')
FROM ranked r
WHERE ph.history_id = r.history_id;

-- ============================================================
-- SEQUENCE ALIGNMENT
-- ============================================================
SELECT setval(pg_get_serial_sequence('public.system_config','config_id'), (SELECT MAX(config_id) FROM public.system_config));
SELECT setval(pg_get_serial_sequence('public.department','department_id'), (SELECT MAX(department_id) FROM public.department));
SELECT setval(pg_get_serial_sequence('public.employee','employee_id'), (SELECT MAX(employee_id) FROM public.employee));
SELECT setval(pg_get_serial_sequence('public.policy_rule','rule_id'), (SELECT MAX(rule_id) FROM public.policy_rule));
SELECT setval(pg_get_serial_sequence('public.annual_budget','annual_budget_id'), (SELECT MAX(annual_budget_id) FROM public.annual_budget));
SELECT setval(pg_get_serial_sequence('public.request','request_id'), (SELECT MAX(request_id) FROM public.request));
SELECT setval(pg_get_serial_sequence('public.budget_item','item_id'), (SELECT MAX(item_id) FROM public.budget_item));
SELECT setval(pg_get_serial_sequence('public.document','document_id'), (SELECT MAX(document_id) FROM public.document));
SELECT setval(pg_get_serial_sequence('public.approval_workflow','step_id'), (SELECT MAX(step_id) FROM public.approval_workflow));
SELECT setval(pg_get_serial_sequence('public.pipeline_stage_config','stage_id'), (SELECT MAX(stage_id) FROM public.pipeline_stage_config));
SELECT setval(pg_get_serial_sequence('public.sales_channel_config','channel_id'), (SELECT MAX(channel_id) FROM public.sales_channel_config));
SELECT setval(pg_get_serial_sequence('public.campaign','campaign_id'), (SELECT MAX(campaign_id) FROM public.campaign));
SELECT setval(pg_get_serial_sequence('public.product_category','category_id'), (SELECT MAX(category_id) FROM public.product_category));
SELECT setval(pg_get_serial_sequence('public.product_type','type_id'), (SELECT MAX(type_id) FROM public.product_type));
SELECT setval(pg_get_serial_sequence('public.sales_target','target_id'), (SELECT MAX(target_id) FROM public.sales_target));
SELECT setval(pg_get_serial_sequence('public.product','product_id'), (SELECT MAX(product_id) FROM public.product));
SELECT setval(pg_get_serial_sequence('public.party','party_id'), (SELECT MAX(party_id) FROM public.party));
SELECT setval(pg_get_serial_sequence('public.policy','policy_id'), (SELECT MAX(policy_id) FROM public.policy));
SELECT setval(pg_get_serial_sequence('public.coverage','coverage_id'), (SELECT MAX(coverage_id) FROM public.coverage));
SELECT setval(pg_get_serial_sequence('public.claim','claim_id'), (SELECT MAX(claim_id) FROM public.claim));
SELECT setval(pg_get_serial_sequence('public.transaction','transaction_id'), (SELECT MAX(transaction_id) FROM public.transaction));
SELECT setval(pg_get_serial_sequence('public.activity','activity_id'), (SELECT MAX(activity_id) FROM public.activity));
-- Handle pipeline_history which may be empty if trigger didn't fire
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.pipeline_history LIMIT 1) THEN
    PERFORM setval(pg_get_serial_sequence('public.pipeline_history','history_id'), (SELECT MAX(history_id) FROM public.pipeline_history));
  END IF;
END $$;

-- ============================================================
-- QUICK VERIFICATION (OPTIONAL)
-- ============================================================
-- SELECT COUNT(*) FROM public.request;
-- SELECT COUNT(*) FROM public.party;
-- SELECT MIN(created_at), MAX(created_at) FROM public.request;
-- SELECT MIN(transaction_date), MAX(transaction_date) FROM public.transaction;
-- SELECT EXTRACT(YEAR FROM event_date) AS y, EXTRACT(MONTH FROM event_date) AS m, COUNT(*) FROM public.request GROUP BY 1,2 ORDER BY 1,2;

COMMIT;
