'use strict';
/**
 * response.js — Standard response helpers.
 * All controllers use these; never call res.json directly.
 *
 * Success:  { success: true, data: T }
 * Failure:  { success: false, error: { code: string, message: string } }
 */

/** Send a 200 OK with data payload */
function ok(res, data, status = 200) {
  return res.status(status).json({ success: true, data });
}

/** Send an error response */
function fail(res, code, message, status = 400) {
  return res.status(status).json({ success: false, error: { code, message } });
}

module.exports = { ok, fail };
