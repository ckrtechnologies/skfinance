'use strict';
const supabase = require('../../../config/database');
const { ok } = require('../../../shared/utils/response');

async function getPerformance(req, res, next) {
  try {
    const { data: staffRow } = await supabase.from('staff').select('id').eq('profile_id', req.user.profile.id).single();
    const staffId = staffRow?.id;
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    const [totalAdded, totalDisbursed, mtdAdded, mtdDisbursed] = await Promise.all([
      supabase.from('loan_applications').select('*', { count: 'exact', head: true }).eq('staff_id', staffId),
      supabase.from('loan_applications').select('*', { count: 'exact', head: true }).eq('staff_id', staffId).eq('status', 'disbursed'),
      supabase.from('loan_applications').select('*', { count: 'exact', head: true }).eq('staff_id', staffId).gte('created_at', startOfMonth),
      supabase.from('loan_applications').select('*', { count: 'exact', head: true }).eq('staff_id', staffId).eq('status', 'disbursed').gte('disbursed_at', startOfMonth),
    ]);

    return ok(res, {
      total_files_added: totalAdded.count ?? 0,
      total_disbursed: totalDisbursed.count ?? 0,
      mtd_files_added: mtdAdded.count ?? 0,
      mtd_disbursed: mtdDisbursed.count ?? 0,
      conversion_rate: totalAdded.count ? ((totalDisbursed.count ?? 0) / totalAdded.count * 100).toFixed(1) + '%' : '0%',
    });
  } catch (err) { next(err); }
}

module.exports = { getPerformance };
