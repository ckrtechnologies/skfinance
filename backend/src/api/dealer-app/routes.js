'use strict';
const express = require('express');
const { authenticate }  = require('../../shared/middleware/authenticate');
const { roleGuard }     = require('../../shared/middleware/roleGuard');
const { sendSuccess }   = require('../../shared/utils/response');
const loanSvc           = require('../../domains/loan-applications/service');
const walletSvc         = require('../../domains/wallet/service');
const notificationSvc   = require('../../domains/notifications/service');
const { supabase }      = require('../../config/database');

const router = express.Router();
router.use(authenticate, roleGuard(['dealer']));

// GET /dealer/profile
router.get('/profile', async (req, res, next) => {
  try {
    const { data } = await supabase.from('dealers').select('*').eq('profile_id', req.user.profileId).single();
    sendSuccess(res, data);
  } catch (err) { next(err); }
});

// GET /dealer/applications
router.get('/applications', async (req, res, next) => {
  try {
    const { data: dealer } = await supabase.from('dealers').select('id').eq('profile_id', req.user.profileId).single();
    const result = await loanSvc.listApplications({ dealerId: dealer.id, status: req.query.status, stage: req.query.stage });
    sendSuccess(res, result);
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
