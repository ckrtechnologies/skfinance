'use strict';
const express = require('express');
const router = express.Router();
const { supabase } = require('../../config/database');
const { sendSuccess } = require('../../shared/utils/response');

// POST /api/lead - Receive lead from website
router.post('/lead', async (req, res, next) => {
  try {
    const { name, email, phone, city, message } = req.body;

    if (!name || (!email && !phone)) {
      return res.status(400).json({ error: 'Name and at least email or phone is required.' });
    }

    const { data, error } = await supabase
      .from('leads')
      .insert([
        {
          name,
          email,
          phone,
          city,
          message
        }
      ])
      .select();

    if (error) {
      console.error('[website/lead] Error inserting lead:', error);
      return res.status(500).json({ error: 'Failed to save your enquiry.' });
    }

    // Send email notification to owner (async, don't await so we don't block the response)
    const { sendLeadEmail } = require('../../shared/services/emailService');
    sendLeadEmail({ name, email, phone, city, message }).catch(err => {
      console.error('[website/lead] Failed to send email to owner:', err);
    });

    sendSuccess(res, { message: 'Lead saved successfully', lead: data[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
