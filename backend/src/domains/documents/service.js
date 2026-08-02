'use strict';
const supabase = require('../../config/database');
const { getCdnRelativePath } = require('../../shared/utils/cdnStorage');
const auditRepo = require('../notifications/auditRepository');

async function saveDocument({ loanApplicationId, party, docType, uploadedByProfileId, multerFile, subDir }) {
  const cdnPath = getCdnRelativePath(multerFile, subDir);
  const { data, error } = await supabase
    .from('documents')
    .insert({
      loan_application_id: loanApplicationId,
      party,
      doc_type: docType,
      cdn_path: cdnPath,
      original_filename: multerFile.originalname,
      mime_type: multerFile.mimetype,
      file_size_bytes: multerFile.size,
      uploaded_by_profile_id: uploadedByProfileId,
    })
    .select().single();
  if (error) throw error;
  return data;
}

async function verifyDocument({ documentId, verifiedByProfileId, verified, rejectionReason }) {
  const updates = {
    verified,
    verified_by: verifiedByProfileId,
    verified_at: verified ? new Date().toISOString() : null,
    rejection_reason: rejectionReason ?? null,
  };
  const { data, error } = await supabase
    .from('documents').update(updates).eq('id', documentId).select().single();
  if (error) throw error;

  await auditRepo.insert({
    actor_profile_id: verifiedByProfileId,
    action: verified ? 'document_verified' : 'document_rejected',
    entity: 'documents',
    entity_id: documentId,
    detail: { rejection_reason: rejectionReason },
  });

  return data;
}

async function findByApplication(loanApplicationId) {
  const { data, error } = await supabase
    .from('documents').select('*').eq('loan_application_id', loanApplicationId);
  if (error) throw error;
  return data ?? [];
}

async function getChecklist(loanApplicationId) {
  // Get the submitted lender's active policy docs for this application
  const { data: app } = await supabase
    .from('loan_applications')
    .select('submitted_lender_id, product_type, customer_id')
    .eq('id', loanApplicationId)
    .single();

  if (!app?.submitted_lender_id) return { policy_documents: [], uploaded: [] };

  const { data: policy } = await supabase
    .from('lender_policies')
    .select('*, policy_documents(*)')
    .eq('lender_id', app.submitted_lender_id)
    .eq('product_type', app.product_type)
    .eq('status', 'active')
    .single();

  const uploaded = await findByApplication(loanApplicationId);

  return {
    policy_documents: policy?.policy_documents ?? [],
    uploaded,
  };
}

module.exports = { saveDocument, verifyDocument, findByApplication, getChecklist };
