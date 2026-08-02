'use strict';
const supabase = require('../../config/database');

// ─── Lenders ──────────────────────────────────────────────────────────

async function findAll({ includeInactive = false } = {}) {
  let q = supabase.from('lenders').select('*').order('priority');
  if (!includeInactive) q = q.eq('is_active', true);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

async function findById(id) {
  const { data, error } = await supabase.from('lenders').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

async function create(payload) {
  const { data, error } = await supabase.from('lenders').insert(payload).select().single();
  if (error) throw error;
  return data;
}

async function update(id, payload) {
  const { data, error } = await supabase.from('lenders').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

// ─── Policies ─────────────────────────────────────────────────────────

async function findPolicies(lenderId, { status } = {}) {
  let q = supabase
    .from('lender_policies')
    .select('*, policy_documents(*)')
    .eq('lender_id', lenderId)
    .order('version', { ascending: false });
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

async function findPolicyById(policyId) {
  const { data, error } = await supabase
    .from('lender_policies')
    .select('*, policy_documents(*), lenders(name, code)')
    .eq('id', policyId)
    .single();
  if (error) throw error;
  return data;
}

async function findActivePolicies(productType) {
  let q = supabase
    .from('lender_policies')
    .select('*, policy_documents(*), lenders!inner(name, code, priority, is_active)')
    .eq('status', 'active')
    .eq('lenders.is_active', true)
    .order('lenders.priority');
  if (productType) q = q.eq('product_type', productType);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

async function createPolicy(payload) {
  const { policy_documents: docs, ...policyFields } = payload;

  const { data: policy, error } = await supabase
    .from('lender_policies')
    .insert(policyFields)
    .select()
    .single();
  if (error) throw error;

  if (docs?.length) {
    const docRows = docs.map(d => ({ ...d, policy_id: policy.id }));
    const { error: docErr } = await supabase.from('policy_documents').insert(docRows);
    if (docErr) throw docErr;
  }

  return findPolicyById(policy.id);
}

async function updateDraftPolicy(policyId, payload) {
  const { policy_documents: docs, ...fields } = payload;

  const { data: existing } = await supabase
    .from('lender_policies').select('status').eq('id', policyId).single();
  if (existing?.status !== 'draft') {
    const err = new Error('Only draft policies can be edited');
    err.code = 'POLICY_NOT_ACTIVE';
    err.status = 409;
    throw err;
  }

  const { data, error } = await supabase
    .from('lender_policies').update(fields).eq('id', policyId).select().single();
  if (error) throw error;

  if (docs !== undefined) {
    // Replace docs: delete existing, re-insert
    await supabase.from('policy_documents').delete().eq('policy_id', policyId);
    if (docs.length) {
      await supabase.from('policy_documents').insert(docs.map(d => ({ ...d, policy_id: policyId })));
    }
  }

  return findPolicyById(policyId);
}

async function publishPolicy(policyId) {
  // Get the draft to publish
  const { data: draft, error: fetchErr } = await supabase
    .from('lender_policies').select('*').eq('id', policyId).single();
  if (fetchErr || !draft) {
    const err = new Error('Policy not found'); err.code = 'NOT_FOUND'; err.status = 404; throw err;
  }
  if (draft.status !== 'draft') {
    const err = new Error('Only draft policies can be published');
    err.code = 'POLICY_NOT_ACTIVE'; err.status = 409; throw err;
  }

  // Retire current active policy for same lender+product
  const now = new Date().toISOString().split('T')[0];
  await supabase
    .from('lender_policies')
    .update({ status: 'retired', effective_to: now })
    .eq('lender_id', draft.lender_id)
    .eq('product_type', draft.product_type)
    .eq('status', 'active');

  // Activate this one
  const { data, error } = await supabase
    .from('lender_policies')
    .update({ status: 'active', effective_from: now })
    .eq('id', policyId)
    .select().single();
  if (error) throw error;
  return data;
}

module.exports = {
  findAll, findById, create, update,
  findPolicies, findPolicyById, findActivePolicies,
  createPolicy, updateDraftPolicy, publishPolicy,
};
