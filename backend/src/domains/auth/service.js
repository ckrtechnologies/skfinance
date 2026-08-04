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

/**
 * changePassword — change user password
 */
async function changePassword({ authUserId, currentPassword, newPassword }) {
  const { createClient } = require('@supabase/supabase-js');
  const tempClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // Get true email from auth.users since it might not be in profiles table
  const { data: userResp, error: userError } = await tempClient.auth.admin.getUserById(authUserId);
  if (userError || !userResp.user || !userResp.user.email) {
    throw Object.assign(new Error('User not found in auth system'), { statusCode: 404, code: 'NOT_FOUND' });
  }

  const email = userResp.user.email;

  const { error: signInError } = await tempClient.auth.signInWithPassword({ email, password: currentPassword });
  if (signInError) {
    throw Object.assign(new Error('Incorrect current password'), { statusCode: 401, code: 'INVALID_CREDENTIALS' });
  }

  const { error: updateError } = await tempClient.auth.updateUser({ password: newPassword });
  if (updateError) {
    throw Object.assign(new Error(updateError.message), { statusCode: 400, code: 'UPDATE_FAILED' });
  }

  await tempClient.auth.signOut();
  return { success: true };
}

module.exports = { loginWithPassword, requestOtp, verifyOtp, getMe, changePassword };
