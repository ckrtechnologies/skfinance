'use strict';
const supabase = require('../../config/database');
const secrets = require('../../config/secrets');

// ─── OTP helpers ─────────────────────────────────────────────────────
/**
 * requestOtp — sends a phone OTP via the configured SMS provider.
 * In development (SMS_PROVIDER=stub), always succeeds silently.
 * TODO: replace stub with real SMS provider call (O4).
 */
async function requestOtp(phone) {
  const provider = secrets.sms.provider;

  if (provider === 'stub') {
    console.log(`[auth/otp] STUB — OTP for ${phone} is: 999999`);
    return;
  }

  // TODO: implement msg91 / twofactor / other provider
  throw new Error(`SMS provider "${provider}" is not yet implemented. Configure SMS_PROVIDER=stub for dev.`);
}

/**
 * verifyOtpAndCreateSession — verifies phone OTP and returns a session JWT.
 * Stub: accepts '999999' always. Real: delegate to SMS provider's verify endpoint.
 * Creates a Supabase auth user + profile if first login.
 */
async function verifyOtpAndCreateSession(phone, otp, role) {
  // Stub validation
  if (secrets.sms.provider === 'stub' && otp !== '999999') {
    const err = new Error('Invalid OTP');
    err.code = 'VALIDATION_ERROR';
    err.status = 422;
    throw err;
  }

  if (secrets.sms.provider !== 'stub') {
    // TODO: verify otp via real provider
    throw new Error('SMS provider not implemented');
  }

  // Check if a Supabase auth user exists for this phone
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  let authUser = existingUsers?.users?.find(u => u.phone === phone);

  if (!authUser) {
    // Create new Supabase auth user
    const { data: created, error } = await supabase.auth.admin.createUser({
      phone,
      phone_confirm: true,
      user_metadata: { role },
    });
    if (error) throw error;
    authUser = created.user;

    // Create profile row
    await supabase.from('profiles').insert({
      auth_user_id: authUser.id,
      role,
      full_name: '',
      phone,
    });
  }

  // Generate session token via admin API
  const { data: session, error: sessErr } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: `${phone.replace('+', '')}@phone.local`,
  });

  // Since phone-based sessions aren't directly generatable, we use a workaround:
  // sign a JWT manually with the same secret Supabase uses
  const jwt = require('jsonwebtoken');
  const token = jwt.sign(
    { sub: authUser.id, role: 'authenticated', aud: 'authenticated' },
    secrets.supabase.jwtSecret,
    { expiresIn: '7d' }
  );

  // Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', authUser.id)
    .single();

  return { token, profile };
}

// ─── Password-based login (staff + admin) ────────────────────────────
/**
 * loginWithPassword — authenticates staff (username+password) or admin (email+password).
 * Returns a JWT + profile.
 */
async function loginWithPassword(identifier, password) {
  // For staff: identifier is username (stored in profiles.phone or staff_code).
  // For admin: identifier is email. We try email first, then phone.
  const { data: session, error } = await supabase.auth.signInWithPassword({
    email: identifier,
    password,
  });

  if (error) {
    // Try phone as username for staff
    const phoneAttempt = await supabase.auth.signInWithPassword({
      phone: identifier,
      password,
    });
    if (phoneAttempt.error) {
      const err = new Error('Invalid credentials');
      err.code = 'UNAUTHORIZED';
      err.status = 401;
      throw err;
    }
    return _buildSessionResponse(phoneAttempt.data.session);
  }

  return _buildSessionResponse(session.session);
}

async function _buildSessionResponse(session) {
  if (!session?.access_token) {
    const err = new Error('Invalid credentials');
    err.code = 'UNAUTHORIZED';
    err.status = 401;
    throw err;
  }

  const jwt = require('jsonwebtoken');
  const decoded = jwt.decode(session.access_token);
  const authUserId = decoded?.sub;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', authUserId)
    .single();

  if (!profile) {
    const err = new Error('Profile not found for this account');
    err.code = 'UNAUTHORIZED';
    err.status = 401;
    throw err;
  }

  if (!profile.is_active) {
    const err = new Error('Account is deactivated');
    err.code = 'FORBIDDEN';
    err.status = 403;
    throw err;
  }

  return { token: session.access_token, profile };
}

module.exports = { requestOtp, verifyOtpAndCreateSession, loginWithPassword };
