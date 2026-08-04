'use strict';
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../../config/secrets');
const { supabase }   = require('../../config/database');
const { sendError }  = require('../utils/response');

/**
 * authenticate — verifies Bearer JWT and loads the profile row.
 * Attaches req.user = { profileId, role, authUserId } for downstream use.
 */
async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, 401, 'UNAUTHORIZED', 'Missing or invalid Authorization header');
  }

  const token = authHeader.slice(7);
  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    return sendError(res, 401, 'UNAUTHORIZED', 'Token invalid or expired');
  }

  // Load profile to confirm account is still active
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, role, is_active, auth_user_id')
    .eq('auth_user_id', payload.sub)
    .single();

  if (error || !profile) {
    return sendError(res, 401, 'UNAUTHORIZED', 'Profile not found');
  }
  if (!profile.is_active) {
    return sendError(res, 403, 'FORBIDDEN', 'Account is deactivated');
  }

  req.user = {
    profileId:  profile.id,
    role:       profile.role,
    authUserId: profile.auth_user_id,
  };
  next();
}

function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return sendError(res, 403, 'FORBIDDEN', `Requires one of roles: ${roles.join(', ')}`);
    }
    next();
  };
}

module.exports = { authenticate, requireRole };
