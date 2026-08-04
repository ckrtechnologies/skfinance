'use strict';
const { supabase } = require('../../config/database');

/**
 * generateAppNo — generates the next application number in format SF-YYYY-NNNNN.
 * Uses a DB count so it's unique per year.
 */
async function generateAppNo() {
  const year = new Date().getFullYear();
  const prefix = `SF-${year}-`;

  const { count } = await supabase
    .from('loan_applications')
    .select('*', { count: 'exact', head: true })
    .like('application_no', `${prefix}%`);

  const seq = String((count || 0) + 1).padStart(5, '0');
  return `${prefix}${seq}`;
}

module.exports = { generateAppNo };
