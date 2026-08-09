const express = require('express');
const multer = require('multer');
const { syncTemplates, getCachedTemplates, getTemplateById } = require('./template.service');
const { uploadMedia, getMediaList } = require('./media.service');
const { createCampaign, enqueueCampaign, cancelCampaign } = require('./campaign.service');
const { processWebhook } = require('./webhook.service');

const router = express.Router();

// Multer config for media uploads (in memory buffer for forwarding to WA and Supabase)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB limit based on WA docs
});

// --- TEMPLATES ---
router.get('/templates', async (req, res) => {
  try {
    const filters = {
      category: req.query.category,
      status: req.query.status
    };
    const data = await getCachedTemplates(filters);
    res.json({ success: true, data });
  } catch (err) {
    console.error('[WhatsApp Router] GET /templates error', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/templates/sync', async (req, res) => {
  try {
    const result = await syncTemplates();
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[WhatsApp Router] POST /templates/sync error', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/templates/:id', async (req, res) => {
  try {
    const data = await getTemplateById(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    res.status(404).json({ success: false, error: 'Template not found' });
  }
});

// --- MEDIA ---
router.post('/media', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'File is required' });
    }
    // Assumes user info is set by auth middleware, e.g. req.user.id
    const userId = req.user ? req.user.id : null; 
    const result = await uploadMedia(req.file, userId);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    console.error('[WhatsApp Router] POST /media error', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/media', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const result = await getMediaList(page, limit);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- CAMPAIGNS ---
router.post('/campaigns', async (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;
    const campaign = await createCampaign(req.body, userId);
    res.status(201).json({ success: true, data: campaign });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/campaigns/:id/send', async (req, res) => {
  try {
    const result = await enqueueCampaign(req.params.id);
    res.status(202).json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/campaigns/:id/cancel', async (req, res) => {
  try {
    const result = await cancelCampaign(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// --- WEBHOOK ---
// Usually this is unauthenticated but verified via some shared secret or token
// We'll leave the security layer to the main app's middlewares, if configured.
router.post('/webhook', async (req, res) => {
  try {
    await processWebhook(req.body);
    // WhatsApp requires a 200 OK immediately
    res.status(200).send('EVENT_RECEIVED');
  } catch (err) {
    console.error('[WhatsApp Webhook] Processing error', err);
    // Don't leak internals to Meta, just say ok so they stop retrying if it's fatal
    res.status(200).send('EVENT_RECEIVED');
  }
});

// Webhook Verification (WhatsApp uses GET with hub.challenge)
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  // Optional: check token if process.env.WA_WEBHOOK_TOKEN is set
  if (mode === 'subscribe') {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

module.exports = router;
