'use strict';
const { supabase } = require('../config/database');

/**
 * J1 — Auto-block loans 90 days past approval without disbursement.
 * Scheduled: daily 00:30 IST.
 */
async function run() {
  const { data: setting } = await supabase.from('settings').select('value').eq('key', 'ninety_day_window').single();
  const days = setting?.value?.days ?? 90;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data: expired, error } = await supabase
    .from('loan_applications')
    .select('id, application_no')
    .eq('status', 'approved')
    .lt('approved_at', cutoff);

  if (error) { console.error('[J1] Query error:', error.message); return; }

  for (const loan of expired ?? []) {
    await supabase.from('loan_applications').update({ status: 'blocked_90d', blocked_90d_at: new Date().toISOString() }).eq('id', loan.id);
    console.log(`[J1] Blocked loan ${loan.application_no} (90-day window expired)`);
  }

  console.log(`[J1] Complete — ${(expired ?? []).length} file(s) blocked`);
}

module.exports = { run };
