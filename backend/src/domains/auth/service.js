'use strict';
const jwt      = require('jsonwebtoken');
const { supabase } = require('../../config/database');
const { JWT_SECRET } = require('../../config/secrets');

/**
 * loginWithPassword — admin login (email + password via Supabase Auth).
 * Returns a JWT signed with JWT_SECRET.
 */
async function loginWithPassword({ email, identifier, password, phone }) {
  const loginId = email || identifier || phone;
  if (!loginId) throw Object.assign(new Error('Email or phone is required'), { statusCode: 400 });

  let authParam = {};
  if (loginId.includes('@')) {
    authParam = { email: loginId, password };
  } else {
    authParam = { phone: loginId, password };
  }

  let { data, error } = await supabase.auth.signInWithPassword(authParam);

  if (error) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('auth_user_id, email, phone')
      .or(`email.eq.${loginId},phone.eq.${loginId}`)
      .maybeSingle();

    if (profile) {
      if (profile.email && profile.email !== loginId) {
        const retry = await supabase.auth.signInWithPassword({ email: profile.email, password });
        if (!retry.error) {
          data = retry.data;
          error = null;
        }
      } else if (profile.phone && profile.phone !== loginId) {
        const retry = await supabase.auth.signInWithPassword({ phone: profile.phone, password });
        if (!retry.error) {
          data = retry.data;
          error = null;
        }
      }
    }
  }

  if (error || !data?.user) {
    throw Object.assign(new Error(error?.message || 'Invalid credentials'), { statusCode: 401, code: 'INVALID_CREDENTIALS' });
  }

  const authUser = data.user;
  let { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, role, full_name, is_active')
    .eq('auth_user_id', authUser.id)
    .maybeSingle();

  if (!profile && (authUser.email || authUser.phone)) {
    const contact = authUser.email || authUser.phone;
    const { data: pByContact } = await supabase
      .from('profiles')
      .select('id, role, full_name, is_active')
      .or(`email.eq.${contact},phone.eq.${contact}`)
      .maybeSingle();
    if (pByContact) profile = pByContact;
  }

  if (!profile) {
    profile = {
      id: authUser.id,
      role: 'dealer',
      full_name: authUser.email || authUser.phone || 'Dealer',
      is_active: true
    };
  }

  const role = profile.role || 'dealer';
  const profileId = profile.id || authUser.id;
  const fullName = profile.full_name || authUser.email || 'Dealer';

  const token = jwt.sign(
    { sub: authUser.id, role, profileId },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  return { token, profile: { id: profileId, role, full_name: fullName } };
}

/**
 * requestOtp — initiate OTP login for customer/dealer (email or phone).
 */
async function requestOtp({ phone, email, identifier }) {
  const loginId = identifier || phone || email;
  if (!loginId) throw Object.assign(new Error('Email or phone is required'), { statusCode: 400 });

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const { error } = await supabase.from('otps').insert({
    identifier: loginId,
    otp_code: otpCode,
    expires_at: expiresAt
  });

  if (error) {
    console.error('Supabase OTP Insert Error:', error);
    throw Object.assign(new Error('Failed to generate OTP'), { statusCode: 500, code: 'OTP_ERROR' });
  }

  console.log(`\n\n==========================================`);
  console.log(`[DUMMY OTP] Send ${otpCode} to ${loginId}`);
  console.log(`==========================================\n\n`);
  // TODO: Replace above with Nodemailer (if email) or DLT HTTP API (if phone)
  
  return { message: 'OTP sent' };
}

/**
 * verifyOtp — verify custom OTP and issue JWT.
 */
async function verifyOtp({ phone, email, identifier, token, otp }) {
  const loginId = identifier || phone || email;
  const otpCode = token || otp;

  if (!loginId || !otpCode) throw Object.assign(new Error('Identifier and OTP are required'), { statusCode: 400 });

  const { data: otpData, error: otpError } = await supabase
    .from('otps')
    .select('*')
    .eq('identifier', loginId)
    .eq('otp_code', otpCode)
    .eq('is_used', false)
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (otpError || !otpData) throw Object.assign(new Error('Invalid or expired OTP'), { statusCode: 401, code: 'INVALID_OTP' });

  // Delete after use to keep table clean
  await supabase.from('otps').delete().eq('id', otpData.id);

  // Find profile
  let { data: profile } = await supabase
    .from('profiles')
    .select('id, role, full_name, is_active, auth_user_id')
    .or(`email.eq.${loginId},phone.eq.${loginId}`)
    .maybeSingle();

  if (!profile) {
    // Auto-create Customer profile (Option B)
    const dummyPhone = loginId.includes('@') ? `9${Date.now()}`.slice(0, 10) : loginId;
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({ phone: dummyPhone, phone_confirm: true });
    
    if (authErr) throw Object.assign(new Error('Failed to create user auth record'), { statusCode: 500 });
    
    const { data: newProf, error: profErr } = await supabase.from('profiles')
      .insert({ 
        auth_user_id: authData.user.id, 
        role: 'customer', 
        full_name: 'Customer', 
        phone: loginId.includes('@') ? null : loginId,
        email: loginId.includes('@') ? loginId : null 
      })
      .select().single();
      
    if (profErr) throw Object.assign(new Error('Failed to create customer profile'), { statusCode: 500 });
    profile = newProf;
  }

  if (!profile.is_active) throw Object.assign(new Error('Account deactivated'), { statusCode: 403, code: 'FORBIDDEN' });

  const jwtToken = jwt.sign(
    { sub: profile.auth_user_id, role: profile.role, profileId: profile.id },
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
