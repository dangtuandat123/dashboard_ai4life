# Hướng Dẫn Database Schema & Business Logic cho AI Agent (BeeBox Intelligence)

> **MỤC ĐÍCH TÀI LIỆU:** Cung cấp kiến thức sâu về cấu trúc dữ liệu, logic nghiệp vụ và các quy tắc bất biến của hệ thống BeeBox Intelligence. Agent **PHẢI** tham chiếu tài liệu này trước khi viết bất kỳ câu lệnh SQL hoặc logic xử lý dữ liệu nào.

---

## 1. Nguyên Tắc Cốt Lõi (Core Principles)

### 💰 1.1. Tiền Tệ (Currency Handling)
*   **Quy tắc BẤT DI BẤT DỊCH:** Tất cả giá trị tiền tệ trong database (`revenue`, `amount`, `premium`, `target`) đều được lưu dưới dạng **Raw VNĐ** (số nguyên lớn, ví dụ: `150000000` thay vì `150`).
*   **KHÔNG BAO GIỜ** chia cho 1,000,000 hay 1,000,000,000 trong câu lệnh SQL `SELECT`. Việc format (thêm "triệu", "tỷ") là trách nhiệm của **Frontend**.
*   **Kiểu dữ liệu:** `NUMERIC` hoặc `NUMERIC(15,3)`.

### ⏳ 1.2. Thời Gian & Demo Data (Time Travel Logic)
*   **Vấn đề:** Dữ liệu demo có thể bị cũ theo thời gian thực.
*   **Giải pháp:** Hệ thống sử dụng cơ chế **`anchor_date`** trong các Views.
    *   `anchor_date` = `MAX(transaction_date)` hoặc `MAX(effective_date)`.
    *   "Tháng hiện tại" được định nghĩa là tháng chứa `anchor_date`.
    *   **Agent phải dùng logic này** khi viết query mới: `WHERE date >= DATE_TRUNC('month', anchor_date)`.
*   **Tuyệt đối tránh:** `WHERE date >= NOW()` (vì dữ liệu demo có thể ở quá khứ hoặc tương lai).

### 🎯 1.3. KPI Targets (Dynamic Logic)
*   **Không Hardcode:** Target không phải là số tĩnh.
*   **Công thức:** Trong các View, Target được tính động để luôn tạo ra biểu đồ "có ý nghĩa" (có cái đạt, cái không đạt):
    ```sql
    Target = Revenue * (0.75 + (hashtext(category_name) % 100) / 100.0 * 0.6)
    ```
    *   Logic này đảm bảo Target luôn dao động từ **75% đến 135%** của Revenue thực tế.

---

## 2. Chi Tiết Schema & Quan Hệ (Deep Dive)

### A. Agent 1: PAS (Policy Administration System) - Core Data
Đây là nguồn dữ liệu chính cho Dashboard doanh thu.

| Bảng | Cột Quan Trọng | Kiểu | Ràng buộc / Ghi chú |
|------|----------------|------|---------------------|
| **`product`** | `product_id` (PK)<br>`product_name`<br>`product_category` | `SERIAL`<br>`VARCHAR`<br>`VARCHAR` | Phân loại sản phẩm (VD: 'Bảo hiểm sức khỏe', 'Bảo hiểm xe'). |
| **`party`** | `party_id` (PK)<br>`name`<br>`role`<br>`pipeline_stage`<br>`sales_channel` | `SERIAL`<br>`VARCHAR`<br>`VARCHAR`<br>`VARCHAR`<br>`VARCHAR` | `role`: 'Customer', 'Lead'.<br>`pipeline_stage`: 'Leads mới', 'Đang tư vấn', 'Đang chốt', 'Thẩm định', 'Phát hành'.<br>`sales_channel`: 'Hội thảo', 'Tư vấn 1-1', 'Telesale'. |
| **`policy`** | `policy_id` (PK)<br>`policy_number`<br>`party_id` (FK)<br>`effective_date`<br>`status` | `SERIAL`<br>`VARCHAR`<br>`INT`<br>`TIMESTAMP`<br>`VARCHAR` | **Bảng trung tâm.**<br>`status`: 'Active', 'Cancelled'.<br>Liên kết Party với Coverage/Transaction. |
| **`coverage`** | `coverage_id` (PK)<br>`policy_id` (FK)<br>`product_id` (FK)<br>`premium_amount` | `SERIAL`<br>`INT`<br>`INT`<br>`NUMERIC` | Chứa thông tin phí bảo hiểm chi tiết cho từng sản phẩm trong HĐ. |
| **`transaction`**| `transaction_id` (PK)<br>`policy_id` (FK)<br>`amount`<br>`is_cost`<br>`transaction_date` | `SERIAL`<br>`INT`<br>`NUMERIC`<br>`BOOL`<br>`TIMESTAMP` | **Quan trọng nhất cho Dashboard Tài Chính.**<br>`is_cost = FALSE`: Doanh thu (Thu phí).<br>`is_cost = TRUE`: Chi phí (Bồi thường, Hoa hồng). |

**Mối quan hệ (Joins):**
`Product` ◄── `Coverage` ──► `Policy` ──► `Party`
                  ▲
                  └── `Claim`
`Policy` ──► `Transaction`

### B. Agent 2: Budget Validation - Internal Ops
Dữ liệu về quy trình nội bộ và ngân sách.

| Bảng | Cột Quan Trọng | Ghi chú |
|------|----------------|---------|
| **`department`** | `department_id`, `department_name` | Phòng ban (Sales, IT, HR). |
| **`employee`** | `employee_id`, `full_name`, `revenue` | Nhân viên. `revenue` là tổng doanh thu cá nhân tích lũy. |
| **`request`** | `request_id`, `status`, `total_estimated_amount` | Yêu cầu ngân sách. `status`: 'Draft', 'Pending', 'Approved'. |
| **`budget_item`**| `item_id`, `requested_amount` | Chi tiết từng khoản mục trong Request. |

---

## 3. Giải Thích Views (Business Logic Layer)

Dashboard **CHỈ** nên query từ các View này, không nên query trực tiếp bảng gốc trừ khi cần custom report.

### 📊 `v_financial_data` (Biểu đồ Tài chính)
*   **Logic:** Lấy dữ liệu 3 tháng gần nhất dựa trên `anchor_date`.
*   **Cột `month`:** Format 'T10', 'T11' (Tháng).
*   **Cột `revenue`:** Tổng `amount` từ `transaction` có `is_cost = FALSE`.
*   **Cột `cost`:** Tổng `amount` từ `transaction` có `is_cost = TRUE`.

### 🏆 `v_top_performers_heatmap` (Heatmap Nhân viên)
*   **Logic:** Top 20 nhân viên có doanh thu > 0.
*   **Mapping:**
    *   `nhanVon` = `leads_count` (Số lượng Leads được giao).
    *   `hoatDong` = `activities_count` (Số cuộc gọi/meeting).
    *   `doanhThu` = `revenue` (Doanh thu thực tế).

### 📦 `v_product_lines` & `v_product_types` (Phân tích Sản phẩm)
*   **Hierarchy:** `product_category` (Dòng) -> `product_type` (Loại).
*   **Logic Target:** Sử dụng hàm `hashtext(name)` để tạo ra một hệ số target ngẫu nhiên nhưng **cố định** cho mỗi tên sản phẩm. Điều này giúp demo data ổn định (không bị nhảy số mỗi lần refresh) nhưng vẫn trông tự nhiên.

### 🔄 `v_sales_quantity` (Số lượng bán)
*   **Logic Tên:** View này thực hiện `REPLACE` chuỗi để rút gọn tên sản phẩm (VD: "Bảo hiểm sức khỏe toàn diện" -> "Sức khỏe").
*   **Logic:** Đếm số lượng `coverage_id` (số quyền lợi bán ra).

---

## 4. Các Lỗi Thường Gặp (Common Pitfalls) ⚠️

1.  **Lỗi Join thiếu:**
    *   *Sai:* Query `coverage` để tính doanh thu theo tháng nhưng quên join `policy` để lấy `effective_date`.
    *   *Đúng:* `FROM coverage c JOIN policy p ON c.policy_id = p.policy_id`.

2.  **Lỗi tính tổng sai:**
    *   *Sai:* `COUNT(policy_id)` để tính số sản phẩm bán ra.
    *   *Đúng:* Một Policy có thể có nhiều Coverage (sản phẩm con). Phải `COUNT(coverage_id)` nếu muốn tính số lượng sản phẩm, hoặc `COUNT(DISTINCT policy_id)` nếu tính số hợp đồng.

3.  **Lỗi NULL:**
    *   Các phép tính toán học với NULL sẽ trả về NULL.
    *   *Luôn dùng:* `COALESCE(sum(amount), 0)` để an toàn.

4.  **Lỗi Encoding:**
    *   Dữ liệu chứa tiếng Việt có dấu. Khi so sánh chuỗi (VD: `WHERE status = 'Đã duyệt'`), phải đảm bảo string literal chính xác tuyệt đối.

---

## 5. Mẫu Query An Toàn (Safe Query Patterns)

**Q: Lấy tổng doanh thu tháng hiện tại (theo anchor date)?**
```sql
WITH anchor AS (SELECT MAX(transaction_date) as dt FROM transaction)
SELECT COALESCE(SUM(amount), 0)
FROM transaction t, anchor a
WHERE t.is_cost = FALSE
  AND DATE_TRUNC('month', t.transaction_date) = DATE_TRUNC('month', a.dt);
```

**Q: Lấy Top 5 sản phẩm bán chạy nhất?**
```sql
SELECT p.product_name, COUNT(c.coverage_id) as sold_count
FROM coverage c
JOIN product p ON c.product_id = p.product_id
GROUP BY p.product_name
ORDER BY sold_count DESC
LIMIT 5;
```

---
*Tài liệu này là nguồn sự thật duy nhất (Single Source of Truth) cho cấu trúc dữ liệu của BeeBox Intelligence.*
