'use strict';
const express = require('express');
const { authenticate } = require('../../shared/middleware/authenticate');
const { roleGuard }    = require('../../shared/middleware/roleGuard');
const { sendSuccess }  = require('../../shared/utils/response');
const loanSvc          = require('../../domains/loan-applications/service');
const documentSvc      = require('../../domains/documents/service');
const { supabase }     = require('../../config/database');

const router = express.Router();
router.use(authenticate, roleGuard(['staff']));

// GET /staff-panel/applications
router.get('/applications', async (req, res, next) => {
  try {
    const result = await loanSvc.listApplications({ status: req.query.status, stage: req.query.stage });
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

// GET /staff-panel/applications/:id
router.get('/applications/:id', async (req, res, next) => {
  try {
    const app = await loanSvc.getApplication(req.params.id);
    sendSuccess(res, app);
  } catch (err) { next(err); }
});

// POST /staff-panel/applications/:id/stage-entry — add a stage update
router.post('/applications/:id/stage-entry', async (req, res, next) => {
  try {
    const entry = await loanSvc.addStageEntry({ loanApplicationId: req.params.id, stage: req.body.stage, enteredByProfileId: req.user.profileId, outcome: req.body.outcome, remarks: req.body.remarks, data: req.body.data, newStatus: req.body.new_status });
    sendSuccess(res, entry, 201);
  } catch (err) { next(err); }
});

// PATCH /staff-panel/documents/:id/verify — verify or reject a document
router.patch('/documents/:id/verify', async (req, res, next) => {
  try {
    const doc = await documentSvc.verifyDocument({ documentId: req.params.id, verifiedByProfileId: req.user.profileId, verified: req.body.verified, rejectionReason: req.body.rejection_reason });
    sendSuccess(res, doc);
  } catch (err) { next(err); }
});

module.exports = router;
