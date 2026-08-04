'use strict';
const cron = require('node-cron');
const j1   = require('./j1-auto-block-90days');
const j2   = require('./j2-stale-draft-cleanup');
const j3   = require('./j3-withdrawal-reminder');

// J1 — 00:30 IST daily (UTC 19:00 previous day)
cron.schedule('0 19 * * *', () => {
  console.log('[scheduler] Running J1 (auto-block 90 days)');
  j1.run().catch(err => console.error('[J1] Error:', err.message));
});

// J2 — 01:00 IST daily (UTC 19:30 previous day)
cron.schedule('30 19 * * *', () => {
  console.log('[scheduler] Running J2 (stale draft cleanup)');
  j2.run().catch(err => console.error('[J2] Error:', err.message));
});

// J3 — 09:00 IST daily (UTC 03:30)
cron.schedule('30 3 * * *', () => {
  console.log('[scheduler] Running J3 (withdrawal reminder)');
  j3.run().catch(err => console.error('[J3] Error:', err.message));
});

console.log('[scheduler] Cron jobs registered: J1, J2, J3');
