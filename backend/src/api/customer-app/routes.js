'use strict';
const express  = require('express');
const multer   = require('multer');
const { authenticate }  = require('../../shared/middleware/authenticate');
const { roleGuard }     = require('../../shared/middleware/roleGuard');
const { sendSuccess }   = require('../../shared/utils/response');
const { orchestrate }   = require('../../domains/eligibility-engine/orchestrator');
const loanSvc           = require('../../domains/loan-applications/service');
const documentSvc       = require('../../domains/documents/service');
const notificationSvc   = require('../../domains/notifications/service');
const { supabase }      = require('../../config/database');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// All customer routes require authentication + customer role
router.use(authenticate, roleGuard(['customer']));

// GET /customer/profile
router.get('/profile', async (req, res, next) => {
  try {
    const { data } = await supabase.from('customers').select('*').eq('profile_id', req.user.profileId).single();
    sendSuccess(res, data);
  } catch (err) { next(err); }
});

// POST /customer/pre-check — eligibility pre-check (no loan app required)
router.post('/pre-check', async (req, res, next) => {
  try {
    const results = await orchestrate(req.body, { stage: 'pre_check' });
    sendSuccess(res, results);
  } catch (err) { next(err); }
});

// POST /customer/applications — create loan application
router.post('/applications', async (req, res, next) => {
  try {
    const { data: customer } = await supabase.from('customers').select('id').eq('profile_id', req.user.profileId).single();
    const app = await loanSvc.createApplication({ customerId: customer.id, createdByProfileId: req.user.profileId, dealerId: req.body.dealerId, staffId: null, productType: req.body.productType, vehicleDetails: req.body.vehicleDetails || {}, requestedAmount: req.body.requestedAmount });
    sendSuccess(res, app, 201);
  } catch (err) { next(err); }
});

// GET /customer/applications
router.get('/applications', async (req, res, next) => {
  try {
    const { data: customer } = await supabase.from('customers').select('id').eq('profile_id', req.user.profileId).single();
    const result = await loanSvc.listApplications({ customerId: customer.id });
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

// GET /customer/applications/:id
router.get('/applications/:id', async (req, res, next) => {
  try {
    const app = await loanSvc.getApplication(req.params.id);
    sendSuccess(res, app);
  } catch (err) { next(err); }
});

// POST /customer/applications/:id/evaluate — full eligibility check
router.post('/applications/:id/evaluate', async (req, res, next) => {
  try {
    const results = await orchestrate(req.body, { stage: 'full', loanApplicationId: req.params.id });
    sendSuccess(res, results);
  } catch (err) { next(err); }
});

// POST /customer/applications/:id/documents — upload document
router.post('/applications/:id/documents', upload.single('file'), async (req, res, next) => {
  try {
    const app = await loanSvc.getApplication(req.params.id);
    const doc = await documentSvc.uploadDocument({ loanApplicationId: app.id, applicationNo: app.application_no, party: req.body.party, docType: req.body.doc_type, file: req.file, uploadedByProfileId: req.user.profileId });
    sendSuccess(res, doc, 201);
  } catch (err) { next(err); }
});

// GET /customer/applications/:id/documents
router.get('/applications/:id/documents', async (req, res, next) => {
  try {
    const docs = await documentSvc.listDocuments(req.params.id);
    sendSuccess(res, docs);
  } catch (err) { next(err); }
});

// GET /customer/notifications
router.get('/notifications', async (req, res, next) => {
  try {
    const notifications = await notificationSvc.listNotifications(req.user.profileId);
    sendSuccess(res, notifications);
  } catch (err) { next(err); }
});

module.exports = router;
