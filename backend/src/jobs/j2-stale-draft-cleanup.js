'use strict';
const { supabase } = require('../config/database');

/**
 * J2 — Cancel stale draft applications (untouched for 30+ days).
 * Scheduled: daily 01:00 IST.
 */
async function run() {
  const { data: setting } = await supabase.from('settings').select('value').eq('key', 'stale_draft_window').single();
  const days = setting?.value?.days ?? 30;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data: stale, error } = await supabase
    .from('loan_applications')
    .select('id, application_no')
    .eq('status', 'draft')
    .lt('updated_at', cutoff);

  if (error) { console.error('[J2] Query error:', error.message); return; }

  for (const loan of stale ?? []) {
    await supabase.from('loan_applications').update({ status: 'cancelled', cancelled_at: new Date().toISOString() }).eq('id', loan.id);
    console.log(`[J2] Cancelled stale draft ${loan.application_no}`);
  }

  console.log(`[J2] Complete — ${(stale ?? []).length} draft(s) cancelled`);
}

module.exports = { run };
