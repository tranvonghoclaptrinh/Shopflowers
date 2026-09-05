import { handleError, methodNotAllowed, requireSupabase, supabase } from './_supabase.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!requireSupabase(res)) return;

  try {
    if (req.method === 'GET') {
      const params = new URLSearchParams({ select: '*,categories(id,name)', order: 'created_at.desc' });
      const { search, category_id, min_price, max_price, limit = '50' } = req.query;
      if (search) params.set('name', `ilike.*${search}*`);
      if (category_id) params.set('category_id', `eq.${category_id}`);
      if (min_price) params.set('price', `gte.${min_price}`);
      if (max_price) params.append('price', `lte.${max_price}`);
      params.set('limit', String(Math.min(Number(limit) || 50, 100)));
      return res.status(200).json(await supabase(`products?${params.toString()}`));
    }

    if (req.method === 'POST') {
      const { name, description, price, sale_price, image_url, category_id, stock = 0 } = req.body || {};
      if (!name || price === undefined) return res.status(400).json({ error: 'name và price là bắt buộc' });
      const rows = await supabase('products', { method: 'POST', body: JSON.stringify({ name, description, price, sale_price, image_url, category_id, stock, is_active: true }) });
      return res.status(201).json(rows[0]);
    }

    if (req.method === 'PUT') {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: 'Thiếu query id' });
      const rows = await supabase(`products?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(req.body || {}) });
      return res.status(200).json(rows[0] || null);
    }

    if (req.method === 'DELETE') {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: 'Thiếu query id' });
      await supabase(`products?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
      return res.status(204).end();
    }
    return methodNotAllowed(res, ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']);
  } catch (error) {
    return handleError(res, error);
  }
}
