-- Seed 12 categories and 500 realistic flower products for testing.
insert into categories (name, slug, description)
select name, slug, description from (values
  ('Hoa sinh nhật','hoa-sinh-nhat','Bó hoa tặng sinh nhật'),
  ('Hoa khai trương','hoa-khai-truong','Kệ hoa chúc mừng khai trương'),
  ('Hoa tình yêu','hoa-tinh-yeu','Hoa hồng và hoa tặng người yêu'),
  ('Hoa cưới','hoa-cuoi','Hoa cưới và hoa cầm tay'),
  ('Hoa chia buồn','hoa-chia-buon','Vòng hoa và kệ hoa chia buồn'),
  ('Hoa tốt nghiệp','hoa-tot-nghiep','Hoa chúc mừng tốt nghiệp'),
  ('Hoa cảm ơn','hoa-cam-on','Hoa thay lời cảm ơn'),
  ('Hoa baby','hoa-baby','Các mẫu hoa baby'),
  ('Hoa hướng dương','hoa-huong-duong','Hoa hướng dương rực rỡ'),
  ('Hoa lan','hoa-lan','Lan hồ điệp và lan chậu'),
  ('Giỏ hoa','gio-hoa','Giỏ hoa quà tặng'),
  ('Hộp hoa cao cấp','hop-hoa-cao-cap','Hộp hoa thiết kế cao cấp')
) as seed(name, slug, description)
where not exists (select 1 from categories c where c.slug = seed.slug);

insert into products (category_id, sku, name, slug, description, price, sale_price, image_url, stock, low_stock_threshold)
select
  c.id,
  'FLW-' || lpad(g::text, 5, '0'),
  case (g % 8)
    when 0 then 'Bó hồng pastel thanh lịch ' || g
    when 1 then 'Kệ hoa chúc mừng rực rỡ ' || g
    when 2 then 'Hộp hoa tình yêu premium ' || g
    when 3 then 'Giỏ hoa baby trắng ' || g
    when 4 then 'Bó hướng dương may mắn ' || g
    when 5 then 'Lan hồ điệp sang trọng ' || g
    when 6 then 'Hoa cưới tone kem ' || g
    else 'Bó hoa theo mùa ' || g
  end,
  'san-pham-' || g,
  'Thiết kế thủ công, hoa tươi chọn lọc, phù hợp tặng trong nhiều dịp. Mẫu số ' || g,
  180000 + ((g * 13700) % 1220000),
  case when g % 5 = 0 then 160000 + ((g * 9700) % 900000) else null end,
  '/assets/img/' || ((g - 1) % 22 + 1) || '.jpg',
  10 + ((g * 17) % 90),
  5
from generate_series(1, 500) g
cross join lateral (select id from categories order by id limit 1 offset ((g - 1) % 12)) c
on conflict (sku) do nothing;

insert into coupons (code, description, discount_type, discount_value, min_order_amount, max_discount_amount, usage_limit, expires_at)
values
  ('WELCOME10','Giảm 10% cho khách hàng mới','percent',10,200000,100000,1000,now() + interval '180 days'),
  ('FLOWER50K','Giảm 50.000đ cho đơn từ 500.000đ','fixed',50000,500000,null,500,now() + interval '180 days')
on conflict (code) do nothing;
