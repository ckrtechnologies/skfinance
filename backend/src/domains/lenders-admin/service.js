'use strict';
const { supabase } = require('../../config/database');

async function listLenders() {
  const { data, error } = await supabase
    .from('lenders')
    .select('id, name, code, lender_type, logo_url, priority, is_active, contact_name, contact_email, contact_phone, notes')
    .order('priority', { ascending: true });

  if (error) throw error;
  return data;
}

async function createLender(lenderData) {
  const { data, error } = await supabase
    .from('lenders')
    .insert({
      name: lenderData.name,
      code: lenderData.code,
      lender_type: lenderData.lender_type || 'nbfc',
      priority: lenderData.priority || 99,
      is_active: true,
      rules: {} // Initialize empty rules
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

async function updateLender(id, patch) {
  const { data, error } = await supabase
    .from('lenders')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  if (!data) throw Object.assign(new Error('NOT_FOUND: Lender not found'), { statusCode: 404, code: 'NOT_FOUND' });
  return data;
}

async function deleteLender(id) {
  // Try to delete. If it violates FK (like having loan applications), it will throw an error
  const { data, error } = await supabase
    .from('lenders')
    .delete()
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    if (error.code === '23503') {
      throw Object.assign(new Error('Cannot delete lender because it has associated loan applications.'), { statusCode: 409, code: 'FOREIGN_KEY_VIOLATION' });
    }
    throw error;
  }
  return data;
}

module.exports = { listLenders, createLender, updateLender, deleteLender };
