'use strict';
const supabase = require('../../config/database');
const secrets = require('../../config/secrets');

/**
 * generateApplicationNo — creates the next SF-YYYY-NNNNN application number.
 * Queries the DB for the highest existing number this year to ensure uniqueness.
 * @returns {Promise<string>} e.g. "SF-2026-00042"
 */
async function generateApplicationNo() {
  const year = new Date().getFullYear();
  const prefix = `${secrets.app.appNoPrefix}-${year}-`;

  const { data, error } = await supabase
    .from('loan_applications')
    .select('application_no')
    .like('application_no', `${prefix}%`)
    .order('application_no', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  let nextNum = 1;
  if (data?.application_no) {
    const parts = data.application_no.split('-');
    nextNum = parseInt(parts[parts.length - 1], 10) + 1;
  }

  return `${prefix}${String(nextNum).padStart(5, '0')}`;
}

module.exports = { generateApplicationNo };
