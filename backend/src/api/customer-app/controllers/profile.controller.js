'use strict';
const supabase = require('../../../config/database');
const { ok } = require('../../../shared/utils/response');

async function get(req, res, next) {
  try {
    const role = req.user.profile.role;
    const profileId = req.user.profile.id;
    let linked = null;
    const table = { customer: 'customers', dealer: 'dealers', staff: 'staff' }[role];
    if (table) {
      const { data } = await supabase.from(table).select('*').eq('profile_id', profileId).maybeSingle();
      linked = data;
    }
    return ok(res, { profile: req.user.profile, linked });
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const allowed = ['full_name', 'email', 'phone', 'avatar_url'];
    const updates = {};
    for (const key of allowed) if (req.body[key] !== undefined) updates[key] = req.body[key];
    const { data, error } = await supabase.from('profiles').update(updates).eq('id', req.user.profile.id).select().single();
    if (error) throw error;
    return ok(res, { profile: data });
  } catch (err) { next(err); }
}

module.exports = { get, update };
