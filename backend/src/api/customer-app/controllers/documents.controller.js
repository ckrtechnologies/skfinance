'use strict';
const docService = require('../../../domains/documents/service');
const { getCdnUrl } = require('../../../shared/utils/cdnStorage');
const { ok, fail } = require('../../../shared/utils/response');
const supabase = require('../../../config/database');

async function upload(req, res, next) {
  try {
    if (!req.file) return fail(res, 'VALIDATION_ERROR', 'No file uploaded', 422);
    const { party, doc_type } = req.body;
    if (!party || !doc_type) return fail(res, 'VALIDATION_ERROR', 'party and doc_type are required', 422);

    // Build CDN subdir and set it (multer already wrote the file using req.cdnSubDir if pre-set)
    const loanApplicationId = req.params.id;
    const { data: app } = await supabase.from('loan_applications').select('application_no').eq('id', loanApplicationId).single();
    const subDir = `loans/${app?.application_no ?? loanApplicationId}/${party}/${doc_type}`;

    const doc = await docService.saveDocument({
      loanApplicationId,
      party,
      docType: doc_type,
      uploadedByProfileId: req.user.profile.id,
      multerFile: req.file,
      subDir,
    });

    return ok(res, { document: { ...doc, cdn_url: getCdnUrl(doc.cdn_path) } }, 201);
  } catch (err) { next(err); }
}

async function checklist(req, res, next) {
  try {
    const result = await docService.getChecklist(req.params.id);
    return ok(res, result);
  } catch (err) { next(err); }
}

module.exports = { upload, checklist };
