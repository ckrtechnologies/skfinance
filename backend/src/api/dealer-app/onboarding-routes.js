'use strict';
const express  = require('express');
const multer   = require('multer');
const { authenticate }  = require('../../shared/middleware/authenticate');
const { roleGuard }     = require('../../shared/middleware/roleGuard');
const { sendSuccess }   = require('../../shared/utils/response');
const { supabase }      = require('../../config/database');
const { saveToCdn }     = require('../../shared/utils/cdnStorage');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
const router = express.Router();
router.use(authenticate, roleGuard(['dealer']));

/**
 * GET /dealer/onboarding/status
 * Returns the dealer's current onboarding status + submitted data.
 */
router.get('/status', async (req, res, next) => {
  try {
    const { data: dealer, error } = await supabase
      .from('dealers')
      .select('id, onboarding_status, onboarding_submitted_at, onboarding_rejection_reason, business_name, business_address, pan_number, gst_number, city, state, pincode, bank_account_name, bank_account_number, bank_ifsc, bank_name, documents, location, profiles!profile_id(full_name)')
      .eq('profile_id', req.user.profileId)
      .maybeSingle();

    if (error || !dealer) {
      // No dealer row yet (edge case), report pending
      return sendSuccess(res, { onboarding_status: 'pending' });
    }
    
    // Convert PostGIS geography format back to lat/lng for frontend compatibility
    if (dealer.location) {
      if (typeof dealer.location === 'object' && dealer.location.coordinates) {
        dealer.longitude = dealer.location.coordinates[0];
        dealer.latitude = dealer.location.coordinates[1];
      } else if (typeof dealer.location === 'string' && dealer.location.startsWith('POINT')) {
        const match = dealer.location.match(/POINT\(([^ ]+)\s+([^ ]+)\)/);
        if (match) {
          dealer.longitude = parseFloat(match[1]);
          dealer.latitude = parseFloat(match[2]);
        }
      }
    }
    delete dealer.location;

    sendSuccess(res, dealer);
  } catch (err) { next(err); }
});

/**
 * POST /dealer/onboarding/upload-doc
 * Upload a single document. Returns the CDN URL.
 * Body (multipart): file, doc_type (pan|gst|aadhar|shop_photo)
 */
router.post('/upload-doc', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    const { doc_type } = req.body;
    if (!doc_type) return res.status(400).json({ error: 'doc_type is required' });

    // Get dealer id for folder path
    const { data: dealer } = await supabase
      .from('dealers')
      .select('id')
      .eq('profile_id', req.user.profileId)
      .maybeSingle();

    const dealerId = dealer?.id || req.user.profileId;
    const { cdn_url } = saveToCdn(req.file, `dealers/${dealerId}/kyc`, 'dealer', doc_type);
    sendSuccess(res, { url: cdn_url, doc_type }, 201);
  } catch (err) { next(err); }
});

/**
 * POST /dealer/onboarding/submit
 * Submit the onboarding form. Sets status to 'under_review'.
 */
router.post('/submit', async (req, res, next) => {
  try {
    const {
      full_name,
      business_name,
      business_address,
      city,
      state,
      pincode,
      pan_number,
      gst_number,
      bank_account_name,
      bank_account_number,
      bank_ifsc,
      bank_name,
      documents,
      latitude,
      longitude
    } = req.body;

    // Update profile full_name
    if (full_name) {
      await supabase.from('profiles')
        .update({ full_name })
        .eq('id', req.user.profileId);
    }

    const { data: updated, error } = await supabase
      .from('dealers')
      .update({
        business_name,
        business_address,
        city,
        state,
        pincode,
        pan_number,
        gst_number,
        bank_account_name,
        bank_account_number,
        bank_ifsc,
        bank_name,
        location: latitude && longitude ? `POINT(${longitude} ${latitude})` : null,
        documents: documents || {},
        onboarding_status: 'under_review',
        onboarding_submitted_at: new Date().toISOString()
      })
      .eq('profile_id', req.user.profileId)
      .select()
      .single();

    if (error) throw Object.assign(new Error('Failed to submit onboarding'), { statusCode: 500 });
    sendSuccess(res, { onboarding_status: 'under_review', dealer: updated });
  } catch (err) { next(err); }
});

module.exports = router;
