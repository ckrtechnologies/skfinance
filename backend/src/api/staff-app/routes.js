'use strict';
const express = require('express');
const { authenticate } = require('../../shared/middleware/authenticate');
const { roleGuard }    = require('../../shared/middleware/roleGuard');
const { sendSuccess }  = require('../../shared/utils/response');
const loanSvc          = require('../../domains/loan-applications/service');
const notificationSvc  = require('../../domains/notifications/service');
const { supabase }     = require('../../config/database');

const router = express.Router();
router.use(authenticate, roleGuard(['staff']));

// GET /staff-app/profile
router.get('/profile', async (req, res, next) => {
  try {
    const { data } = await supabase.from('staff').select('*').eq('profile_id', req.user.profileId).single();
    sendSuccess(res, data);
  } catch (err) { next(err); }
});

// GET /staff-app/applications
router.get('/applications', async (req, res, next) => {
  try {
    const { data: staffMember } = await supabase.from('staff').select('id').eq('profile_id', req.user.profileId).single();
    const result = await loanSvc.listApplications({ staffId: staffMember.id, status: req.query.status, stage: req.query.stage });
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

// GET /staff-app/applications/:id
router.get('/applications/:id', async (req, res, next) => {
  try {
    const app = await loanSvc.getApplication(req.params.id);
    sendSuccess(res, app);
  } catch (err) { next(err); }
});

// GET /staff-app/applications/:id/stage-entries
router.get('/applications/:id/stage-entries', async (req, res, next) => {
  try {
    const entries = await loanSvc.getStageEntries(req.params.id);
    sendSuccess(res, entries);
  } catch (err) { next(err); }
});

// GET /staff-app/notifications
router.get('/notifications', async (req, res, next) => {
  try {
    const notifications = await notificationSvc.listNotifications(req.user.profileId);
    sendSuccess(res, notifications);
  } catch (err) { next(err); }
});

module.exports = router;
