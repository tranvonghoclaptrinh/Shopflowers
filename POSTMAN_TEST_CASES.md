# FlowerVN — Postman test cases

## 1. Environment variables

Tạo Postman Environment với các biến:

```text
baseUrl              https://<your-vercel-domain>
productId            1
productIdLowStock    2
orderId              
orderCode            
requestId            {{$guid}}
uniqueKey            
receiverName         Nguyen Van Test
receiverPhone        0901234567
deliveryAddress      12 Nguyen Hue, Quan 1, TP.HCM
```

Nếu chạy local, đổi `baseUrl` thành URL local tương ứng.

> Không đưa `SUPABASE_SERVICE_ROLE_KEY` vào Postman. Postman chỉ gọi API public; key chỉ nằm ở Vercel server-side.

## 2. Postman collection variables và common test

Có thể đặt đoạn sau trong tab **Tests** của các request GET/POST thành công:

```javascript
pm.test('HTTP status is expected', function () {
  pm.expect([200, 201]).to.include(pm.response.code);
});

pm.test('Response is JSON', function () {
  pm.response.to.be.json;
});
```

## 3. Smoke tests

### TC-001 — Health check sản phẩm

**Request**

```http
GET {{baseUrl}}/api/products?limit=10
```

**Expected**

- HTTP `200`.
- Response là array.
- Có tối đa 10 phần tử.
- Mỗi sản phẩm có `id`, `sku`, `name`, `price`, `stock`.

**Tests**

```javascript
pm.test('Returns 200', () => pm.response.to.have.status(200));
const data = pm.response.json();
pm.test('Response is an array', () => pm.expect(data).to.be.an('array'));
pm.test('Limit is respected', () => pm.expect(data.length).to.be.at.most(10));
if (data.length) {
  pm.environment.set('productId', data[0].id);
  pm.test('Product contract is valid', () => {
    pm.expect(data[0]).to.have.all.keys('id', 'category_id', 'sku', 'name', 'slug', 'description', 'price', 'sale_price', 'image_url', 'images', 'stock', 'reserved_stock', 'low_stock_threshold', 'is_active', 'deleted_at', 'created_at', 'updated_at', 'categories');
  });
}
```

### TC-002 — Kiểm tra dữ liệu lớn

```http
GET {{baseUrl}}/api/products?limit=100
```

**Expected**: HTTP `200`, nhận được tối đa 100 sản phẩm; dùng để xác nhận seed đã chạy.

```javascript
pm.test('Seed data is available', () => {
  const data = pm.response.json();
  pm.expect(data.length).to.be.above(0);
});
```

### TC-003 — Tìm kiếm và lọc giá

```http
GET {{baseUrl}}/api/products?search=hoa&min_price=200000&max_price=800000&limit=50
```

**Expected**: HTTP `200`, không có sản phẩm ngoài khoảng giá.

```javascript
const data = pm.response.json();
data.forEach((p) => {
  pm.expect(Number(p.price)).to.be.at.least(200000);
  pm.expect(Number(p.price)).to.be.at.most(800000);
});
```

## 4. Validation và negative tests

### TC-004 — Giỏ hàng rỗng

```http
POST {{baseUrl}}/api/orders
Content-Type: application/json
```

```json
{
  "receiver_name": "Nguyen Van Test",
  "receiver_phone": "0901234567",
  "delivery_address": "12 Nguyen Hue, Quan 1, TP.HCM",
  "items": []
}
```

**Expected**: HTTP `400`, không tạo đơn.

```javascript
pm.test('Rejects empty cart', () => pm.response.to.have.status(400));
pm.expect(pm.response.json().error).to.contain('không hợp lệ');
```

### TC-005 — Thiếu thông tin người nhận

```json
{
  "receiver_phone": "0901234567",
  "delivery_address": "12 Nguyen Hue, Quan 1, TP.HCM",
  "items": [{ "product_id": {{productId}}, "quantity": 1 }]
}
```

**Expected**: HTTP `400`; không ghi `orders` hoặc `order_items`.

### TC-006 — Số điện thoại không hợp lệ

```json
{
  "receiver_name": "Nguyen Van Test",
  "receiver_phone": "abc",
  "delivery_address": "12 Nguyen Hue, Quan 1, TP.HCM",
  "items": [{ "product_id": {{productId}}, "quantity": 1 }]
}
```

**Expected**: HTTP `400`, error chỉ rõ số điện thoại.

### TC-007 — Số lượng bằng 0, âm và vượt 99

Chạy lần lượt với `quantity` bằng `0`, `-1`, `100`.

**Expected**: HTTP `400`; database không thay đổi.

### TC-008 — Product ID không tồn tại

```json
{
  "receiver_name": "Nguyen Van Test",
  "receiver_phone": "0901234567",
  "delivery_address": "12 Nguyen Hue, Quan 1, TP.HCM",
  "items": [{ "product_id": 999999999, "quantity": 1 }]
}
```

**Expected**: HTTP `400`; không tạo order dở dang.

### TC-009 — Không tin giá từ frontend

Thêm các field giả vào item:

```json
{
  "receiver_name": "Nguyen Van Test",
  "receiver_phone": "0901234567",
  "delivery_address": "12 Nguyen Hue, Quan 1, TP.HCM",
  "items": [{
    "product_id": {{productId}},
    "quantity": 1,
    "price": 1,
    "subtotal": 1
  }]
}
```

**Expected**: Server tính theo giá trong database, không theo `price: 1`.

## 5. Idempotency tests

### TC-010 — Tạo đơn hợp lệ với idempotency key

**Pre-request Script**

```javascript
pm.environment.set('uniqueKey', `postman-${pm.variables.replaceIn('{{$guid}}')}`);
```

**Request**

```http
POST {{baseUrl}}/api/orders
Content-Type: application/json
```

```json
{
  "receiver_name": "{{receiverName}}",
  "receiver_phone": "{{receiverPhone}}",
  "delivery_address": "{{deliveryAddress}}",
  "delivery_date": "2026-10-01",
  "payment_method": "cod",
  "idempotency_key": "{{uniqueKey}}",
  "items": [{ "product_id": {{productId}}, "quantity": 1 }]
}
```

**Expected**: HTTP `201`, `duplicate: false`, có `id` và `total_amount`.

**Tests**

```javascript
pm.test('Order created', () => pm.response.to.have.status(201));
const body = pm.response.json();
pm.expect(body.duplicate).to.eql(false);
pm.expect(body.id).to.exist;
pm.environment.set('orderId', body.id);
```

### TC-011 — Gửi lại y nguyên request

Giữ nguyên `uniqueKey` và body như TC-010.

**Expected**:

- HTTP `200`.
- `duplicate: true`.
- ID đơn giống TC-010.
- Không tăng `reserved_stock` lần thứ hai.
- Không tăng `coupons.used_count` lần thứ hai.

**Tests**

```javascript
pm.test('Duplicate is detected', () => pm.response.to.have.status(200));
const body = pm.response.json();
pm.expect(body.duplicate).to.eql(true);
pm.expect(Number(body.id)).to.eql(Number(pm.environment.get('orderId')));
```

### TC-012 — Cùng key nhưng thay đổi sản phẩm

Giữ `uniqueKey` cũ nhưng đổi quantity từ `1` thành `2`.

**Expected**: Server vẫn trả đơn cũ với `duplicate: true`; không tạo đơn mới. Đây là hành vi đúng của idempotency key.

### TC-013 — Khác key thì phải tạo đơn khác

Đổi `uniqueKey` sang giá trị mới:

```javascript
pm.environment.set('uniqueKey', `postman-new-${pm.variables.replaceIn('{{$guid}}')}`);
```

**Expected**: HTTP `201`, ID khác TC-010.

## 6. Race condition — đặt cùng một sản phẩm

### Chuẩn bị dữ liệu

Cần chọn sản phẩm có tồn khả dụng bằng 1. Có thể tạo sản phẩm test bằng admin API hoặc cập nhật trực tiếp trong Supabase SQL Editor:

```sql
update products
set stock = 1, reserved_stock = 0, is_active = true, deleted_at = null
where id = 2;
```

Đặt `productIdLowStock=2` trong Postman Environment.

### TC-014 — Hai request đồng thời, tồn kho bằng 1

Tạo hai request giống nhau nhưng **idempotency key khác nhau**:

Request A:

```json
{
  "receiver_name": "Race Test A",
  "receiver_phone": "0901234501",
  "delivery_address": "12 Nguyen Hue, Quan 1, TP.HCM",
  "payment_method": "cod",
  "idempotency_key": "race-A-{{$guid}}",
  "items": [{ "product_id": {{productIdLowStock}}, "quantity": 1 }]
}
```

Request B:

```json
{
  "receiver_name": "Race Test B",
  "receiver_phone": "0901234502",
  "delivery_address": "12 Nguyen Hue, Quan 1, TP.HCM",
  "payment_method": "cod",
  "idempotency_key": "race-B-{{$guid}}",
  "items": [{ "product_id": {{productIdLowStock}}, "quantity": 1 }]
}
```

**Cách chạy song song**

Postman GUI không bảo đảm chạy đồng thời thật. Dùng một trong hai cách:

1. Mở hai tab request và bấm Send gần như cùng lúc.
2. Dùng Newman với hai process:

```bash
newman run FlowerVN.postman_collection.json -e FlowerVN.postman_environment.json --folder "Race A" &
newman run FlowerVN.postman_collection.json -e FlowerVN.postman_environment.json --folder "Race B" &
wait
```

**Expected**:

- Một request HTTP `201`.
- Một request HTTP `400` hoặc `409` với `INSUFFICIENT_STOCK`.
- Không có request nào trả thành công nếu stock đã hết.
- Tổng số lượng được giữ không vượt 1.
- `reserved_stock` không âm và không vượt `stock`.

### TC-015 — Hai request khác sản phẩm trong cùng đơn

Gửi một đơn có hai sản phẩm khác nhau:

```json
{
  "receiver_name": "Multi Item Test",
  "receiver_phone": "0901234567",
  "delivery_address": "12 Nguyen Hue, Quan 1, TP.HCM",
  "items": [
    { "product_id": {{productId}}, "quantity": 1 },
    { "product_id": {{productIdLowStock}}, "quantity": 1 }
  ],
  "idempotency_key": "multi-{{$guid}}"
}
```

**Expected**: Tất cả item được ghi cùng order; nếu một sản phẩm không đủ hàng thì toàn bộ transaction rollback, không tạo order một phần.

## 7. Coupon và tổng tiền

### TC-016 — Coupon hợp lệ

Dùng `WELCOME10` cho đơn đạt tối thiểu 200.000đ.

**Expected**:

- `discount_amount > 0`.
- `total_amount = subtotal + delivery_fee - discount_amount`.
- Không âm tổng tiền.

### TC-017 — Coupon không tồn tại

```json
"coupon_code": "NOT-EXIST"
```

**Expected**: Không giảm giá; API không được crash. Chính sách có thể chọn trả cảnh báo hoặc bỏ qua coupon.

### TC-018 — Double-submit coupon

Gửi hai request đồng thời với cùng coupon và cùng `idempotency_key`.

**Expected**: Chỉ một order được tạo và `used_count` chỉ tăng một lần.

## 8. Test hậu kiểm database

Chạy trong Supabase SQL Editor sau bộ test:

```sql
select id, order_code, status, subtotal, delivery_fee, discount_amount, total_amount
from orders
order by created_at desc
limit 20;

select product_id, count(*) as item_count, sum(quantity) as quantity
from order_items
where created_at >= now() - interval '1 hour'
group by product_id;

select id, name, stock, reserved_stock,
       stock - reserved_stock as available_stock
from products
where id in (1, 2);

select code, used_count, usage_limit
from coupons
where code in ('WELCOME10', 'FLOWER50K');
```

**Invariants phải đúng**:

```sql
select count(*) from products where reserved_stock < 0;
select count(*) from products where reserved_stock > stock;
select count(*) from orders where total_amount < 0;
```

Ba truy vấn trên đều phải trả `0`.

## 9. Tiêu chí đạt

- Tất cả TC-001 đến TC-013 pass.
- TC-014 có đúng một request thành công khi tồn khả dụng là 1.
- Không có stock âm.
- TC-015 rollback toàn bộ khi một item lỗi.
- TC-018 không dùng vượt coupon do retry.
- Không lộ service role key ở response hoặc frontend.
- API trả lỗi có cấu trúc JSON, không trả stack trace.
