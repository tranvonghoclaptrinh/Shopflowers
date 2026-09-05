import { handleError, methodNotAllowed, requireSupabase, supabase } from './_supabase.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!requireSupabase(res)) return;
  try {
    if (req.method === 'GET') return res.status(200).json(await supabase('categories?select=*&order=name.asc'));
    if (req.method === 'POST') {
      if (!req.body?.name) return res.status(400).json({ error: 'name là bắt buộc' });
      const rows = await supabase('categories', { method: 'POST', body: JSON.stringify({ name: req.body.name, description: req.body.description || null }) });
      return res.status(201).json(rows[0]);
    }
    return methodNotAllowed(res, ['GET', 'POST', 'OPTIONS']);
  } catch (error) { return handleError(res, error); }
}
