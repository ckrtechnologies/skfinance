'use strict';
const express = require('express');
const { authenticate } = require('../../shared/middleware/authenticate');
const { sendSuccess, sendError } = require('../../shared/utils/response');
const authService = require('../../domains/auth/service');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const router = express.Router();

// POST /auth/login — admin email+password login
router.post('/login', async (req, res, next) => {
  try {
    const { token, profile } = await authService.loginWithPassword(req.body);
    sendSuccess(res, { token, profile });
  } catch (err) { next(err); }
});

router.post('/fix-profile', async (req, res, next) => {
  try {
    const { supabase } = require('../../config/database');
    const { data, error } = await supabase.from('profiles').update({ is_active: true }).eq('full_name', 'd1').select();
    res.json({ data, error });
  } catch (err) { next(err); }
});

// POST /auth/otp/request — customer/dealer OTP request
router.post('/otp/request', async (req, res, next) => {
  try {
    const result = await authService.requestOtp(req.body);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

// POST /auth/otp/verify — verify OTP and get JWT
router.post('/otp/verify', async (req, res, next) => {
  try {
    const result = await authService.verifyOtp(req.body);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

// GET /auth/me — return current profile
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const profile = await authService.getMe(req.user.profileId);
    sendSuccess(res, profile);
  } catch (err) { next(err); }
});

// PUT /auth/me — update current profile
router.put('/me', authenticate, async (req, res, next) => {
  try {
    const result = await authService.updateProfile(req.user.profileId, req.user.role, req.body);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

// POST /auth/me/avatar — upload avatar image
router.post('/me/avatar', authenticate, upload.single('avatar'), async (req, res, next) => {
  try {
    const result = await authService.uploadAvatar(req.user.profileId, req.file);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

// DELETE /auth/me — deactivate current account
router.delete('/me', authenticate, async (req, res, next) => {
  try {
    const result = await authService.softDeleteProfile(req.user.profileId);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

// POST /auth/change-password — change current user password
router.post('/change-password', authenticate, async (req, res, next) => {
  try {
    console.log("req.user in change-password:", req.user);
    const { currentPassword, newPassword } = req.body;
    const result = await authService.changePassword({ 
      authUserId: req.user.authUserId, 
      currentPassword, 
      newPassword 
    });
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

module.exports = router;
