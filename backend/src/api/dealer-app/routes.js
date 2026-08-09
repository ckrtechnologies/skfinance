'use strict';
const express = require('express');
const multer = require('multer');
const { authenticate } = require('../../shared/middleware/authenticate');
const { roleGuard } = require('../../shared/middleware/roleGuard');
const { sendSuccess, sendError } = require('../../shared/utils/response');
const authService = require('../../domains/auth/service');
const loanSvc = require('../../domains/loan-applications/service');
const walletSvc = require('../../domains/wallet/service');
const notificationSvc = require('../../domains/notifications/service');
const { supabase } = require('../../config/database');
const { saveToCdn } = require('../../shared/utils/cdnStorage');
const { orchestrate } = require('../../domains/eligibility-engine/orchestrator');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
const router = express.Router();

// POST /dealer/applications/upload-document  (auth required, dealer role)
router.post(
  '/applications/upload-document',
  authenticate,
  roleGuard(['dealer']),
  upload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ success: false, error: { code: 'NO_FILE', message: 'No file provided' } });
      const { loan_application_id, doc_type, party } = req.body;

      let applicationNo = 'dealer-upload';
      if (loan_application_id) {
        const { data: appData } = await supabase
          .from('loan_applications')
          .select('application_no')
          .eq('id', loan_application_id)
          .single();
        if (appData?.application_no) {
          applicationNo = appData.application_no;
        }
      }

      const { cdn_path, cdn_url } = saveToCdn(
        req.file,
        applicationNo,
        party || 'applicant',
        doc_type || 'document'
      );

      let docId = null;
      if (loan_application_id && doc_type && party) {
        const { data: docData, error } = await supabase.from('documents').insert({
          loan_application_id,
          doc_type,
          party,
          cdn_path,
          original_filename: req.file.originalname || `${doc_type || 'document'}.bin`,
          mime_type: req.file.mimetype || 'application/octet-stream',
          file_size_bytes: req.file.size || 0,
          uploaded_by_profile_id: req.user.profileId
        }).select('id').single();
        if (error) console.error('Failed to insert document record:', error);
        else docId = docData.id;
      }

      sendSuccess(res, { url: cdn_url, cdn_path, document_id: docId }, 201);
    } catch (err) { next(err); }
  }
);

router.use(authenticate, roleGuard(['dealer']));

// GET /dealer/profile

// GET /dealer/banners
router.get('/banners', async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('dealer_banners').select('*').eq('is_active', true).order('sort_order', { ascending: true });
    if (error) throw error;
    sendSuccess(res, data || []);
  } catch (err) { next(err); }
});

router.get('/profile', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('dealers')
      .select('*, profiles!dealers_profile_id_fkey(avatar_url, full_name, phone, email)')
      .eq('profile_id', req.user.profileId)
      .single();
      
    if (error) throw error;
    sendSuccess(res, data);
  } catch (err) { next(err); }
});

router.put('/profile', async (req, res, next) => {
  try {
    const result = await authService.updateProfile(req.user.profileId, req.user.role, req.body);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

router.post('/profile/avatar', upload.single('avatar'), async (req, res, next) => {
  try {
    const result = await authService.uploadAvatar(req.user.profileId, req.file);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

router.delete('/profile', async (req, res, next) => {
  try {
    const result = await authService.softDeleteProfile(req.user.profileId);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

// POST /dealer/applications/cibil/fetch
router.post('/applications/cibil/fetch', async (req, res, next) => {
  try {
    const { pan_number, application_id, customer_name, application_no } = req.body;
    if (!pan_number) {
      return res.status(400).json({ error: 'pan_number is required to fetch CIBIL' });
    }

    const { data: dealer } = await supabase.from('dealers').select('id').eq('profile_id', req.user.profileId).single();
    if (!dealer) return res.status(403).json({ error: 'Dealer profile required' });

    const appText = application_no ? `(App #${application_no})` : '';
    const custText = customer_name ? `for ${customer_name}` : `PAN: ${pan_number}`;

    // Deduct ₹70 from dealer's wallet for CIBIL hit
    const { error: ledgerError } = await supabase.from('wallet_ledger').insert({
      dealer_id: dealer.id,
      entry_type: 'adjustment',
      amount: -70.00,
      application_id: application_id || null,
      remarks: `₹70 CIBIL Verification Fee ${custText} ${appText}`.trim(),
      created_by_profile_id: req.user.profileId
    });

    if (ledgerError) throw ledgerError;

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
      searchQuery: req.query.search,
      status: req.query.status,
      stage: req.query.stage,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      limit,
      offset
    });
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

// POST /dealer/applications
router.post('/applications', async (req, res, next) => {
  try {
    const { data: dealer } = await supabase.from('dealers').select('id').eq('profile_id', req.user.profileId).maybeSingle();

    let customerId = req.body.customer_id;
    const { customer_name, phone, pan_number, product_type, vehicle_details, loan_amount, requested_amount, co_applicant_name, co_applicant_income, cibil_score, age } = req.body;

    if (!customerId) {
      // 1. Check if customer exists by PAN number
      if (pan_number) {
        const { data: existingCustByPan } = await supabase
          .from('customers')
          .select('id')
          .eq('pan_number', pan_number)
          .maybeSingle();
        if (existingCustByPan) customerId = existingCustByPan.id;
      }

      // 2. Check if customer exists by phone number on profile
      if (!customerId && phone) {
        const { data: existingProf } = await supabase
          .from('profiles')
          .select('id, auth_user_id')
          .eq('phone', phone)
          .maybeSingle();

        if (existingProf) {
          const { data: existingCust } = await supabase
            .from('customers')
            .select('id')
            .eq('profile_id', existingProf.id)
            .maybeSingle();

          if (existingCust) {
            customerId = existingCust.id;
          } else {
            const { data: newCust } = await supabase
              .from('customers')
              .insert({
                profile_id: existingProf.id,
                pan_number,
                cibil_score: cibil_score ? parseInt(cibil_score, 10) : null,
                co_applicant_name,
                co_applicant_income: co_applicant_income ? parseFloat(co_applicant_income) : null
              })
              .select()
              .single();
            if (newCust) customerId = newCust.id;
          }
        }
      }

      // 3. Create new auth user, profile, and customer record if not found
      if (!customerId && (customer_name || phone)) {
        let authUserId = null;
        try {
          const dummyPhone = phone || `9${Date.now()}`.slice(0, 10);
          const { data: authData, error } = await supabase.auth.admin.createUser({ phone: dummyPhone, phone_confirm: true });
          if (error) throw error;
          authUserId = authData?.user?.id;
        } catch (e) {
          console.error('[Create Customer Error]', e);
          if (phone) {
            const { data: existingProf } = await supabase.from('profiles').select('auth_user_id').eq('phone', phone).maybeSingle();
            authUserId = existingProf?.auth_user_id;
          }
          if (!authUserId) {
            const dummyPhone = `9${Date.now()}`.slice(0, 10);
            const { data: fallbackAuthData } = await supabase.auth.admin.createUser({ phone: dummyPhone, phone_confirm: true });
            authUserId = fallbackAuthData?.user?.id;
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
    }

    if (!customerId) {
      return sendError(res, 400, 'CUSTOMER_REQUIRED', 'Could not resolve customer record. Please check phone and PAN number details.');
    }

    if (cibil_score || age) {
      const updateData = {};
      if (cibil_score) updateData.cibil_score = parseInt(cibil_score, 10);
      if (age) {
        // Calculate estimated DOB (Jan 1 of current year - age)
        const currentYear = new Date().getFullYear();
        updateData.dob = `${currentYear - parseInt(age, 10)}-01-01`;
      }
      
      await supabase
        .from('customers')
        .update(updateData)
        .eq('id', customerId);
    }

    const applicationData = {
      customerId,
      createdByProfileId: req.user.profileId,
      dealerId: dealer ? dealer.id : null,
      productType: product_type || req.body.productType || 'new_car',
      vehicleDetails: vehicle_details || req.body.vehicleDetails || {},
      requestedAmount: parseFloat(loan_amount || requested_amount || 0),
      ownershipProvidedBy: req.body.ownership_provided_by || null
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

// GET /dealer/applications/:id/stage-entries
router.get('/applications/:id/stage-entries', async (req, res, next) => {
  try {
    const entries = await loanSvc.getStageEntries(req.params.id);
    sendSuccess(res, entries);
  } catch (err) { next(err); }
});

// POST /dealer/applications/:id/clarification
router.post('/applications/:id/clarification', async (req, res, next) => {
  try {
    const result = await loanSvc.resubmitClarification({
      loanApplicationId: req.params.id,
      dealerProfileId: req.user.profileId,
      notes: req.body.notes,
      queryId: req.body.queryId,
      documentIds: req.body.documentIds
    });
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

// GET /dealer/wallet
router.get('/wallet', async (req, res, next) => {
  try {
    const { data: dealer } = await supabase.from('dealers').select('id').eq('profile_id', req.user.profileId).single();
    const { startDate, endDate } = req.query;
    const wallet = await walletSvc.getDealerWallet(dealer.id, { startDate, endDate });
    sendSuccess(res, wallet);
  } catch (err) { next(err); }
});

// GET /dealer/commissions
router.get('/commissions', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const { data: dealer } = await supabase.from('dealers').select('id').eq('profile_id', req.user.profileId).single();
    const commissions = await walletSvc.getDealerCommissions(dealer.id, { startDate, endDate });
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
    const { startDate, endDate } = req.query;
    const { data: dealer } = await supabase.from('dealers').select('id').eq('profile_id', req.user.profileId).single();
    const wrs = await walletSvc.getWithdrawalRequests(dealer.id, { startDate, endDate });
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
