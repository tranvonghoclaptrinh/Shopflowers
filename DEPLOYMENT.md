# FlowerVN — triển khai Vercel + Supabase

## Kiến trúc

- Frontend: HTML/CSS/JavaScript hiện có trong repository.
- API: Vercel Serverless Functions tại thư mục `api/`.
- Database: Supabase PostgreSQL.
- Source control: GitHub.

## Thiết lập Supabase

1. Tạo một project PostgreSQL trên Supabase.
2. Mở SQL Editor và chạy toàn bộ `database/schema.sql`.
3. Chạy tiếp `database/seed.sql` để tạo 12 danh mục và 500 sản phẩm mẫu.
4. Lấy Project URL và Service Role Key trong Project Settings → API.

## Biến môi trường Vercel

Khai báo hai biến ở **Project Settings → Environment Variables**:

```text
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

`SUPABASE_SERVICE_ROLE_KEY` chỉ được dùng ở API server-side; tuyệt đối không đưa vào HTML, JavaScript frontend hoặc GitHub.

## API chính

```text
GET    /api/products
POST   /api/products
PUT    /api/products?id=<id>
DELETE /api/products?id=<id>
GET    /api/categories
POST   /api/categories
GET    /api/orders
POST   /api/orders
```

### Tạo đơn hàng

`POST /api/orders` nhận payload:

```json
{
  "receiver_name": "Nguyễn Văn A",
  "receiver_phone": "0901234567",
  "delivery_address": "12 Nguyễn Huệ, Quận 1, TP.HCM",
  "delivery_date": "2026-10-01",
  "payment_method": "cod",
  "coupon_code": "WELCOME10",
  "idempotency_key": "checkout-unique-key-001",
  "items": [
    { "product_id": 1, "quantity": 2 }
  ]
}
```

Server tự tính giá, phí giao hàng, giảm giá và tồn kho. Không tin giá gửi từ frontend.

## Kiểm tra trước deploy

```bash
for f in api/*.js; do node --check "$f" || exit 1; done
```

Sau khi push lên branch `main`, import repository vào Vercel. Mỗi commit mới sẽ tạo một deployment mới.

## Lưu ý quan trọng

- SQL function `create_order_atomic` khóa dòng sản phẩm trong transaction để tránh hai khách cùng đặt vượt tồn.
- `idempotency_key` chống tạo đơn trùng do double-click hoặc retry mạng.
- Không xóa cứng sản phẩm đã bán; dùng `deleted_at`/`is_active` để giữ lịch sử.
- Cần bổ sung authentication/authorization cho các endpoint quản trị trước khi public rộng rãi.
