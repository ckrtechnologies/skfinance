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
  
  return { message: 'OTP sent', otp: otpCode };
}

/**
 * verifyOtp — verify custom OTP and issue JWT.
 * Optional body field: intent = 'dealer' | 'customer' (default: 'customer')
 */
async function verifyOtp({ phone, email, identifier, token, otp, intent }) {
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

  const isEmail = loginId.includes('@');

  // 1. Try to find an existing profile by email or phone
  let { data: profile } = await supabase
    .from('profiles')
    .select('id, role, full_name, is_active, auth_user_id')
    .or(isEmail ? `email.eq.${loginId}` : `phone.eq.${loginId}`)
    .maybeSingle();

  if (!profile) {
    // 2. Try to find if auth user already exists for this identifier
    const isDealer = intent === 'dealer';
    const role = isDealer ? 'dealer' : 'customer';

    // Supabase requires E.164 format for phone
    const e164Phone = isEmail
      ? `+91${Date.now().toString().slice(-10)}`  // dummy phone for email-based signup
      : loginId.startsWith('+') ? loginId : `+91${loginId}`;

    let authUserId = null;

    // Try listing users to find by phone/email to avoid duplicate creation
    if (isEmail) {
      const { data: usersPage } = await supabase.auth.admin.listUsers({ perPage: 50 });
      const existingUser = usersPage?.users?.find(u => u.email === loginId);
      if (existingUser) authUserId = existingUser.id;
    } else {
      const { data: usersPage } = await supabase.auth.admin.listUsers({ perPage: 50 });
      const normalised = loginId.replace(/^\+91/, '');
      const existingUser = usersPage?.users?.find(u => {
        const uPhone = (u.phone || '').replace(/^\+91/, '');
        return uPhone === normalised;
      });
      if (existingUser) authUserId = existingUser.id;
    }

    // If no existing auth user, create one
    if (!authUserId) {
      const createPayload = isEmail
        ? { email: loginId, email_confirm: true, password: `tmp_${Date.now()}` }
        : { phone: e164Phone, phone_confirm: true };
      const { data: authData, error: authErr } = await supabase.auth.admin.createUser(createPayload);
      if (authErr) {
        console.error('Auth createUser error:', authErr);
        throw Object.assign(new Error('Failed to create auth user: ' + authErr.message), { statusCode: 500 });
      }
      authUserId = authData.user.id;
    }

    // 3. Upsert profile (handles race condition where profile may exist already)
    const { data: newProf, error: profErr } = await supabase.from('profiles')
      .upsert({
        auth_user_id: authUserId,
        role,
        full_name: isDealer ? 'Dealer' : 'Customer',
        phone: isEmail ? null : loginId,
        email: isEmail ? loginId : null
      }, { onConflict: 'auth_user_id' })
      .select().single();

    if (profErr) {
      console.error('Profile upsert error:', profErr);
      throw Object.assign(new Error('Failed to create profile: ' + profErr.message), { statusCode: 500 });
    }
    profile = newProf;

    if (isDealer) {
      // Create blank dealers row only if it doesn't already exist
      const { data: existingDealer } = await supabase
        .from('dealers')
        .select('id')
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (!existingDealer) {
        const { error: dealerErr } = await supabase.from('dealers').insert({
          profile_id: profile.id,
          onboarding_status: 'pending'
        });
        if (dealerErr) console.error('Failed to create blank dealer row:', dealerErr);
      }
    }
  }

  if (!profile.is_active) throw Object.assign(new Error('Account deactivated'), { statusCode: 403, code: 'FORBIDDEN' });

  // Fetch onboarding_status for dealer role
  let onboarding_status = null;
  let onboarding_rejection_reason = null;
  if (profile.role === 'dealer') {
    const { data: dealerRow } = await supabase
      .from('dealers')
      .select('onboarding_status, onboarding_rejection_reason')
      .eq('profile_id', profile.id)
      .maybeSingle();
    onboarding_status = dealerRow?.onboarding_status || 'pending';
    onboarding_rejection_reason = dealerRow?.onboarding_rejection_reason || null;
  }

  const jwtToken = jwt.sign(
    { sub: profile.auth_user_id, role: profile.role, profileId: profile.id },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  return {
    token: jwtToken,
    profile: {
      id: profile.id,
      role: profile.role,
      full_name: profile.full_name,
      onboarding_status,
      rejection_reason: onboarding_rejection_reason
    }
  };
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

/**
 * updateProfile - Update user profile text fields
 */
async function updateProfile(profileId, role, payload) {
  // Extract profile fields
  const profileFields = {};
  if (payload.full_name !== undefined) profileFields.full_name = payload.full_name;
  if (payload.email !== undefined) profileFields.email = payload.email;
  if (payload.phone !== undefined) profileFields.phone = payload.phone;
  if (payload.avatar_url !== undefined) profileFields.avatar_url = payload.avatar_url;

  if (Object.keys(profileFields).length > 0) {
    const { error } = await supabase.from('profiles').update(profileFields).eq('id', profileId);
    if (error) throw Object.assign(new Error(error.message), { statusCode: 400 });
  }

  // Update specific child tables based on role
  if (role === 'dealer') {
    const dealerFields = {};
    if (payload.business_name !== undefined) dealerFields.business_name = payload.business_name;
    if (payload.business_address !== undefined) dealerFields.business_address = payload.business_address;
    if (payload.city !== undefined) dealerFields.city = payload.city;
    if (payload.state !== undefined) dealerFields.state = payload.state;
    if (payload.pincode !== undefined) dealerFields.pincode = payload.pincode;
    if (payload.pan_number !== undefined) dealerFields.pan_number = payload.pan_number;
    if (payload.gst_number !== undefined) dealerFields.gst_number = payload.gst_number;
    if (payload.bank_account_name !== undefined) dealerFields.bank_account_name = payload.bank_account_name;
    if (payload.bank_account_number !== undefined) dealerFields.bank_account_number = payload.bank_account_number;
    if (payload.bank_ifsc !== undefined) dealerFields.bank_ifsc = payload.bank_ifsc;
    if (payload.bank_name !== undefined) dealerFields.bank_name = payload.bank_name;

    if (Object.keys(dealerFields).length > 0) {
      const { error } = await supabase.from('dealers').update(dealerFields).eq('profile_id', profileId);
      if (error) throw Object.assign(new Error(error.message), { statusCode: 400 });
    }
  }

  return { success: true };
}

/**
 * uploadAvatar - Handle multipart file upload to Supabase Storage
 */
async function uploadAvatar(profileId, file) {
  if (!file) throw Object.assign(new Error('No file provided'), { statusCode: 400 });

  let publicUrl;

  try {
    const fileExt = (file.originalname || 'avatar.jpg').split('.').pop();
    const filePath = `${profileId}/avatar_${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('users')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype || 'image/jpeg',
        upsert: true
      });

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage.from('users').getPublicUrl(filePath);
    publicUrl = publicUrlData.publicUrl;
  } catch (storageErr) {
    console.warn('[uploadAvatar] Supabase storage upload failed, saving to CDN local directory:', storageErr.message);

    const path = require('path');
    const fs = require('fs');
    const { CDN_BASE_URL, CDN_LOCAL_PATH } = require('../../config/secrets');

    const ext = path.extname(file.originalname || 'avatar.jpg') || '.jpg';
    const filename = `avatar_${Date.now()}${ext}`;
    const relDir = path.join('avatars', profileId);
    const absDir = path.join(CDN_LOCAL_PATH, relDir);
    const cdnPath = path.join(relDir, filename).replace(/\\/g, '/');

    fs.mkdirSync(absDir, { recursive: true });
    fs.writeFileSync(path.join(absDir, filename), file.buffer);

    publicUrl = `${CDN_BASE_URL}/${cdnPath}`;
  }

  // Update profile avatar_url in DB
  const { error: updateError } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', profileId);
  if (updateError) throw Object.assign(new Error('Failed to save avatar URL to profile'), { statusCode: 500 });

  return { avatar_url: publicUrl };
}

/**
 * softDeleteProfile - Deactivate an account
 */
async function softDeleteProfile(profileId) {
  const { error } = await supabase.from('profiles').update({ is_active: false }).eq('id', profileId);
  if (error) throw Object.assign(new Error(error.message), { statusCode: 400 });
  return { success: true, message: 'Account deleted (deactivated)' };
}

module.exports = { loginWithPassword, requestOtp, verifyOtp, getMe, changePassword, updateProfile, uploadAvatar, softDeleteProfile };
