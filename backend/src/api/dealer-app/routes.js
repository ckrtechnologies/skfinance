'use strict';
const express = require('express');
const multer  = require('multer');
const { authenticate }  = require('../../shared/middleware/authenticate');
const { roleGuard }     = require('../../shared/middleware/roleGuard');
const { sendSuccess }   = require('../../shared/utils/response');
const loanSvc           = require('../../domains/loan-applications/service');
const walletSvc         = require('../../domains/wallet/service');
const notificationSvc   = require('../../domains/notifications/service');
const { supabase }      = require('../../config/database');
const { saveToCdn }     = require('../../shared/utils/cdnStorage');
const { orchestrate }   = require('../../domains/eligibility-engine/orchestrator');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const router = express.Router();

// POST /dealer/applications/upload-document  (auth required, dealer role)
router.post(
  '/applications/upload-document',
  authenticate,
  roleGuard(['dealer']),
  upload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file provided' });
      const { loan_application_id, doc_type, party } = req.body;
      const { cdn_url } = saveToCdn(req.file, 'dealer-upload', party || 'applicant', doc_type || 'document');
      
      if (loan_application_id && doc_type && party) {
        const { error } = await supabase.from('documents').insert({
          loan_application_id,
          doc_type,
          party,
          cdn_path: cdn_url,
          original_filename: req.file.originalname,
          mime_type: req.file.mimetype,
          file_size_bytes: req.file.size,
          uploaded_by_profile_id: req.user.profileId
        });
        if (error) console.error('Failed to insert document record:', error);
      }

      sendSuccess(res, { url: cdn_url }, 201);
    } catch (err) { next(err); }
  }
);

router.use(authenticate, roleGuard(['dealer']));

// GET /dealer/profile
router.get('/profile', async (req, res, next) => {
  try {
    const { data } = await supabase.from('dealers').select('*').eq('profile_id', req.user.profileId).single();
    sendSuccess(res, data);
  } catch (err) { next(err); }
});

// POST /dealer/applications/cibil/fetch
router.post('/applications/cibil/fetch', async (req, res, next) => {
  try {
    const { pan_number } = req.body;
    if (!pan_number) {
      return res.status(400).json({ error: 'pan_number is required to fetch CIBIL' });
    }
    
    // Simulate API delay
    await new Promise(r => setTimeout(r, 1500));
    
    // Generate a random score between 600 and 850 as per user request for testing all cases
    const score = Math.floor(Math.random() * (850 - 600 + 1)) + 600;
    
    sendSuccess(res, {
      pan_number,
      score,
      status: 'success',
      report_date: new Date().toISOString()
    });
  } catch (err) { next(err); }
});

// POST /dealer/pre-check — eligibility pre-check
router.post('/pre-check', async (req, res, next) => {
  try {
    const results = await orchestrate(req.body, { stage: 'pre_check' });
    sendSuccess(res, results);
  } catch (err) { next(err); }
});

// GET /dealer/applications
router.get('/applications', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = parseInt(req.query.offset, 10) || 0;
    const { data: dealer } = await supabase.from('dealers').select('id').eq('profile_id', req.user.profileId).single();
    const result = await loanSvc.listApplications({ 
      dealerId: dealer.id, 
      status: req.query.status, 
      stage: req.query.stage,
      limit,
      offset
    });
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

// POST /dealer/applications
router.post('/applications', async (req, res, next) => {
  try {
    const { data: dealer } = await supabase.from('dealers').select('id').eq('profile_id', req.user.profileId).single();
    
    let customerId = req.body.customer_id;
    const { customer_name, phone, pan_number, product_type, vehicle_details, loan_amount, requested_amount, co_applicant_name, co_applicant_income } = req.body;
    
    if (!customerId && (customer_name || phone)) {
      // Find or create customer auth & profile
      let authUserId = null;
      try {
        const dummyPhone = phone || `9${Date.now()}`.slice(0, 10);
        const { data: authData } = await supabase.auth.admin.createUser({ phone: dummyPhone, phone_confirm: true });
        authUserId = authData?.user?.id;
      } catch (e) {
        if (phone) {
          const { data: existingProf } = await supabase.from('profiles').select('auth_user_id').eq('phone', phone).single();
          authUserId = existingProf?.auth_user_id;
        }
      }

      if (authUserId) {
        const { data: prof } = await supabase.from('profiles')
          .upsert({ auth_user_id: authUserId, role: 'customer', full_name: customer_name || 'Customer', phone }, { onConflict: 'auth_user_id' })
          .select().single();
          
        if (prof) {
          const { data: cust } = await supabase.from('customers')
            .upsert({ profile_id: prof.id, pan_number, co_applicant_name, co_applicant_income: co_applicant_income ? parseFloat(co_applicant_income) : null }, { onConflict: 'profile_id' })
            .select().single();
          if (cust) customerId = cust.id;
        }
      }
    }

    const applicationData = {
      customerId,
      createdByProfileId: req.user.profileId,
      dealerId: dealer.id,
      productType: product_type || req.body.productType || 'new_car',
      vehicleDetails: vehicle_details || req.body.vehicleDetails || {},
      requestedAmount: parseFloat(loan_amount || requested_amount || 0)
    };

    const newApp = await loanSvc.createApplication(applicationData);
    sendSuccess(res, newApp, 201);
  } catch (err) { next(err); }
});

// GET /dealer/applications/:id
router.get('/applications/:id', async (req, res, next) => {
  try {
    const app = await loanSvc.getApplication(req.params.id);
    sendSuccess(res, app);
  } catch (err) { next(err); }
});

// GET /dealer/wallet
router.get('/wallet', async (req, res, next) => {
  try {
    const { data: dealer } = await supabase.from('dealers').select('id').eq('profile_id', req.user.profileId).single();
    const wallet = await walletSvc.getDealerWallet(dealer.id);
    sendSuccess(res, wallet);
  } catch (err) { next(err); }
});

// GET /dealer/commissions
router.get('/commissions', async (req, res, next) => {
  try {
    const { data: dealer } = await supabase.from('dealers').select('id').eq('profile_id', req.user.profileId).single();
    const commissions = await walletSvc.getDealerCommissions(dealer.id);
    sendSuccess(res, commissions);
  } catch (err) { next(err); }
});

// POST /dealer/withdrawal-requests
router.post('/withdrawal-requests', async (req, res, next) => {
  try {
    const { data: dealer } = await supabase.from('dealers').select('id').eq('profile_id', req.user.profileId).single();
    const wr = await walletSvc.createWithdrawalRequest(dealer.id, req.body.amount_requested);
    sendSuccess(res, wr, 201);
  } catch (err) { next(err); }
});

// GET /dealer/withdrawal-requests
router.get('/withdrawal-requests', async (req, res, next) => {
  try {
    const { data: dealer } = await supabase.from('dealers').select('id').eq('profile_id', req.user.profileId).single();
    const wrs = await walletSvc.getWithdrawalRequests(dealer.id);
    sendSuccess(res, wrs);
  } catch (err) { next(err); }
});

// GET /dealer/notifications
router.get('/notifications', async (req, res, next) => {
  try {
    const notifications = await notificationSvc.listNotifications(req.user.profileId);
    sendSuccess(res, notifications);
  } catch (err) { next(err); }
});

module.exports = router;
