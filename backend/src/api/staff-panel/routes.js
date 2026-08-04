'use strict';
const express = require('express');
const { authenticate, requireRole } = require('../../shared/middleware/authenticate');
const { sendSuccess, sendError } = require('../../shared/utils/response');
const authService = require('../../domains/auth/service');
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
    
    let query = supabase.from('loan_applications').select(`
      id,
      application_no,
      reference_id,
      applicant_details,
      requested_amount,
      approved_amount,
      product_type,
      status,
      current_stage,
      created_at,
      lenders(id, name)
    `, { count: 'exact' });

    // Optional: filter by assigned staff if schema supports it
    // query = query.eq('assigned_to', req.user.profileId);
    
    if (from) query = query.gte('created_at', `${from}T00:00:00.000Z`);
    if (to)   query = query.lte('created_at', `${to}T23:59:59.999Z`);
    if (status) query = query.eq('status', status);
    if (stage)  query = query.eq('current_stage', stage);

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) throw error;

    sendSuccess(res, { data, count });
  } catch (err) { next(err); }
});

router.get('/applications/:id', authenticate, requireRole(['staff', 'admin']), async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('loan_applications')
      .select('*, lenders(id, name), dealers(id, business_name)')
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    sendSuccess(res, data);
  } catch (err) { next(err); }
});

router.get('/applications/:id/stage-entries', authenticate, requireRole(['staff', 'admin']), async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('stage_entries')
      .select('*, profiles:updated_by(full_name)')
      .eq('application_id', req.params.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    sendSuccess(res, data);
  } catch (err) { next(err); }
});

router.post('/applications/:id/stage', authenticate, requireRole(['staff', 'admin']), async (req, res, next) => {
  try {
    const { stage, status, notes } = req.body;
    const { error: updateError } = await supabase
      .from('loan_applications')
      .update({ current_stage: stage, status: status || 'in_progress' })
      .eq('id', req.params.id);
      
    if (updateError) throw updateError;
    
    const { error: stageError } = await supabase
      .from('stage_entries')
      .insert({
        application_id: req.params.id,
        stage_name: stage,
        notes: notes || '',
        updated_by: req.user.profileId
      });
      
    if (stageError) throw stageError;

    sendSuccess(res, { message: 'Stage updated successfully' });
  } catch (err) { next(err); }
});

module.exports = router;
