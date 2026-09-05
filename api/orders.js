import { handleError, methodNotAllowed, requireSupabase, supabase } from './_supabase.js';

function validatePayload(payload) {
  const errors = [];
  if (!payload?.receiver_name || String(payload.receiver_name).trim().length < 2) errors.push('Tên người nhận không hợp lệ');
  if (!/^0\d{8,10}$/.test(String(payload?.receiver_phone || '').replace(/[\s.-]/g, ''))) errors.push('Số điện thoại không hợp lệ');
  if (!payload?.delivery_address || String(payload.delivery_address).trim().length < 8) errors.push('Địa chỉ giao hàng quá ngắn');
  if (!Array.isArray(payload?.items) || payload.items.length === 0) errors.push('Giỏ hàng đang trống');
  if ((payload?.items || []).length > 50) errors.push('Giỏ hàng vượt quá 50 dòng sản phẩm');
  for (const item of payload?.items || []) {
    if (!Number.isInteger(Number(item.product_id)) || Number(item.product_id) <= 0) errors.push('product_id không hợp lệ');
    if (!Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1 || Number(item.quantity) > 99) errors.push('Số lượng phải từ 1 đến 99');
  }
  return errors;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!requireSupabase(res)) return;
  try {
    if (req.method === 'GET') {
      const rows = await supabase('orders?select=*,order_items(*)&order=created_at.desc&limit=100');
      return res.status(200).json(rows);
    }
    if (req.method === 'POST') {
      const payload = req.body || {};
      const errors = validatePayload(payload);
      if (errors.length) return res.status(400).json({ error: 'Dữ liệu đơn hàng không hợp lệ', fields: errors });
      const idempotencyKey = String(payload.idempotency_key || '').trim() || crypto.randomUUID();
      const result = await supabase('rpc/create_order_atomic', {
        method: 'POST',
        body: JSON.stringify({ ...payload, idempotency_key: idempotencyKey })
      });
      return res.status(result.duplicate ? 200 : 201).json({ ...result, idempotency_key: idempotencyKey });
    }
    return methodNotAllowed(res, ['GET', 'POST', 'OPTIONS']);
  } catch (error) {
    const message = error?.details?.message || error.message || '';
    if (message.includes('INSUFFICIENT_STOCK')) return res.status(409).json({ error: 'Sản phẩm không đủ tồn kho', detail: message });
    if (['EMPTY_ORDER_ITEMS', 'INVALID_RECEIVER_INFORMATION', 'PRODUCT_NOT_FOUND', 'INVALID_QUANTITY'].some((code) => message.includes(code))) {
      return res.status(400).json({ error: 'Không thể tạo đơn hàng', detail: message });
    }
    return handleError(res, error);
  }
}
