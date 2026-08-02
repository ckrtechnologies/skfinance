'use strict';
const supabase = require('../../config/database');
const secrets = require('../../config/secrets');
const jwt = require('jsonwebtoken');
const { fail } = require('../utils/response');

/**
 * authenticate — verifies the Bearer JWT issued by Supabase Auth.
 * Attaches req.user = { authUserId, profile } on success.
 * Returns 401 on missing/invalid token, 403 if profile not found/inactive.
 */
async function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'] ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return fail(res, 'UNAUTHORIZED', 'Missing authorization token', 401);
  }

  let decoded;
  try {
    decoded = jwt.verify(token, secrets.supabase.jwtSecret);
  } catch {
    return fail(res, 'UNAUTHORIZED', 'Invalid or expired token', 401);
  }

  const authUserId = decoded.sub;
  if (!authUserId) {
    return fail(res, 'UNAUTHORIZED', 'Invalid token payload', 401);
  }

  // Fetch profile — single source of truth for role + identity
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, auth_user_id, role, full_name, phone, email, is_active')
    .eq('auth_user_id', authUserId)
    .single();

  if (error || !profile) {
    return fail(res, 'UNAUTHORIZED', 'User profile not found', 401);
  }

  if (!profile.is_active) {
    return fail(res, 'FORBIDDEN', 'Account is deactivated', 403);
  }

  req.user = { authUserId, profile };
  next();
}

module.exports = { authenticate };
