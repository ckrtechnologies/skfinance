'use strict';
const express = require('express');
const { authenticate } = require('../../shared/middleware/authenticate');
const { sendSuccess, sendError } = require('../../shared/utils/response');
const digilockerService = require('../../domains/digilocker/service');

const router = express.Router();

// GET /digilocker/auth-url
// Returns { url, client_token, state }
router.get('/auth-url', authenticate, async (req, res, next) => {
  try {
    const result = await digilockerService.getAuthUrl();
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

// POST /digilocker/process
// Body requires: { client_token, state, application_no }
// Fetches user documents, saves to CDN and DB
router.post('/process', authenticate, async (req, res, next) => {
  try {
    const { client_token, state, application_no } = req.body;
    
    if (!client_token || !state || !application_no) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'client_token, state, and application_no are required.');
    }

    const result = await digilockerService.processDigilockerData(
      client_token,
      state,
      application_no,
      req.user.profileId
    );
    
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

module.exports = router;
