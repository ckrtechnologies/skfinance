'use strict';

/**
 * normalizePhone - Normalizes an Indian phone number to a 10-digit format.
 * Strips spaces, dashes, and leading '+91', '91', or '0'.
 *
 * @param {string} input - The raw phone number input.
 * @returns {string} - The 10-digit phone number.
 */
function normalizePhone(input) {
  if (!input) {
    throw Object.assign(new Error('Phone number is required'), { statusCode: 400 });
  }

  // Convert to string and remove all non-digit characters except '+'
  let cleaned = String(input).replace(/[^\d+]/g, '');

  // Strip leading '+91', '91', or '0'
  if (cleaned.startsWith('+91')) {
    cleaned = cleaned.substring(3);
  } else if (cleaned.startsWith('91') && cleaned.length > 10) {
    // Only strip 91 if length > 10, to avoid stripping valid 10 digit numbers starting with 91
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  // Validate the resulting 10-digit number
  if (!/^[6-9]\d{9}$/.test(cleaned)) {
    throw Object.assign(new Error('Invalid Indian phone number'), { statusCode: 400, code: 'INVALID_PHONE' });
  }

  return cleaned;
}

module.exports = { normalizePhone };
