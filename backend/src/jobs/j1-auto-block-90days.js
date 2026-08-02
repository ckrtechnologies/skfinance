'use strict';
/**
 * J1 — Auto-block loans past the 90-day approval window.
 * Runs daily. Idempotent. Failures do NOT crash the process.
 * Disbursement re-verifies at write time (AGENTS.md §6.6).
 */
const supabase = require('../config/database');
const notifService = require('../domains/notifications/service');

module.exports = async function j1AutoBlock90Days() {
  try {
    // Read setting
    const { data: setting } = await supabase.from('settings').select('value').eq('key', 'ninety_day_window').single();
    const days = setting?.value?.days ?? 90;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // Find all approved loans past the window
    const { data: expired, error } = await supabase
      .from('loan_applications')
      .select('id, dealer_id, staff_id')
      .eq('status', 'approved')
      .lt('approved_at', cutoff);

    if (error) { console.error('[J1] DB fetch error:', error.message); return; }
    if (!expired?.length) { console.log('[J1] No expired approvals found'); return; }

    const ids = expired.map(e => e.id);

    const { error: updateErr } = await supabase
      .from('loan_applications')
      .update({ status: 'blocked_90d', blocked_90d_at: new Date().toISOString() })
      .in('id', ids);

    if (updateErr) { console.error('[J1] Update error:', updateErr.message); return; }

    console.log(`[J1] Blocked ${ids.length} loan(s) for 90-day window expiry`);

    // Notify dealers + staff
    for (const loan of expired) {
      const p = [];
      if (loan.dealer_id) p.push(notifService.createForDealer(loan.dealer_id, { title: 'Approval Window Expired', body: 'A loan approval has expired (90-day window). Re-approval required.', link_type: 'loan_application', link_id: loan.id }));
      await Promise.allSettled(p);
    }
  } catch (err) {
    console.error('[J1] Unhandled error:', err.message);
  }
};
