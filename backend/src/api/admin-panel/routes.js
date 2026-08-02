'use strict';
const { Router } = require('express');
const { authenticate } = require('../../shared/middleware/authenticate');
const { roleGuard } = require('../../shared/middleware/roleGuard');
const dashCtrl   = require('./controllers/dashboard.controller');
const lendCtrl   = require('./controllers/lenders.controller');
const polCtrl    = require('./controllers/policies.controller');
const loanCtrl   = require('./controllers/loan-files.controller');
const commCtrl   = require('./controllers/commissions.controller');
const payCtrl    = require('./controllers/payouts.controller');
const dealCtrl   = require('./controllers/dealers.controller');
const staffCtrl  = require('./controllers/staff.controller');
const settCtrl   = require('./controllers/settings.controller');
const auditCtrl  = require('./controllers/audit-log.controller');
const notifCtrl  = require('./controllers/notifications.controller');

const router = Router();
router.use(authenticate, roleGuard('admin'));

// Dashboard
router.get('/dashboard', dashCtrl.dashboard);

// Lenders
router.get('/lenders', lendCtrl.listLenders);
router.post('/lenders', lendCtrl.createLender);
router.patch('/lenders/:id', lendCtrl.updateLender);
router.get('/lenders/:id/policies', polCtrl.listPolicies);
router.post('/lenders/:id/policies', polCtrl.createPolicy);

// Policies (standalone operations)
router.get('/policies/:id', polCtrl.getPolicy);
router.patch('/policies/:id', polCtrl.updatePolicy);
router.post('/policies/:id/publish', polCtrl.publishPolicy);
router.get('/policies/:id/preview', polCtrl.previewPolicy);

// Loan files
router.get('/applications', loanCtrl.list);
router.get('/applications/:id', loanCtrl.getOne);
router.post('/applications/:id/stage-entries', loanCtrl.appendStageEntry);
router.post('/applications/:id/disburse', loanCtrl.disburse);
router.post('/applications/:id/re-approve', loanCtrl.reApprove);

// Commissions
router.get('/commissions', commCtrl.list);

// Payouts / Wallet
router.get('/withdrawal-requests', payCtrl.listWithdrawalRequests);
router.post('/withdrawal-requests/:id/process', payCtrl.processWithdrawal);
router.post('/wallet-adjustments', payCtrl.addAdjustment);

// Dealers
router.get('/dealers', dealCtrl.list);
router.post('/dealers', dealCtrl.create);
router.get('/dealers/:id', dealCtrl.getOne);
router.patch('/dealers/:id', dealCtrl.update);

// Staff
router.get('/staff', staffCtrl.list);
router.post('/staff', staffCtrl.create);
router.patch('/staff/:id', staffCtrl.update);

// Settings
router.get('/settings', settCtrl.list);
router.patch('/settings/:key', settCtrl.update);

// Audit log
router.get('/audit-log', auditCtrl.list);

// Notifications
router.get('/notifications', notifCtrl.list);
router.post('/notifications/:id/read', notifCtrl.markRead);

module.exports = router;
