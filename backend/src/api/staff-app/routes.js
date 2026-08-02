'use strict';
// Staff App routes — IDENTICAL contract to staff-panel but separate mount point
// No commission or wallet routes exist here (L8 — enforced by absence)
const { Router } = require('express');
const { authenticate } = require('../../shared/middleware/authenticate');
const { roleGuard } = require('../../shared/middleware/roleGuard');
const dashCtrl   = require('./controllers/dashboard.controller');
const leadsCtrl  = require('./controllers/leads.controller');
const loanCtrl   = require('./controllers/loan-status.controller');
const perfCtrl   = require('./controllers/performance.controller');
const notifCtrl  = require('./controllers/notifications.controller');
const profileCtrl = require('./controllers/profile.controller');
const { upload } = require('../../shared/utils/cdnStorage');

const router = Router();
router.use(authenticate, roleGuard('staff'));

router.get('/dashboard', dashCtrl.dashboard);

// Leads & applications
router.post('/leads', leadsCtrl.createLead);
router.post('/applications', loanCtrl.create);
router.patch('/applications/:id', loanCtrl.update);
router.post('/applications/:id/documents', upload.single('file'), loanCtrl.uploadDoc);
router.post('/applications/:id/evaluate', loanCtrl.evaluate);
router.post('/applications/:id/submit', loanCtrl.submit);
router.post('/applications/:id/stage-entries', loanCtrl.appendStageEntry);
router.get('/applications', loanCtrl.list);
router.get('/applications/:id', loanCtrl.getOne);

// Performance (no commission/wallet — L8)
router.get('/performance', perfCtrl.getPerformance);

// Notifications + profile
router.get('/notifications', notifCtrl.list);
router.post('/notifications/:id/read', notifCtrl.markRead);
router.get('/profile', profileCtrl.get);
router.patch('/profile', profileCtrl.update);

module.exports = router;
