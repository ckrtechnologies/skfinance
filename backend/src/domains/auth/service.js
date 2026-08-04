'use strict';
const jwt      = require('jsonwebtoken');
const { supabase } = require('../../config/database');
const { JWT_SECRET } = require('../../config/secrets');

/**
 * loginWithPassword — admin login (email + password via Supabase Auth).
 * Returns a JWT signed with JWT_SECRET.
 */
async function loginWithPassword({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw Object.assign(new Error(error.message), { statusCode: 401, code: 'INVALID_CREDENTIALS' });

  const authUser = data.user;
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, role, full_name, is_active')
    .eq('auth_user_id', authUser.id)
    .single();

  if (profileErr || !profile) throw Object.assign(new Error('Profile not found'), { statusCode: 404, code: 'NOT_FOUND' });
  if (!profile.is_active)     throw Object.assign(new Error('Account deactivated'), { statusCode: 403, code: 'FORBIDDEN' });

  const token = jwt.sign(
    { sub: authUser.id, role: profile.role, profileId: profile.id },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  return { token, profile: { id: profile.id, role: profile.role, full_name: profile.full_name } };
}

/**
 * loginWithOtp — initiate OTP login for customer/dealer (phone-based).
 */
async function requestOtp({ phone }) {
  const { error } = await supabase.auth.signInWithOtp({ phone });
  if (error) throw Object.assign(new Error(error.message), { statusCode: 400, code: 'OTP_ERROR' });
  return { message: 'OTP sent' };
}

/**
 * verifyOtp — verify OTP and issue JWT.
 */
async function verifyOtp({ phone, token }) {
  const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
  if (error) throw Object.assign(new Error(error.message), { statusCode: 401, code: 'INVALID_OTP' });

  const authUser = data.user;
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, role, full_name, is_active')
    .eq('auth_user_id', authUser.id)
    .single();

  if (profileErr || !profile) throw Object.assign(new Error('Profile not found'), { statusCode: 404, code: 'NOT_FOUND' });
  if (!profile.is_active)     throw Object.assign(new Error('Account deactivated'), { statusCode: 403, code: 'FORBIDDEN' });

  const jwtToken = jwt.sign(
    { sub: authUser.id, role: profile.role, profileId: profile.id },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  return { token: jwtToken, profile: { id: profile.id, role: profile.role, full_name: profile.full_name } };
}

/**
 * getMe — returns current profile details.
 */
async function getMe(profileId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, full_name, phone, email, avatar_url, is_active, created_at')
    .eq('id', profileId)
    .single();

  if (error || !data) throw Object.assign(new Error('Profile not found'), { statusCode: 404, code: 'NOT_FOUND' });
  return data;
}

module.exports = { loginWithPassword, requestOtp, verifyOtp, getMe };
