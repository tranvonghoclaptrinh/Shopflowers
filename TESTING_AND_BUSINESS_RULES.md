# FlowerVN — nghiệp vụ và kiểm thử

## Quy tắc nghiệp vụ chính

1. Sản phẩm phải có tên, SKU duy nhất, giá không âm và tồn kho không âm.
2. Không được đặt sản phẩm không tồn tại, đã ngừng bán hoặc đã xóa mềm.
3. Số lượng mỗi dòng hàng từ 1 đến 99; số lượng đặt không vượt tồn khả dụng.
4. Tồn khả dụng = tồn kho thực tế - tồn kho đã giữ cho các đơn chưa hoàn tất.
5. Một request đặt hàng phải có `idempotency_key`; gửi lại cùng khóa không tạo đơn trùng.
6. Đơn từ 500.000đ được miễn phí giao hàng; đơn thấp hơn tính 30.000đ.
7. Mã giảm giá phải còn hiệu lực, chưa vượt số lần sử dụng và đạt giá trị đơn tối thiểu.
8. Không được chuyển trạng thái tùy ý: `pending → confirmed → preparing → shipping → delivered`; có thể hủy trước khi giao.
9. Khi hủy đơn, hệ thống phải giải phóng số lượng đã giữ; khi giao thành công, hệ thống trừ tồn kho thực tế.
10. Giá và tên sản phẩm được lưu snapshot trong `order_items` để lịch sử đơn không thay đổi khi sản phẩm cập nhật.

## Các tình huống lỗi cần test

| Mã | Tình huống | Kết quả mong đợi |
|---|---|---|
| TC-01 | Thiếu tên người nhận | 400, không tạo đơn |
| TC-02 | Số điện thoại sai định dạng | 400, thông báo rõ lỗi |
| TC-03 | Giỏ hàng rỗng | 400, không tạo đơn |
| TC-04 | Product ID không tồn tại | 400, rollback toàn bộ |
| TC-05 | Số lượng bằng 0 hoặc âm | 400, rollback toàn bộ |
| TC-06 | Đặt vượt tồn kho | 400, không thay đổi stock |
| TC-07 | Hai request đồng thời cùng sản phẩm | Một request thành công hoặc cả hai được kiểm tra khóa; không âm stock |
| TC-08 | Gửi lại request cùng idempotency key | Trả đơn cũ, không tạo đơn mới |
| TC-09 | Coupon hết hạn | Bỏ qua hoặc báo mã không hợp lệ theo chính sách |
| TC-10 | Coupon vượt usage limit | Không áp dụng giảm giá |
| TC-11 | Tổng tiền bị sửa từ frontend | Server tự tính lại, không tin giá frontend |
| TC-12 | Xóa sản phẩm đã từng bán | Xóa mềm, không làm mất lịch sử |
| TC-13 | Truy cập API admin không có quyền | 401/403 |
| TC-14 | SQL injection trong search | Không thực thi SQL ngoài ý muốn |
| TC-15 | Payload quá lớn | 413 hoặc 400 |
| TC-16 | Supabase timeout | 5xx có mã lỗi, không trả stack trace |

## Checklist trước demo

- Chạy schema rồi seed dữ liệu.
- Kiểm tra tối thiểu 500 sản phẩm.
- Kiểm tra index bằng truy vấn tìm kiếm/lọc.
- Thử đặt hàng hợp lệ và không hợp lệ.
- Thử double-click nút đặt hàng.
- Thử refresh lại trang thành công.
- Thử đặt hai đơn đồng thời gần như cùng lúc.
- Kiểm tra không đưa `SUPABASE_SERVICE_ROLE_KEY` vào frontend.
- Kiểm tra các biến môi trường trên Vercel.
- Kiểm tra log không lộ mật khẩu, token hoặc thông tin nhạy cảm.
