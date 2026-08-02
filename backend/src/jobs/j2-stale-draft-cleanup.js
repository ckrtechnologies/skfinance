'use strict';
/**
 * J2 — Mark stale draft applications as abandoned.
 * Runs daily. Idempotent.
 */
const supabase = require('../config/database');

module.exports = async function j2StaleDraftCleanup() {
  try {
    const { data: setting } = await supabase.from('settings').select('value').eq('key', 'stale_draft_window').single();
    const days = setting?.value?.days ?? 30;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data: stale, error } = await supabase
      .from('loan_applications')
      .select('id')
      .eq('status', 'draft')
      .lt('updated_at', cutoff);

    if (error) { console.error('[J2] DB fetch error:', error.message); return; }
    if (!stale?.length) { console.log('[J2] No stale drafts found'); return; }

    const { error: updateErr } = await supabase
      .from('loan_applications')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .in('id', stale.map(s => s.id));

    if (updateErr) { console.error('[J2] Update error:', updateErr.message); return; }
    console.log(`[J2] Marked ${stale.length} stale draft(s) as cancelled`);
  } catch (err) {
    console.error('[J2] Unhandled error:', err.message);
  }
};
