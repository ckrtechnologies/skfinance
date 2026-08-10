'use strict';
const express = require('express');
const { authenticate, requireRole } = require('../../shared/middleware/authenticate');
const { sendSuccess, sendError } = require('../../shared/utils/response');
const authService = require('../../domains/auth/service');
const loanSvc = require('../../domains/loan-applications/service');
const { generateMergedDocumentPdf } = require('../../domains/loan-applications/documentExportService');
const { supabase } = require('../../config/database');

const router = express.Router();

// ── Auth ────────────────────────────────────────────────────────
router.post('/auth/login', async (req, res, next) => {
  try {
    const result = await authService.loginWithPassword(req.body);
    // Extra guard: only allow staff/admin to use staff panel
    if (!['staff', 'admin'].includes(result.profile.role)) {
      throw Object.assign(new Error('Access denied. Staff only.'), { statusCode: 403 });
    }
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

router.get('/auth/me', authenticate, async (req, res, next) => {
  try {
    const profile = await authService.getMe(req.user.profileId);
    sendSuccess(res, profile);
  } catch (err) { next(err); }
});

router.post('/auth/change-password', authenticate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await authService.changePassword({
      authUserId: req.user.authUserId,
      currentPassword,
      newPassword
    });
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

// ── Applications ───────────────────────────────────────────────
router.get('/applications', authenticate, requireRole(['staff', 'admin']), async (req, res, next) => {
  try {
    // For staff panel, list applications assigned to this staff or general if allowed
    const { from, to, status, stage, limit = 20, offset = 0 } = req.query;

    // Get the staff_id for the current user
    const { data: staffData } = await supabase.from('staff').select('id').eq('profile_id', req.user.profileId).maybeSingle();
    const staffId = staffData?.id;

    let query = supabase.from('loan_applications').select(`
      *,
      customers(*, profiles!profile_id(full_name, phone, email)),
      dealers(*, profiles!profile_id(full_name, phone)),
      staff:staff!staff_id(*, profiles!profile_id(full_name, phone)),
      assignees:loan_application_assignees!inner(staff_id, staff:staff_id(*, profiles!profile_id(full_name))),
      lenders(id, name)
    `, { count: 'exact' });

    // Restrict to ONLY applications assigned to this staff member
    if (staffId && req.user.role !== 'admin') {
      query = query.eq('loan_application_assignees.staff_id', staffId);
    } else {
      // For admin or no specific staff filter, use a standard join
      query = supabase.from('loan_applications').select(`
        *,
        customers(*, profiles!profile_id(full_name, phone, email)),
        dealers(*, profiles!profile_id(full_name, phone)),
        staff:staff!staff_id(*, profiles!profile_id(full_name, phone)),
        assignees:loan_application_assignees(staff:staff_id(*, profiles!profile_id(full_name))),
        lenders(id, name)
      `, { count: 'exact' });
    }

    if (from) query = query.gte('created_at', `${from}T00:00:00.000Z`);
    if (to) query = query.lte('created_at', `${to}T23:59:59.999Z`);
    if (status) query = query.eq('status', status);
    if (stage) query = query.eq('current_stage', stage);

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) throw error;

    sendSuccess(res, { data, count });
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

router.get('/applications/:id/stage-entries', authenticate, requireRole(['staff', 'admin']), async (req, res, next) => {
  try {
    const entries = await loanSvc.getStageEntries(req.params.id);
    sendSuccess(res, entries);
  } catch (err) { next(err); }
});

router.post('/applications/:id/stage', authenticate, requireRole(['staff', 'admin']), async (req, res, next) => {
  try {
    const { stage, status, notes } = req.body;
    const entry = await loanSvc.addStageEntry({
      loanApplicationId: req.params.id,
      stage: stage,
      enteredByProfileId: req.user.profileId,
      outcome: status || 'pending',
      remarks: notes || '',
      newStatus: status || 'in_progress'
    });
    sendSuccess(res, { message: 'Stage updated successfully', data: entry });
  } catch (err) { next(err); }
});

router.get('/applications/:id/export-documents', authenticate, requireRole(['staff', 'admin']), async (req, res, next) => {
  try {
    const pdfBuffer = await generateMergedDocumentPdf(req.params.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Application_${req.params.id}_Documents.pdf"`);
    res.send(pdfBuffer);
  } catch (err) { next(err); }
});

router.patch('/documents/:doc_id/verify', authenticate, requireRole(['staff', 'admin']), async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('documents')
      .update({ verified: true, updated_at: new Date().toISOString() })
      .eq('id', req.params.doc_id)
      .select()
      .single();
    if (error) throw error;
    sendSuccess(res, data);
  } catch (err) { next(err); }
});

router.post('/applications/:id/disburse', authenticate, requireRole(['staff', 'admin']), async (req, res, next) => {
  try {
    const result = await loanSvc.disburseLoan({ 
      loanApplicationId: req.params.id, 
      adminProfileId: req.user.profileId, 
      disbursedAmount: req.body.disbursed_amount, 
      remarks: req.body.utr_number ? `UTR: ${req.body.utr_number}` : '', 
      stageData: { utr: req.body.utr_number }, 
      ninetyDayDays: 90 
    });
    sendSuccess(res, result);
  } catch (err) { next(err); }
});


router.get('/lenders', authenticate, requireRole(['staff', 'admin']), async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('lenders')
      .select('*')
      .eq('is_active', true)
      .order('name');
    if (error) throw error;
    sendSuccess(res, data);
  } catch (err) { next(err); }
});

module.exports = router;
