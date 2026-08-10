'use strict';
const express = require('express');
const { authenticate, requireRole } = require('../../shared/middleware/authenticate');
const { sendSuccess, sendError } = require('../../shared/utils/response');
const authService = require('../../domains/auth/service');
const loanSvc = require('../../domains/loan-applications/service');
const { supabase } = require('../../config/database');
const multer = require('multer');
const upload = multer({ dest: '/tmp' });
const { orchestrate } = require('../../domains/eligibility-engine/orchestrator');

const router = express.Router();

// ── Auth ────────────────────────────────────────────────────────
router.post('/auth/login', async (req, res, next) => {
  try {
    const result = await authService.loginWithPassword(req.body);
    // Extra guard: only allow staff/admin to use the staff mobile app
    if (!['staff', 'admin'].includes(result.profile.role)) {
      throw Object.assign(new Error('Access denied. Staff only.'), { statusCode: 403 });
    }
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

router.get('/auth/me', authenticate, requireRole(['staff', 'admin']), async (req, res, next) => {
  try {
    const profile = await authService.getMe(req.user.profileId);
    sendSuccess(res, profile);
  } catch (err) { next(err); }
});

router.get('/profile', authenticate, requireRole(['staff', 'admin']), async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('staff')
      .select('*, profiles!staff_profile_id_fkey(avatar_url, full_name, phone, email)')
      .eq('profile_id', req.user.profileId)
      .single();
      
    if (error) throw error;
    sendSuccess(res, data);
  } catch (err) { next(err); }
});

router.put('/profile', authenticate, requireRole(['staff', 'admin']), async (req, res, next) => {
  try {
    const result = await authService.updateProfile(req.user.profileId, req.user.role, req.body);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

router.post('/profile/avatar', authenticate, requireRole(['staff', 'admin']), upload.single('avatar'), async (req, res, next) => {
  try {
    const result = await authService.uploadAvatar(req.user.profileId, req.file);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

router.delete('/profile', authenticate, requireRole(['staff', 'admin']), async (req, res, next) => {
  try {
    const result = await authService.softDeleteProfile(req.user.profileId);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

// ── Dashboard ────────────────────────────────────────────────────
router.get('/dashboard', authenticate, requireRole(['staff', 'admin']), async (req, res, next) => {
  try {
    const { data: staffData } = await supabase.from('staff').select('id').eq('profile_id', req.user.profileId).maybeSingle();
    const staffId = staffData?.id;

    let query = supabase.from('loan_applications').select('*', { count: 'exact', head: true });
    
    // Filter by assigned staff unless admin
    if (staffId && req.user.role !== 'admin') {
      const { data: assignedApps } = await supabase.from('loan_application_assignees').select('loan_application_id').eq('staff_id', staffId);
      const appIds = assignedApps.map(a => a.loan_application_id);
      if (appIds.length > 0) {
        query = query.in('id', appIds);
      } else {
        return sendSuccess(res, {
          totalApplications: 0,
          pendingAction: 0,
          approved: 0,
          disbursed: 0
        });
      }
    }

    const getAppIds = async () => staffId && req.user.role !== 'admin' ? ((await supabase.from('loan_application_assignees').select('loan_application_id').eq('staff_id', staffId)).data || []).map(a => a.loan_application_id) : [];

    const appIds = await getAppIds();

    const qPending = supabase.from('loan_applications').select('*', { count: 'exact', head: true })
        .not('status', 'in', '("approved","disbursed","rejected")');
    if (appIds.length) qPending.in('id', appIds);

    const qApproved = supabase.from('loan_applications').select('*', { count: 'exact', head: true })
        .eq('status', 'approved');
    if (appIds.length) qApproved.in('id', appIds);

    const qDisbursed = supabase.from('loan_applications').select('*', { count: 'exact', head: true })
        .eq('status', 'disbursed');
    if (appIds.length) qDisbursed.in('id', appIds);

    const [total, pending, approved, disbursed] = await Promise.all([
      query.then(r => r.count || 0),
      qPending.then(r => r.count || 0),
      qApproved.then(r => r.count || 0),
      qDisbursed.then(r => r.count || 0)
    ]);

    sendSuccess(res, {
      totalApplications: total,
      pendingAction: pending,
      approved,
      disbursed
    });
  } catch (err) { next(err); }
});

// ── Applications ───────────────────────────────────────────────
router.post('/applications/cibil/fetch', authenticate, requireRole(['staff', 'admin']), async (req, res, next) => {
  try {
    const { pan_number } = req.body;
    if (!pan_number) {
      return res.status(400).json({ error: 'pan_number is required to fetch CIBIL' });
    }

    // Simulate API delay
    await new Promise(r => setTimeout(r, 1500));

    // Generate a random score between 600 and 850
    const score = Math.floor(Math.random() * (850 - 600 + 1)) + 600;

    sendSuccess(res, {
      pan_number,
      score,
      status: score >= 700 ? 'Excellent' : score >= 650 ? 'Good' : 'Average',
      report_url: 'https://cibil.com/sample-report.pdf'
    });
  } catch (err) { next(err); }
});

router.post('/pre-check', authenticate, requireRole(['staff', 'admin']), async (req, res, next) => {
  try {
    const results = await orchestrate(req.body, { stage: 'pre_check' });
    sendSuccess(res, results);
  } catch (err) { next(err); }
});

router.get('/applications', authenticate, requireRole(['staff', 'admin']), async (req, res, next) => {
  try {
    const { startDate, endDate, status, stage, limit = 20, offset = 0 } = req.query;

    const { data: staffData } = await supabase.from('staff').select('id').eq('profile_id', req.user.profileId).maybeSingle();
    const staffId = staffData?.id;

    let query = supabase.from('loan_applications').select(`
      *,
      customers(*, profiles!profile_id(full_name, phone)),
      assignees:loan_application_assignees!inner(staff_id)
    `, { count: 'exact' });

    if (staffId && req.user.role !== 'admin') {
      query = query.eq('loan_application_assignees.staff_id', staffId);
    }

    if (startDate) {
      const parsedStart = startDate.includes('T') ? startDate.split('T')[0] : startDate;
      query = query.gte('created_at', `${parsedStart}T00:00:00.000Z`);
    }
    if (endDate) {
      const parsedEnd = endDate.includes('T') ? endDate.split('T')[0] : endDate;
      query = query.lte('created_at', `${parsedEnd}T23:59:59.999Z`);
    }
    if (status) query = query.eq('status', status);
    if (stage) query = query.eq('current_stage', stage);

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) throw error;

    sendSuccess(res, { data, count });
  } catch (err) { next(err); }
});

// ── Banners ──────────────────────────────────────────────────────
router.get('/banners', async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('dealer_banners').select('*').eq('is_active', true).order('sort_order', { ascending: true });
    if (error) throw error;
    sendSuccess(res, data);
  } catch (err) { next(err); }
});

router.post('/applications', authenticate, requireRole(['staff', 'admin']), async (req, res, next) => {
  try {
    // Override dealerId to null since staff is creating this
    const result = await loanSvc.createApplication(null, req.body);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

router.get('/applications/:id', authenticate, requireRole(['staff', 'admin']), async (req, res, next) => {
  try {
    const app = await loanSvc.getApplication(req.params.id);
    
    if (req.user.role !== 'admin') {
      const { data: staffData } = await supabase.from('staff').select('id').eq('profile_id', req.user.profileId).maybeSingle();
      const isAssigned = app.assignees?.some(a => a.staff_id === staffData?.id || a.staff?.id === staffData?.id);
      if (!isAssigned) {
         throw Object.assign(new Error('Access denied. This application is not assigned to you.'), { statusCode: 403 });
      }
    }
    
    sendSuccess(res, app);
  } catch (err) { next(err); }
});

router.post('/applications/:id/documents', authenticate, requireRole(['staff', 'admin']), async (req, res, next) => {
  try {
    const result = await loanSvc.addDocument(req.params.id, req.body);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

router.get('/applications/:id/stage-entries', authenticate, requireRole(['staff', 'admin']), async (req, res, next) => {
  try {
    const entries = await loanSvc.getStageEntries(req.params.id);
    sendSuccess(res, entries);
  } catch (err) { next(err); }
});

module.exports = router;
