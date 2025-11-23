-- Data warehouse cho dashboard AI Agent (Supabase PostgreSQL)
-- Kiến trúc Kimball/star tối giản: dim_* (master), fact_* (số liệu). Giải thích ngay trong DDL.

-- =====================
-- DIMENSIONS
-- =====================

-- Ngày chuẩn hóa (khóa số yyyymmdd để join nhanh).
CREATE TABLE dim_date (
    date_key       INTEGER PRIMARY KEY,            -- 20241231
    date_value     DATE NOT NULL,                  -- giá trị DATE
    year           INTEGER NOT NULL,
    quarter        INTEGER NOT NULL,
    month          INTEGER NOT NULL,
    month_name     VARCHAR(15) NOT NULL,
    day_of_month   INTEGER NOT NULL,
    day_of_week    INTEGER NOT NULL,               -- 1=Mon...7=Sun
    day_name       VARCHAR(15) NOT NULL
);
CREATE UNIQUE INDEX ux_dim_date_value ON dim_date(date_value);

-- Phòng ban / đơn vị.
CREATE TABLE dim_department (
    department_key        BIGSERIAL PRIMARY KEY,
    source_department_id  INTEGER,                 -- id gốc hệ thống tác nghiệp
    department_name       VARCHAR(255) NOT NULL
);

-- Nhân sự.
CREATE TABLE dim_employee (
    employee_key        BIGSERIAL PRIMARY KEY,
    source_employee_id  INTEGER,                   -- id gốc agent1
    full_name           VARCHAR(255),
    email               VARCHAR(255),
    role                VARCHAR(100),
    department_key      BIGINT REFERENCES dim_department(department_key),
    is_active           BOOLEAN DEFAULT TRUE
);

-- Khách hàng/đối tượng được bảo hiểm.
CREATE TABLE dim_party (
    party_key        BIGSERIAL PRIMARY KEY,
    source_party_id  INTEGER,                      -- id gốc PAS.Party_ID
    full_name        VARCHAR(255),
    date_of_birth    DATE,
    gender           VARCHAR(20),
    location         VARCHAR(255),
    role             VARCHAR(100)                  -- Owner/Insured/Beneficiary...
);
CREATE UNIQUE INDEX ux_dim_party_source ON dim_party(source_party_id);

-- Sản phẩm bảo hiểm.
CREATE TABLE dim_product (
    product_key        BIGSERIAL PRIMARY KEY,
    source_product_id  INTEGER,                    -- id gốc PAS.Product_id
    product_code       VARCHAR(50),                -- mã nghiệp vụ (UL01...)
    product_name       VARCHAR(255),
    product_type       VARCHAR(50),                -- Main/Rider...
    status             VARCHAR(50),                -- Active/Discontinued
    issue_date         DATE,
    end_date           DATE
);
CREATE UNIQUE INDEX ux_dim_product_code ON dim_product(product_code);
CREATE UNIQUE INDEX ux_dim_product_source ON dim_product(source_product_id);

-- Chiến dịch / mã liên kết (bridge giữa Activity và PAS).
CREATE TABLE dim_campaign (
    campaign_key       BIGSERIAL PRIMARY KEY,
    campaign_code      VARCHAR(100) UNIQUE,        -- mã liên kết (HCM_1225...)
    campaign_name      VARCHAR(255),
    source_request_id  INTEGER,                    -- id activity_request (agent1)
    department_key     BIGINT REFERENCES dim_department(department_key),
    start_date         DATE,
    end_date           DATE
);

-- Stage pipeline chuẩn hóa (tránh typo).
CREATE TABLE dim_stage (
    stage_key   BIGSERIAL PRIMARY KEY,
    stage_name  VARCHAR(100) UNIQUE NOT NULL       -- Leads mới, Đang chốt...
);

-- =====================
-- FACTS
-- =====================

-- Chi tiêu hoạt động/chiến dịch.
CREATE TABLE fact_activity_spend (
    activity_spend_key BIGSERIAL PRIMARY KEY,
    request_id         INTEGER,                           -- id gốc activity_request
    campaign_key       BIGINT REFERENCES dim_campaign(campaign_key),
    department_key     BIGINT REFERENCES dim_department(department_key),
    spend_date_key     INTEGER REFERENCES dim_date(date_key),
    budget_category    VARCHAR(255),                      -- hạng mục chi
    amount             NUMERIC(19,2),
    currency           VARCHAR(10) DEFAULT 'VND',
    is_approved        BOOLEAN DEFAULT TRUE
);

-- Hợp đồng/coverage phát hành (policy x product).
CREATE TABLE fact_policy (
    policy_fact_key   BIGSERIAL PRIMARY KEY,
    policy_id         INTEGER UNIQUE,                     -- PAS.Policy_ID (unique để FK đối chiếu)
    party_key         BIGINT REFERENCES dim_party(party_key),
    product_key       BIGINT REFERENCES dim_product(product_key),
    campaign_key      BIGINT REFERENCES dim_campaign(campaign_key),
    issue_date_key    INTEGER REFERENCES dim_date(date_key),
    status            VARCHAR(50),
    premium_amount    NUMERIC(19,2),                      -- phí (tổng/định kỳ)
    sum_assured       NUMERIC(19,2)                       -- số tiền bảo hiểm
);

-- Giao dịch tài chính (đóng phí / chi trả).
CREATE TABLE fact_transaction (
    transaction_key      BIGSERIAL PRIMARY KEY,
    transaction_id       INTEGER,                         -- PAS.Transaction_ID
    policy_id            INTEGER REFERENCES fact_policy(policy_id), -- đối chiếu về policy_id duy nhất
    product_key          BIGINT REFERENCES dim_product(product_key),
    campaign_key         BIGINT REFERENCES dim_campaign(campaign_key),
    transaction_date_key INTEGER REFERENCES dim_date(date_key),
    transaction_type     VARCHAR(100),                    -- Đóng phí, Chi trả bồi thường...
    amount               NUMERIC(19,2),
    currency             VARCHAR(10) DEFAULT 'VND'
);

-- Hồ sơ bồi thường.
CREATE TABLE fact_claim (
    claim_fact_key    BIGSERIAL PRIMARY KEY,
    claim_id          INTEGER,                            -- PAS.Claim_ID
    coverage_id       INTEGER,
    party_key         BIGINT REFERENCES dim_party(party_key),
    product_key       BIGINT REFERENCES dim_product(product_key),
    campaign_key      BIGINT REFERENCES dim_campaign(campaign_key),
    event_date_key    INTEGER REFERENCES dim_date(date_key),
    request_date_key  INTEGER REFERENCES dim_date(date_key),
    payment_date_key  INTEGER REFERENCES dim_date(date_key),
    claim_status      VARCHAR(50),
    requested_amount  NUMERIC(19,2),
    approved_amount   NUMERIC(19,2)
);

-- Snapshot pipeline (đếm lead/hồ sơ theo stage mỗi ngày).
CREATE TABLE fact_pipeline_snapshot (
    pipeline_snapshot_key BIGSERIAL PRIMARY KEY,
    snapshot_date_key     INTEGER REFERENCES dim_date(date_key),
    stage_key             BIGINT REFERENCES dim_stage(stage_key),
    lead_count            INTEGER,
    campaign_key          BIGINT REFERENCES dim_campaign(campaign_key)
);

-- =====================
-- GHI CHÚ ETL / MAPPING
-- =====================
-- Nạp dim trước: dim_date, dim_stage, dim_department, dim_employee, dim_product, dim_party, dim_campaign.
-- Agent1 (activity/budget): department -> dim_department; employee -> dim_employee;
--   campaign_code từ activity_request -> dim_campaign; budget_item -> fact_activity_spend.
-- Agent2 (PAS): Product -> dim_product; Party -> dim_party; Policy -> fact_policy
--   (map campaign_code, issue_date_key); Transaction -> fact_transaction; Claim -> fact_claim.
-- Pipeline dashboard: fact_pipeline_snapshot join dim_stage/dim_campaign/dim_date.
-- Doanh thu/sản lượng: fact_transaction + fact_policy + dim_product.
-- ROI chiến dịch: fact_activity_spend vs fact_policy/fact_transaction theo campaign_key.
