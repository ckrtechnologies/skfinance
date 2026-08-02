'use strict';
const { Router } = require('express');
const { authenticate } = require('../../shared/middleware/authenticate');
const ctrl = require('./controllers/auth.controller');

const router = Router();

// Public — no auth required
router.post('/otp/request', ctrl.requestOtp);
router.post('/otp/verify', ctrl.verifyOtp);
router.post('/login', ctrl.login);

// Authenticated
router.post('/logout', authenticate, ctrl.logout);
router.get('/me', authenticate, ctrl.me);
router.patch('/profile', authenticate, ctrl.updateProfile);

module.exports = router;
