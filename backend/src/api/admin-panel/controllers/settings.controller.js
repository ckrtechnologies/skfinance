'use strict';
const supabase = require('../../../config/database');
const auditRepo = require('../../../domains/notifications/auditRepository');
const { ok, fail } = require('../../../shared/utils/response');

async function list(req, res, next) {
  try {
    const { data, error } = await supabase.from('settings').select('*').order('key');
    if (error) throw error;
    return ok(res, { settings: data });
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const { key } = req.params;
    const { value, description } = req.body;
    if (value === undefined) return fail(res, 'VALIDATION_ERROR', 'value is required', 422);

    const { data, error } = await supabase
      .from('settings')
      .update({ value, description, updated_by: req.user.profile.id, updated_at: new Date().toISOString() })
      .eq('key', key)
      .select().single();
    if (error) throw error;

    await auditRepo.insert({
      actor_profile_id: req.user.profile.id,
      action: 'setting_updated',
      entity: 'settings',
      entity_id: key,
      detail: { value },
    });

    return ok(res, { setting: data });
  } catch (err) { next(err); }
}

module.exports = { list, update };
