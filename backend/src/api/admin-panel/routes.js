'use strict';
const express = require('express');
const { authenticate } = require('../../shared/middleware/authenticate');
const { roleGuard } = require('../../shared/middleware/roleGuard');
const { sendSuccess, sendError } = require('../../shared/utils/response');
const loanSvc = require('../../domains/loan-applications/service');
const walletSvc = require('../../domains/wallet/service');
const lendersAdminSvc = require('../../domains/lenders-admin/service');
const notificationSvc = require('../../domains/notifications/service');
const { supabase } = require('../../config/database');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const { CDN_LOCAL_PATH, CDN_BASE_URL } = require('../../config/secrets');
const whatsappRoutes = require('../../domains/whatsapp/routes');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

const router = express.Router();
router.use(authenticate, roleGuard(['admin']));

const getEndOfDay = (dateStr) => {
  if (!dateStr) return undefined;
  const d = new Date(dateStr);
  d.setUTCHours(23, 59, 59, 999);
  return d.toISOString();
};

// ── Dashboard ────────────────────────────────────────────────────────
router.get('/dashboard', async (req, res, next) => {
  try {
    let queryAll = supabase.from('loan_applications').select('*', { count: 'exact', head: true });
    let queryApproved = supabase.from('loan_applications').select('*', { count: 'exact', head: true }).eq('status', 'approved');
    let queryDisbursed = supabase.from('loan_applications').select('*', { count: 'exact', head: true }).eq('status', 'disbursed');

    if (req.query.from) {
      queryAll = queryAll.gte('created_at', req.query.from);
      queryApproved = queryApproved.gte('created_at', req.query.from);
      queryDisbursed = queryDisbursed.gte('created_at', req.query.from);
    }
    if (req.query.to) {
      const toISO = getEndOfDay(req.query.to);
      queryAll = queryAll.lte('created_at', toISO);
      queryApproved = queryApproved.lte('created_at', toISO);
      queryDisbursed = queryDisbursed.lte('created_at', toISO);
    }

    const [{ count: total }, { count: approved }, { count: disbursed }] = await Promise.all([
      queryAll, queryApproved, queryDisbursed
    ]);
    sendSuccess(res, { total_applications: total, approved, disbursed });
  } catch (err) { next(err); }
});

// ── Loan Applications ────────────────────────────────────────────────
router.get('/applications', async (req, res, next) => {
  try {
    const result = await loanSvc.listApplications({ 
      searchQuery: req.query.search, 
      status: req.query.status, 
      stage: req.query.stage, 
      source: req.query.source,
      assignedStaffId: req.query.assigned_staff_id,
      unassigned: req.query.unassigned === 'true',
      startDate: req.query.from,
      endDate: getEndOfDay(req.query.to),
      limit: Number(req.query.limit) || 20, 
      offset: Number(req.query.offset) || 0 
    });
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

router.post('/applications/:id/assign', async (req, res, next) => {
  try {
    const { staff_ids } = req.body; // now expects an array
    const result = await loanSvc.assignApplication(req.params.id, staff_ids, req.user?.profileId);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

router.get('/applications/:id', async (req, res, next) => {
  try {
    const app = await loanSvc.getApplication(req.params.id);
    sendSuccess(res, app);
  } catch (err) { next(err); }
});

router.get('/applications/:id/stage-entries', async (req, res, next) => {
  try {
    const entries = await loanSvc.getStageEntries(req.params.id);
    sendSuccess(res, entries);
  } catch (err) { next(err); }
});

router.post('/applications/:id/stage-entry', async (req, res, next) => {
  try {
    const entry = await loanSvc.addStageEntry({ loanApplicationId: req.params.id, stage: req.body.stage, enteredByProfileId: req.user.profileId, outcome: req.body.outcome, remarks: req.body.remarks, data: req.body.data, newStatus: req.body.new_status });
    sendSuccess(res, entry, 201);
  } catch (err) { next(err); }
});

router.post('/applications/:id/disburse', async (req, res, next) => {
  try {
    const ninety = await loanSvc.getSetting('ninety_day_window');
    const result = await loanSvc.disburseLoan({ loanApplicationId: req.params.id, adminProfileId: req.user.profileId, disbursedAmount: req.body.disbursed_amount, remarks: req.body.remarks, stageData: req.body.stage_data, ninetyDayDays: ninety?.days ?? 90 });
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

router.post('/applications/:id/re-approve', async (req, res, next) => {
  try {
    const result = await loanSvc.reApproveLoan({ loanApplicationId: req.params.id, adminProfileId: req.user.profileId, remarks: req.body.remarks });
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

// ── Lenders (A5, A6, A7) ─────────────────────────────────────────────
router.get('/lenders', async (req, res, next) => {
  try {
    const lenders = await lendersAdminSvc.listLenders();
    sendSuccess(res, lenders);
  } catch (err) { next(err); }
});

router.post('/lenders', async (req, res, next) => {
  try {
    const { name, code, lender_type, priority, contact_phone } = req.body;
    if (!name || !code) throw Object.assign(new Error('Missing name or code'), { statusCode: 400 });
    const lender = await lendersAdminSvc.createLender({ name, code, lender_type, priority, contact_phone });
    sendSuccess(res, lender, 201);
  } catch (err) { next(err); }
});

router.patch('/lenders/:id', async (req, res, next) => {
  try {
    const updated = await lendersAdminSvc.updateLender(req.params.id, req.body);
    sendSuccess(res, updated);
  } catch (err) { next(err); }
});

router.delete('/lenders/:id', async (req, res, next) => {
  try {
    await lendersAdminSvc.deleteLender(req.params.id);
    sendSuccess(res, { deleted: true });
  } catch (err) { next(err); }
});

// GET /admin/lenders/:id/rules — rules reference
router.get('/lenders/:id/rules', async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('lenders').select('rules').eq('id', req.params.id).single();
    if (error) throw error;
    if (!data) throw Object.assign(new Error('Lender not found'), { statusCode: 404 });
    sendSuccess(res, data.rules || {});
  } catch (err) { next(err); }
});

// ── Dealers ───────────────────────────────────────────────────────────
router.get('/dealers', async (req, res, next) => {
  try {
    const { from, to } = req.query;
    let query = supabase.from('dealers').select('*, profiles!profile_id(full_name, phone, email, is_active)').order('created_at', { ascending: false });
    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', getEndOfDay(to));
    
    const { data, error } = await query;
    if (error) throw error;
    sendSuccess(res, data);
  } catch (err) { next(err); }
});

router.post('/dealers', async (req, res, next) => {
  try {
    const { business_name, phone, email, password, ...dealerFields } = req.body;
    const dealer_code = `DLR-${Date.now()}`;
    const createUserPayload = { password, phone_confirm: true, email_confirm: true };
    if (email) createUserPayload.email = email;
    if (phone) createUserPayload.phone = phone;
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser(createUserPayload);
    if (authErr) throw authErr;
    const { data: profile, error: profErr } = await supabase.from('profiles')
      .upsert({ auth_user_id: authData.user.id, role: 'dealer', full_name: business_name, phone, email }, { onConflict: 'auth_user_id' })
      .select().single();
    if (profErr) throw profErr;
    const { data: dealer, error: dealErr } = await supabase.from('dealers').insert({ profile_id: profile.id, dealer_code, business_name, ...dealerFields }).select().single();
    if (dealErr) throw dealErr;
    sendSuccess(res, dealer, 201);
  } catch (err) { next(err); }
});

router.patch('/dealers/:id', async (req, res, next) => {
  try {
    const { business_name, phone, email, password, pan_number, gst_number, is_active } = req.body;

    const { data: dealerRow, error: getErr } = await supabase.from('dealers').select('profile_id').eq('id', req.params.id).single();
    if (getErr) throw getErr;

    const { data: profileRow, error: profGetErr } = await supabase.from('profiles').select('auth_user_id').eq('id', dealerRow.profile_id).single();
    if (profGetErr) throw profGetErr;

    if (password && password.trim() !== '') {
      const { error: authErr } = await supabase.auth.admin.updateUserById(profileRow.auth_user_id, { password });
      if (authErr) throw authErr;
    }

    const profileUpdate = {};
    if (business_name !== undefined) profileUpdate.full_name = business_name;
    if (phone !== undefined) profileUpdate.phone = phone;
    if (email !== undefined) profileUpdate.email = email;
    if (is_active !== undefined) profileUpdate.is_active = is_active;

    if (Object.keys(profileUpdate).length > 0) {
      const { error: profUpdateErr } = await supabase.from('profiles').update(profileUpdate).eq('id', dealerRow.profile_id);
      if (profUpdateErr) throw profUpdateErr;
    }

    const dealerUpdate = {};
    if (business_name !== undefined) dealerUpdate.business_name = business_name;
    if (pan_number !== undefined) dealerUpdate.pan_number = pan_number;
    if (gst_number !== undefined) dealerUpdate.gst_number = gst_number;
    if (is_active !== undefined) dealerUpdate.is_active = is_active;

    if (Object.keys(dealerUpdate).length > 0) {
      const { error: dealerUpdateErr } = await supabase.from('dealers').update(dealerUpdate).eq('id', req.params.id);
      if (dealerUpdateErr) throw dealerUpdateErr;
    }

    sendSuccess(res, { success: true });
  } catch (err) { next(err); }
});

router.delete('/dealers/:id', async (req, res, next) => {
  try {
    const { data: dealerRow, error: getErr } = await supabase.from('dealers').select('profile_id').eq('id', req.params.id).single();
    if (getErr) throw getErr;

    const { data: profileRow, error: profGetErr } = await supabase.from('profiles').select('auth_user_id').eq('id', dealerRow.profile_id).single();
    if (profGetErr) throw profGetErr;

    const { error: authDelErr } = await supabase.auth.admin.deleteUser(profileRow.auth_user_id);
    if (authDelErr) throw authDelErr;

    sendSuccess(res, { deleted: true });
  } catch (err) { next(err); }
});

// ── Staff ──────────────────────────────────────────────────────────────
router.get('/staff', async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('staff').select('*, profiles(full_name, phone, email, is_active)').order('created_at', { ascending: false });
    if (error) throw error;
    sendSuccess(res, data);
  } catch (err) { next(err); }
});

router.post('/staff', async (req, res, next) => {
  try {
    const { full_name, email, password, role, phone, ...staffFields } = req.body;
    const staff_code = `STF-${Date.now()}`;
    const createUserPayload = { password, email_confirm: true, phone_confirm: true };
    if (email) createUserPayload.email = email;
    if (phone) createUserPayload.phone = phone;

    const { data: authData, error: authErr } = await supabase.auth.admin.createUser(createUserPayload);
    if (authErr) throw authErr;
    const { data: profile, error: profErr } = await supabase.from('profiles')
      .upsert({ auth_user_id: authData.user.id, role: role || 'staff', full_name, email, phone }, { onConflict: 'auth_user_id' })
      .select().single();
    if (profErr) throw profErr;
    const { data: staffRow, error: staffErr } = await supabase.from('staff').insert({ profile_id: profile.id, staff_code, ...staffFields }).select().single();
    if (staffErr) throw staffErr;
    sendSuccess(res, staffRow, 201);
  } catch (err) { next(err); }
});

router.patch('/staff/:id', async (req, res, next) => {
  try {
    const { full_name, phone, role, is_active, password } = req.body;

    // Get staff member to find profile_id
    const { data: staffRow, error: getErr } = await supabase.from('staff').select('profile_id').eq('id', req.params.id).single();
    if (getErr) throw getErr;

    // Get profile to find auth_user_id
    const { data: profileRow, error: profGetErr } = await supabase.from('profiles').select('auth_user_id').eq('id', staffRow.profile_id).single();
    if (profGetErr) throw profGetErr;

    // Update Auth user password if provided
    if (password && password.trim() !== '') {
      const { error: authErr } = await supabase.auth.admin.updateUserById(profileRow.auth_user_id, { password });
      if (authErr) throw authErr;
    }

    // Update profile
    const profileUpdate = {};
    if (full_name !== undefined) profileUpdate.full_name = full_name;
    if (phone !== undefined) profileUpdate.phone = phone;
    if (role !== undefined) profileUpdate.role = role;
    if (is_active !== undefined) profileUpdate.is_active = is_active;

    if (Object.keys(profileUpdate).length > 0) {
      const { error: profUpdateErr } = await supabase.from('profiles').update(profileUpdate).eq('id', staffRow.profile_id);
      if (profUpdateErr) throw profUpdateErr;
    }

    // Update staff row (e.g. phone, is_active)
    const staffUpdate = {};
    if (phone !== undefined) staffUpdate.phone = phone;
    if (is_active !== undefined) staffUpdate.is_active = is_active;

    if (Object.keys(staffUpdate).length > 0) {
      const { error: staffUpdateErr } = await supabase.from('staff').update(staffUpdate).eq('id', req.params.id);
      if (staffUpdateErr) throw staffUpdateErr;
    }

    sendSuccess(res, { success: true });
  } catch (err) { next(err); }
});

router.delete('/staff/:id', async (req, res, next) => {
  try {
    const { data: staffRow, error: getErr } = await supabase.from('staff').select('profile_id').eq('id', req.params.id).single();
    if (getErr) throw getErr;

    const { data: profileRow, error: profGetErr } = await supabase.from('profiles').select('auth_user_id').eq('id', staffRow.profile_id).single();
    if (profGetErr) throw profGetErr;

    // Delete Auth User (cascades to profiles and staff)
    const { error: authDelErr } = await supabase.auth.admin.deleteUser(profileRow.auth_user_id);
    if (authDelErr) throw authDelErr;

    sendSuccess(res, { deleted: true });
  } catch (err) { next(err); }
});

// ── Customers ──────────────────────────────────────────────────────────
router.get('/customers', async (req, res, next) => {
  try {
    const { from, to } = req.query;
    let query = supabase.from('customers').select('*, profiles(full_name, phone, email, is_active)').order('created_at', { ascending: false });
    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', getEndOfDay(to));
    
    const { data, error } = await query;
    if (error) throw error;
    sendSuccess(res, data);
  } catch (err) { next(err); }
});

router.patch('/customers/:id', async (req, res, next) => {
  try {
    const { full_name, phone, email, is_active, pan_number, co_applicant_name } = req.body;

    const { data: custRow, error: getErr } = await supabase.from('customers').select('profile_id').eq('id', req.params.id).single();
    if (getErr) throw getErr;

    const profileUpdate = {};
    if (full_name !== undefined) profileUpdate.full_name = full_name;
    if (phone !== undefined) profileUpdate.phone = phone;
    if (email !== undefined) profileUpdate.email = email;
    if (is_active !== undefined) profileUpdate.is_active = is_active;

    if (Object.keys(profileUpdate).length > 0) {
      const { error: profUpdateErr } = await supabase.from('profiles').update(profileUpdate).eq('id', custRow.profile_id);
      if (profUpdateErr) throw profUpdateErr;
    }

    const custUpdate = {};
    if (pan_number !== undefined) custUpdate.pan_number = pan_number;
    if (co_applicant_name !== undefined) custUpdate.co_applicant_name = co_applicant_name;

    if (Object.keys(custUpdate).length > 0) {
      const { error: custUpdateErr } = await supabase.from('customers').update(custUpdate).eq('id', req.params.id);
      if (custUpdateErr) throw custUpdateErr;
    }

    sendSuccess(res, { success: true });
  } catch (err) { next(err); }
});

router.delete('/customers/:id', async (req, res, next) => {
  try {
    const { data: custRow, error: getErr } = await supabase.from('customers').select('profile_id').eq('id', req.params.id).single();
    if (getErr) throw getErr;

    const { data: profileRow, error: profGetErr } = await supabase.from('profiles').select('auth_user_id').eq('id', custRow.profile_id).single();
    if (profGetErr) throw profGetErr;

    if (profileRow?.auth_user_id) {
      try {
        const { error: authDelErr } = await supabase.auth.admin.deleteUser(profileRow.auth_user_id);
        if (authDelErr) console.warn('Auth user delete failed or user missing:', authDelErr);
      } catch (err) {
        console.warn('Caught exception deleting auth user:', err);
      }
    }

    // Manually cascade delete loan applications to allow customer deletion
    const { data: apps } = await supabase.from('loan_applications').select('id').eq('customer_id', req.params.id);
    if (apps && apps.length > 0) {
      const appIds = apps.map(a => a.id);
      await supabase.from('stage_entries').delete().in('application_id', appIds);
      await supabase.from('documents').delete().in('application_id', appIds);
      await supabase.from('loan_applications').delete().in('id', appIds);
    }

    const { error: custDelErr } = await supabase.from('customers').delete().eq('id', req.params.id);
    if (custDelErr) throw custDelErr;

    const { error: profDelErr } = await supabase.from('profiles').delete().eq('id', custRow.profile_id);
    if (profDelErr) throw profDelErr;

    sendSuccess(res, { deleted: true });
  } catch (err) { next(err); }
});

// ── Commissions & Payouts ─────────────────────────────────────────────
router.get('/commissions', async (req, res, next) => {
  try {
    const commissions = await walletSvc.listAllCommissions({ startDate: req.query.from, endDate: getEndOfDay(req.query.to) });
    sendSuccess(res, commissions);
  } catch (err) { next(err); }
});

router.get('/withdrawal-requests', async (req, res, next) => {
  try {
    const wrs = await walletSvc.listAllWithdrawals({ status: req.query.status, startDate: req.query.from, endDate: getEndOfDay(req.query.to) });
    sendSuccess(res, wrs);
  } catch (err) { next(err); }
});

router.post('/withdrawal-requests/:id/process', async (req, res, next) => {
  try {
    let receiptPdfUrl = req.body.receipt_pdf_url;
    if (receiptPdfUrl && receiptPdfUrl.startsWith('data:')) {
      const base64Data = receiptPdfUrl.replace(/^data:([A-Za-z-+/]+);base64,/, '');
      const match = receiptPdfUrl.match(/^data:([A-Za-z-+/]+);base64,/);
      const mimeType = match ? match[1] : 'image/jpeg';
      const extension = mimeType.split('/')[1] || 'jpg';
      const buffer = Buffer.from(base64Data, 'base64');
      const filename = `${req.params.id}_${Date.now()}.${extension}`;
      const uploadDir = path.join(CDN_LOCAL_PATH, 'withdrawals');
      
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      const filePath = path.join(uploadDir, filename);
      fs.writeFileSync(filePath, buffer);
      
      receiptPdfUrl = `${CDN_BASE_URL}/withdrawals/${filename}`;
    }

    const result = await walletSvc.processWithdrawal({ 
      requestId: req.params.id, 
      adminProfileId: req.user.profileId, 
      approved: req.body.approved, 
      rejectionReason: req.body.rejection_reason, 
      payoutUtr: req.body.payout_utr, 
      payoutDate: req.body.payout_date,
      receiptPdfUrl: receiptPdfUrl,
      receiptPdfName: req.body.receipt_pdf_name
    });
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

// POST /admin/wallet/credit
router.post('/wallet/credit', async (req, res, next) => {
  try {
    const { dealer_id, amount, remarks } = req.body;
    if (!dealer_id || !amount) {
      return res.status(400).json({ error: 'dealer_id and amount are required' });
    }
    
    // Add credit to dealer's wallet
    const { data: ledgerEntry, error: ledgerError } = await supabase.from('wallet_ledger').insert({
      dealer_id,
      entry_type: 'adjustment',
      amount: parseFloat(amount),
      remarks: remarks || 'Admin Credit',
      created_by_profile_id: req.user.profileId
    }).select().single();

    if (ledgerError) throw ledgerError;

    sendSuccess(res, ledgerEntry);
  } catch (err) { next(err); }
});

// ── Settings ──────────────────────────────────────────────────────────
router.get('/settings', async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('settings').select('*').order('key');
    if (error) throw error;
    sendSuccess(res, data);
  } catch (err) { next(err); }
});

router.patch('/settings/:key', async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('settings').update({ value: req.body.value, updated_by: req.user.profileId }).eq('key', req.params.key).select().single();
    if (error) throw error;
    sendSuccess(res, data);
  } catch (err) { next(err); }
});


// ── Notifications ─────────────────────────────────────────────────────
router.get('/notifications', async (req, res, next) => {
  try {
    const notifications = await notificationSvc.listNotifications(req.user.profileId);
    sendSuccess(res, notifications);
  } catch (err) { next(err); }
});


// ── Dealer Onboarding ─────────────────────────────────────────────────

/**
 * GET /admin/dealer-onboarding
 * List dealers pending review. Also returns a total pending count for badge.
 */
router.get('/dealer-onboarding', async (req, res, next) => {
  try {
    const status = req.query.status || 'under_review';
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = parseInt(req.query.offset, 10) || 0;

    const { from, to } = req.query;
    let query = supabase
      .from('dealers')
      .select(`
        id, onboarding_status, onboarding_submitted_at, onboarding_rejection_reason,
        business_name, business_address, pan_number, gst_number, city, state, pincode,
        bank_account_name, bank_account_number, bank_ifsc, bank_name, documents,
        profiles!profile_id!inner(full_name, phone, email, created_at)
      `, { count: 'exact' })
      .eq('onboarding_status', status)
      .order('onboarding_submitted_at', { ascending: false });
      
    if (from) query = query.gte('onboarding_submitted_at', from);
    if (to) query = query.lte('onboarding_submitted_at', getEndOfDay(to));
    
    const { data: dealers, error, count } = await query.range(offset, offset + limit - 1);

    if (error) throw error;

    // Also get pending count for sidebar badge
    const { count: pendingCount } = await supabase
      .from('dealers')
      .select('*', { count: 'exact', head: true })
      .in('onboarding_status', ['under_review', 'pending']);

    sendSuccess(res, { dealers, total: count, pending_count: pendingCount });
  } catch (err) { next(err); }
});

/**
 * GET /admin/dealer-onboarding/:id
 * Get full onboarding detail for one dealer.
 */
router.get('/dealer-onboarding/:id', async (req, res, next) => {
  try {
    const { data: dealer, error } = await supabase
      .from('dealers')
      .select(`
        *, profiles!profile_id!inner(full_name, phone, email, created_at)
      `)
      .eq('id', req.params.id)
      .single();

    if (error || !dealer) return res.status(404).json({ error: 'Dealer not found' });
    sendSuccess(res, dealer);
  } catch (err) { next(err); }
});

/**
 * POST /admin/dealer-onboarding/:id/approve
 * Approve a dealer. Requires dealer_code in body.
 */
router.post('/dealer-onboarding/:id/approve', async (req, res, next) => {
  try {
    const { dealer_code } = req.body;
    if (!dealer_code) return res.status(400).json({ error: 'dealer_code is required' });

    const { data, error } = await supabase
      .from('dealers')
      .update({
        onboarding_status: 'approved',
        dealer_code,
        is_active: true,
        onboarding_reviewed_at: new Date().toISOString(),
        onboarding_reviewed_by: req.user.profileId,
        onboarding_rejection_reason: null
      })
      .eq('id', req.params.id)
      .select('id, dealer_code, onboarding_status, profile_id')
      .single();

    if (error) throw error;

    // Also activate the profile
    await supabase.from('profiles').update({ is_active: true }).eq('id', data.profile_id);

    sendSuccess(res, data);
  } catch (err) { next(err); }
});

/**
 * POST /admin/dealer-onboarding/:id/reject
 * Reject a dealer with a reason. Dealer can resubmit.
 */
router.post('/dealer-onboarding/:id/reject', async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: 'reason is required' });

    const { data, error } = await supabase
      .from('dealers')
      .update({
        onboarding_status: 'rejected',
        onboarding_rejection_reason: reason,
        onboarding_reviewed_at: new Date().toISOString(),
        onboarding_reviewed_by: req.user.profileId
      })
      .eq('id', req.params.id)
      .select('id, onboarding_status')
      .single();

    if (error) throw error;
    sendSuccess(res, data);
  } catch (err) { next(err); }
});

router.use('/wa', whatsappRoutes);


// ── Banners ────────────────────────────────────────────────────────
router.post('/banners/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const ext = path.extname(req.file.originalname) || '.png';
    const filename = `${uuidv4()}${ext}`;
    
    const absDir = path.join(CDN_LOCAL_PATH, 'banners');
    fs.mkdirSync(absDir, { recursive: true });
    fs.writeFileSync(path.join(absDir, filename), req.file.buffer);
    
    const cdnUrl = `${CDN_BASE_URL}/banners/${filename}`;
    sendSuccess(res, { cdn_url: cdnUrl });
  } catch (err) { next(err); }
});

router.get('/banners', async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('dealer_banners').select('*').order('sort_order', { ascending: true });
    if (error) throw error;
    sendSuccess(res, data || []);
  } catch (err) { next(err); }
});

router.post('/banners', async (req, res, next) => {
  try {
    const { image_url, action_link, is_active, sort_order } = req.body;
    const { data, error } = await supabase.from('dealer_banners').insert([{ image_url, action_link, is_active, sort_order }]).select().single();
    if (error) throw error;
    sendSuccess(res, data, 201);
  } catch (err) { next(err); }
});

router.put('/banners/:id', async (req, res, next) => {
  try {
    const { image_url, action_link, is_active, sort_order } = req.body;
    const { data, error } = await supabase.from('dealer_banners').update({ image_url, action_link, is_active, sort_order }).eq('id', req.params.id).select().single();
    if (error) throw error;
    sendSuccess(res, data);
  } catch (err) { next(err); }
});

router.delete('/banners/:id', async (req, res, next) => {
  try {
    const { error } = await supabase.from('dealer_banners').delete().eq('id', req.params.id);
    if (error) throw error;
    sendSuccess(res, { deleted: true });
  } catch (err) { next(err); }
});
module.exports = router;
