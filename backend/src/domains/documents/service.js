'use strict';
const { supabase } = require('../../config/database');
const { saveToCdn } = require('../../shared/utils/cdnStorage');

async function uploadDocument({ loanApplicationId, applicationNo, party, docType, file, uploadedByProfileId }) {
  const { cdn_path } = saveToCdn(file, applicationNo, party, docType);
  const { data, error } = await supabase
    .from('documents')
    .insert({ loan_application_id: loanApplicationId, party, doc_type: docType, cdn_path, original_filename: file.originalname, mime_type: file.mimetype, file_size_bytes: file.size, uploaded_by_profile_id: uploadedByProfileId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function listDocuments(loanApplicationId) {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('loan_application_id', loanApplicationId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

async function verifyDocument({ documentId, verifiedByProfileId, verified, rejectionReason }) {
  const update = { verified, verified_by: verifiedByProfileId, verified_at: verified ? new Date().toISOString() : null, rejection_reason: rejectionReason || null };
  const { data, error } = await supabase.from('documents').update(update).eq('id', documentId).select().single();
  if (error) throw error;
  return data;
}

module.exports = { uploadDocument, listDocuments, verifyDocument };
