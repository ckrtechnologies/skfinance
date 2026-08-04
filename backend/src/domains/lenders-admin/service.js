'use strict';
const { supabase } = require('../../config/database');

/**
 * lenders-admin — the ONLY DB-backed lender logic.
 * Handles exactly two fields: is_active and priority.
 * Never touches anything resembling rule content.
 */

async function listLenders() {
  const { data, error } = await supabase
    .from('lenders')
    .select('id, name, code, lender_type, logo_url, priority, is_active, contact_name, contact_email, contact_phone, notes')
    .order('priority', { ascending: true });

  if (error) throw error;
  return data;
}

async function updateLender(id, patch) {
  // Guard: only allow is_active and priority to be changed
  const allowed = {};
  if (patch.is_active !== undefined) allowed.is_active = patch.is_active;
  if (patch.priority  !== undefined) allowed.priority  = patch.priority;

  if (Object.keys(allowed).length === 0) {
    throw Object.assign(new Error('VALIDATION_ERROR: Only is_active and priority fields are updatable'), { statusCode: 400, code: 'VALIDATION_ERROR' });
  }

  const { data, error } = await supabase
    .from('lenders')
    .update(allowed)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  if (!data) throw Object.assign(new Error('NOT_FOUND: Lender not found'), { statusCode: 404, code: 'NOT_FOUND' });
  return data;
}

module.exports = { listLenders, updateLender };
