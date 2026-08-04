'use strict';
const express = require('express');
const { authenticate } = require('../../shared/middleware/authenticate');
const { roleGuard }    = require('../../shared/middleware/roleGuard');
const { sendSuccess, sendError } = require('../../shared/utils/response');
const loanSvc          = require('../../domains/loan-applications/service');
const walletSvc        = require('../../domains/wallet/service');
const lendersAdminSvc  = require('../../domains/lenders-admin/service');
const notificationSvc  = require('../../domains/notifications/service');
const { supabase }     = require('../../config/database');

const router = express.Router();
router.use(authenticate, roleGuard(['admin']));

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
      const toDate = new Date(req.query.to);
      toDate.setUTCHours(23, 59, 59, 999);
      const toISO = toDate.toISOString();
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
    const result = await loanSvc.listApplications({ status: req.query.status, stage: req.query.stage, limit: Number(req.query.limit) || 20, offset: Number(req.query.offset) || 0 });
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
    const { name, code, lender_type, priority } = req.body;
    if (!name || !code) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Name and Code are required');
    }
    const lender = await lendersAdminSvc.createLender({ name, code, lender_type, priority });
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
    const { data, error } = await supabase.from('dealers').select('*, profiles(full_name, phone, email, is_active)').order('created_at', { ascending: false });
    if (error) throw error;
    sendSuccess(res, data);
  } catch (err) { next(err); }
});

router.post('/dealers', async (req, res, next) => {
  try {
    const { business_name, phone, email, ...dealerFields } = req.body;
    const dealer_code = `DLR-${Date.now()}`;
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({ phone, phone_confirm: true });
    if (authErr) throw authErr;
    const { data: profile, error: profErr } = await supabase.from('profiles')
      .upsert({ auth_user_id: authData.user.id, role: 'dealer', full_name: business_name, phone, email }, { onConflict: 'auth_user_id' })
      .select().single();
    if (profErr) throw profErr;
    const { data: dealer, error: dealErr } = await supabase.from('dealers').insert({ profile_id: profile.id, dealer_code, ...dealerFields }).select().single();
    if (dealErr) throw dealErr;
    sendSuccess(res, dealer, 201);
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
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
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

// ── Commissions & Payouts ─────────────────────────────────────────────
router.get('/commissions', async (req, res, next) => {
  try {
    const commissions = await walletSvc.listAllCommissions();
    sendSuccess(res, commissions);
  } catch (err) { next(err); }
});

router.get('/withdrawal-requests', async (req, res, next) => {
  try {
    const wrs = await walletSvc.listAllWithdrawals();
    sendSuccess(res, wrs);
  } catch (err) { next(err); }
});

router.post('/withdrawal-requests/:id/process', async (req, res, next) => {
  try {
    const result = await walletSvc.processWithdrawal({ requestId: req.params.id, adminProfileId: req.user.profileId, approved: req.body.approved, rejectionReason: req.body.rejection_reason, payoutUtr: req.body.payout_utr, payoutDate: req.body.payout_date });
    sendSuccess(res, result);
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

module.exports = router;
