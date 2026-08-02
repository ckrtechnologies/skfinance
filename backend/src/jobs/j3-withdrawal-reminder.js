'use strict';
/**
 * J3 — Send withdrawal reminders for pending withdrawal requests.
 * Runs daily.
 */
const supabase = require('../config/database');
const notifService = require('../domains/notifications/service');

module.exports = async function j3WithdrawalReminder() {
  try {
    const { data: setting } = await supabase.from('settings').select('value').eq('key', 'withdrawal_reminder_hours').single();
    const hours = setting?.value?.hours ?? 48;
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const { data: pending, error } = await supabase
      .from('withdrawal_requests')
      .select('id, dealer_id, amount_requested')
      .eq('status', 'requested')
      .lt('created_at', cutoff);

    if (error) { console.error('[J3] DB fetch error:', error.message); return; }
    if (!pending?.length) { console.log('[J3] No pending withdrawal reminders'); return; }

    for (const req of pending) {
      await notifService.createForDealer(req.dealer_id, {
        title: 'Withdrawal Request Pending',
        body: `Your withdrawal request for ₹${req.amount_requested} is still pending. Please contact support if this is urgent.`,
        link_type: 'withdrawal_request',
        link_id: req.id,
      }).catch(e => console.error('[J3] Notify error:', e.message));
    }

    console.log(`[J3] Sent ${pending.length} withdrawal reminder(s)`);
  } catch (err) {
    console.error('[J3] Unhandled error:', err.message);
  }
};
