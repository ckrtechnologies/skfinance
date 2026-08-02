'use strict';
const supabase = require('../../config/database');

/** Insert audit_log row (append-only, called by service layer) */
async function insert(row) {
  const { error } = await supabase.from('audit_log').insert(row);
  if (error) console.error('[audit_log] insert failed:', error.message);
}

/** Query audit log (admin only) */
async function findMany({ filters = {}, page = 1, limit = 50 } = {}) {
  let q = supabase.from('audit_log').select('*', { count: 'exact' });
  if (filters.entity) q = q.eq('entity', filters.entity);
  if (filters.entity_id) q = q.eq('entity_id', filters.entity_id);
  if (filters.actor_profile_id) q = q.eq('actor_profile_id', filters.actor_profile_id);
  if (filters.action) q = q.eq('action', filters.action);
  const from = (page - 1) * limit;
  q = q.order('created_at', { ascending: false }).range(from, from + limit - 1);
  const { data, count, error } = await q;
  if (error) throw error;
  return { items: data, total: count, page, limit };
}

module.exports = { insert, findMany };
