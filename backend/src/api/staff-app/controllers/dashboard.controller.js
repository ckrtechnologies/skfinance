'use strict';
const supabase = require('../../../config/database');
const { ok } = require('../../../shared/utils/response');

async function dashboard(req, res, next) {
  try {
    const { data: staff } = await supabase.from('staff').select('id').eq('profile_id', req.user.profile.id).single();
    const staffId = staff?.id;

    const [byStage, recent] = await Promise.all([
      supabase.from('loan_applications').select('current_stage, count:id', { count: 'exact' }).eq('staff_id', staffId).in('status', ['in_progress', 'approved']),
      supabase.from('loan_applications').select('id, application_no, status, current_stage, created_at').eq('staff_id', staffId).order('created_at', { ascending: false }).limit(5),
    ]);

    return ok(res, { files_by_stage: byStage.data ?? [], recent_files: recent.data ?? [] });
  } catch (err) { next(err); }
}

module.exports = { dashboard };
