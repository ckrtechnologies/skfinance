'use strict';
const cron = require('node-cron');
const j1 = require('./j1-auto-block-90days');
const j2 = require('./j2-stale-draft-cleanup');
const j3 = require('./j3-withdrawal-reminder');
const j4 = require('./j4-policy-effective-sweep');

/**
 * startScheduler — registers all J1–J4 cron jobs.
 * Called from server.js after the server starts.
 * All jobs are idempotent and catch their own errors — a job failure never crashes the process.
 */
function startScheduler() {
  // J1 — 90-day window check. Runs daily at 01:00 AM.
  cron.schedule('0 1 * * *', () => { console.log('[scheduler] Running J1'); j1(); });

  // J2 — Stale draft cleanup. Runs daily at 02:00 AM.
  cron.schedule('0 2 * * *', () => { console.log('[scheduler] Running J2'); j2(); });

  // J3 — Withdrawal reminders. Runs daily at 10:00 AM.
  cron.schedule('0 10 * * *', () => { console.log('[scheduler] Running J3'); j3(); });

  // J4 — Policy effective sweep. Runs daily at 00:05 AM.
  cron.schedule('5 0 * * *', () => { console.log('[scheduler] Running J4'); j4(); });

  console.log('[scheduler] J1–J4 registered');
}

module.exports = { startScheduler };
