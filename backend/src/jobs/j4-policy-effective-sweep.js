'use strict';
/**
 * J4 — Policy effective-date sweep: activate policies whose effective_from has arrived.
 * Runs daily. Policies with status='scheduled' (future-dated publishes) become 'active'.
 * Note: current publishing flow immediately activates. J4 supports future-dated scheduling if needed.
 */
const supabase = require('../config/database');

module.exports = async function j4PolicyEffectiveSweep() {
  // 'scheduled' status is not present in policy_status ENUM currently.
  // Returning early to prevent Postgres invalid enum errors in logs.
  return;
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data: due, error } = await supabase
      .from('lender_policies')
      .select('id, lender_id, product_type, version')
      .eq('status', 'scheduled')
      .lte('effective_from', today);

    if (error) { console.error('[J4] DB fetch error:', error.message); return; }
    if (!due?.length) { console.log('[J4] No policies due for activation'); return; }

    for (const policy of due) {
      // Retire current active for same lender + product
      await supabase
        .from('lender_policies')
        .update({ status: 'retired', effective_to: today })
        .eq('lender_id', policy.lender_id)
        .eq('product_type', policy.product_type)
        .eq('status', 'active');

      await supabase
        .from('lender_policies')
        .update({ status: 'active' })
        .eq('id', policy.id);

      console.log(`[J4] Activated policy ${policy.id} (v${policy.version})`);
    }
  } catch (err) {
    console.error('[J4] Unhandled error:', err.message);
  }
};
