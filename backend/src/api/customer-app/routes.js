'use strict';
const { Router } = require('express');
const { authenticate } = require('../../shared/middleware/authenticate');
const { roleGuard } = require('../../shared/middleware/roleGuard');
const eligCtrl = require('./controllers/eligibility.controller');
const loanCtrl = require('./controllers/loan-application.controller');
const docCtrl  = require('./controllers/documents.controller');
const notifCtrl = require('./controllers/notifications.controller');
const profileCtrl = require('./controllers/profile.controller');
const { upload } = require('../../shared/utils/cdnStorage');

const router = Router();
router.use(authenticate, roleGuard('customer'));

// Eligibility
router.post('/eligibility/pre-check', eligCtrl.preCheck);
router.post('/applications/:id/evaluate', eligCtrl.fullEvaluate);

// Applications
router.post('/applications', loanCtrl.create);
router.patch('/applications/:id', loanCtrl.update);
router.get('/applications', loanCtrl.list);
router.get('/applications/:id', loanCtrl.getOne);
router.post('/applications/:id/submit', loanCtrl.submit);
router.get('/applications/:id/checklist', docCtrl.checklist);

// Documents
router.post('/applications/:id/documents', upload.single('file'), docCtrl.upload);

// Notifications
router.get('/notifications', notifCtrl.list);
router.post('/notifications/:id/read', notifCtrl.markRead);

// Profile
router.get('/profile', profileCtrl.get);
router.patch('/profile', profileCtrl.update);

module.exports = router;
