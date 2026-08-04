'use strict';
const express = require('express');
const { authenticate } = require('../../shared/middleware/authenticate');
const { roleGuard }    = require('../../shared/middleware/roleGuard');
const { sendSuccess, sendError } = require('../../shared/utils/response');
const loanSvc          = require('../../domains/loan-applications/service');
const walletSvc        = require('../../domains/wallet/service');
const lendersAdminSvc  = require('../../domains/lenders-admin/service');
const notificationSvc  = require('../../domains/notifications/service');
const registry         = require('../../domains/lenders/registry');
const { supabase }     = require('../../config/database');

const router = express.Router();
router.use(authenticate, roleGuard(['admin']));

// ── Dashboard ────────────────────────────────────────────────────────
router.get('/dashboard', async (req, res, next) => {
  try {
    const [{ count: total }, { count: approved }, { count: disbursed }] = await Promise.all([
      supabase.from('loan_applications').select('*', { count: 'exact', head: true }),
      supabase.from('loan_applications').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase.from('loan_applications').select('*', { count: 'exact', head: true }).eq('status', 'disbursed'),
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

router.patch('/lenders/:id', async (req, res, next) => {
  try {
    // Reject any fields other than is_active and priority
    const { is_active, priority, ...rest } = req.body;
    if (Object.keys(rest).length > 0) {
      return sendError(res, 400, 'VALIDATION_ERROR', `Only 'is_active' and 'priority' fields are updatable. Received unexpected fields: ${Object.keys(rest).join(', ')}`);
    }
    const updated = await lendersAdminSvc.updateLender(req.params.id, { is_active, priority });
    sendSuccess(res, updated);
  } catch (err) { next(err); }
});

// GET /admin/lenders/:code/rules — read-only rules reference (A6)
router.get('/lenders/:code/rules', (req, res, next) => {
  try {
    const mod = registry.getModule(req.params.code);
    sendSuccess(res, mod.getRulesSummary());
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
    const { full_name, phone, ...dealerFields } = req.body;
    const dealer_code = `DLR-${Date.now()}`;
    // Create auth user
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({ phone, phone_confirm: true });
    if (authErr) throw authErr;
    // Create profile
    const { data: profile, error: profErr } = await supabase.from('profiles').insert({ auth_user_id: authData.user.id, role: 'dealer', full_name, phone }).select().single();
    if (profErr) throw profErr;
    // Create dealer
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
    const { full_name, email, password, ...staffFields } = req.body;
    const staff_code = `STF-${Date.now()}`;
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
    if (authErr) throw authErr;
    const { data: profile, error: profErr } = await supabase.from('profiles').insert({ auth_user_id: authData.user.id, role: 'staff', full_name, email }).select().single();
    if (profErr) throw profErr;
    const { data: staffRow, error: staffErr } = await supabase.from('staff').insert({ profile_id: profile.id, staff_code, ...staffFields }).select().single();
    if (staffErr) throw staffErr;
    sendSuccess(res, staffRow, 201);
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

// ── Audit Log ─────────────────────────────────────────────────────────
router.get('/audit-log', async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('audit_log').select('*, profiles(full_name)').order('created_at', { ascending: false }).limit(100);
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
