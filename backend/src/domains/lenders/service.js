'use strict';
const repo = require('./repository');
const { z } = require('zod');

async function listLenders({ includeInactive } = {}) {
  return repo.findAll({ includeInactive });
}

async function getLender(id) {
  const lender = await repo.findById(id);
  if (!lender) { const e = new Error('Lender not found'); e.code = 'NOT_FOUND'; e.status = 404; throw e; }
  return lender;
}

async function createLender(payload) {
  return repo.create(payload);
}

async function updateLender(id, payload) {
  await getLender(id); // throws NOT_FOUND if missing
  return repo.update(id, payload);
}

async function removeLender(id) {
  await getLender(id); // throws NOT_FOUND if missing
  return repo.remove(id);
}

async function listPolicies(lenderId, opts) {
  return repo.findPolicies(lenderId, opts);
}

async function getPolicy(policyId) {
  const p = await repo.findPolicyById(policyId);
  if (!p) { const e = new Error('Policy not found'); e.code = 'NOT_FOUND'; e.status = 404; throw e; }
  return p;
}

async function createPolicy(payload) {
  // auto-increment version for the specific lender & product
  const existing = await repo.findPolicies(payload.lender_id);
  const sameProduct = existing.filter(p => p.product_type === payload.product_type);
  const nextVersion = sameProduct.length > 0 ? Math.max(...sameProduct.map(p => p.version)) + 1 : 1;
  payload.version = nextVersion;
  return repo.createPolicy(payload);
}

async function updatePolicy(policyId, payload) {
  return repo.updateDraftPolicy(policyId, payload);
}

async function publishPolicy(policyId, adminProfileId, auditRepo) {
  const policy = await repo.publishPolicy(policyId);
  if (auditRepo) {
    await auditRepo.insert({
      actor_profile_id: adminProfileId,
      action: 'policy_published',
      entity: 'lender_policies',
      entity_id: policyId,
      detail: { version: policy.version, lender_id: policy.lender_id, product_type: policy.product_type },
    });
  }
  return policy;
}

module.exports = {
  listLenders, getLender, createLender, updateLender, removeLender,
  listPolicies, getPolicy, createPolicy, updatePolicy, publishPolicy,
};
