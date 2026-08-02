'use strict';
const { Router } = require('express');
const { authenticate } = require('../../shared/middleware/authenticate');
const { roleGuard } = require('../../shared/middleware/roleGuard');
const dashCtrl   = require('./controllers/dashboard.controller');
const leadsCtrl  = require('./controllers/leads.controller');
const loanCtrl   = require('./controllers/loan-status.controller');
const commCtrl   = require('./controllers/commissions.controller');
const walletCtrl = require('./controllers/wallet.controller');
const notifCtrl  = require('./controllers/notifications.controller');
const profileCtrl = require('./controllers/profile.controller');
const { upload } = require('../../shared/utils/cdnStorage');

const router = Router();
router.use(authenticate, roleGuard('dealer'));

router.get('/dashboard', dashCtrl.dashboard);

// Leads & applications
router.post('/leads', leadsCtrl.createLead);
router.post('/applications', loanCtrl.create);
router.patch('/applications/:id', loanCtrl.update);
router.post('/applications/:id/documents', upload.single('file'), loanCtrl.uploadDoc);
router.post('/applications/:id/evaluate', loanCtrl.evaluate);
router.post('/applications/:id/submit', loanCtrl.submit);
router.get('/applications', loanCtrl.list);
router.get('/applications/:id', loanCtrl.getOne);

// Commissions
router.get('/commissions', commCtrl.list);

// Wallet
router.get('/wallet', walletCtrl.getWallet);
router.post('/wallet/withdrawal-requests', walletCtrl.createWithdrawal);
router.get('/wallet/withdrawal-requests', walletCtrl.listWithdrawals);

// Notifications + profile
router.get('/notifications', notifCtrl.list);
router.post('/notifications/:id/read', notifCtrl.markRead);
router.get('/profile', profileCtrl.get);
router.patch('/profile', profileCtrl.update);

module.exports = router;
