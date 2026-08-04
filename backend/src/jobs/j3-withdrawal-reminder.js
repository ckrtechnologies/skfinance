'use strict';
const { supabase } = require('../config/database');

/**
 * J3 — Remind admin of pending withdrawal requests older than 48 hours.
 * Scheduled: daily 09:00 IST.
 */
async function run() {
  const { data: setting } = await supabase.from('settings').select('value').eq('key', 'withdrawal_reminder_hours').single();
  const hours = setting?.value?.hours ?? 48;
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  const { data: pending, error } = await supabase
    .from('withdrawal_requests')
    .select('id, dealer_id, amount_requested, created_at')
    .eq('status', 'requested')
    .lt('created_at', cutoff);

  if (error) { console.error('[J3] Query error:', error.message); return; }

  if ((pending ?? []).length > 0) {
    console.log(`[J3] ${pending.length} withdrawal request(s) pending for more than ${hours}h — admin should review.`);
    // TODO: send in-app notification to admin when admin profileId is available
  } else {
    console.log('[J3] No overdue withdrawal requests.');
  }
}

module.exports = { run };
