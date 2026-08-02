'use strict';
const { z } = require('zod');
const authService = require('../../../domains/auth/service');
const supabase = require('../../../config/database');
const { ok, fail } = require('../../../shared/utils/response');

const phoneSchema = z.object({ phone: z.string().min(10).max(15) });
const otpVerifySchema = z.object({
  phone: z.string().min(10).max(15),
  otp: z.string().length(6),
  role: z.enum(['customer', 'dealer']),
});
const loginSchema = z.object({
  identifier: z.string().min(3), // email or username
  password: z.string().min(6),
});

/** POST /auth/otp/request */
async function requestOtp(req, res, next) {
  try {
    const parsed = phoneSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, 'VALIDATION_ERROR', parsed.error.issues[0].message, 422);

    await authService.requestOtp(parsed.data.phone);
    return ok(res, { message: 'OTP sent successfully' });
  } catch (err) {
    next(err);
  }
}

/** POST /auth/otp/verify */
async function verifyOtp(req, res, next) {
  try {
    const parsed = otpVerifySchema.safeParse(req.body);
    if (!parsed.success) return fail(res, 'VALIDATION_ERROR', parsed.error.issues[0].message, 422);

    const { token, profile } = await authService.verifyOtpAndCreateSession(
      parsed.data.phone,
      parsed.data.otp,
      parsed.data.role
    );
    return ok(res, { token, profile });
  } catch (err) {
    if (err.code === 'VALIDATION_ERROR') return fail(res, err.code, err.message, 422);
    if (err.code === 'UNAUTHORIZED') return fail(res, err.code, err.message, 401);
    next(err);
  }
}

/** POST /auth/login  (staff + admin) */
async function login(req, res, next) {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, 'VALIDATION_ERROR', parsed.error.issues[0].message, 422);

    const { token, profile } = await authService.loginWithPassword(
      parsed.data.identifier,
      parsed.data.password
    );
    return ok(res, { token, profile });
  } catch (err) {
    if (err.code === 'UNAUTHORIZED') return fail(res, err.code, err.message, 401);
    if (err.code === 'FORBIDDEN') return fail(res, err.code, err.message, 403);
    next(err);
  }
}

/** POST /auth/logout */
async function logout(req, res) {
  // JWT is stateless — client discards token. Nothing to invalidate server-side in v1.
  return ok(res, { message: 'Logged out successfully' });
}

/** GET /auth/me */
async function me(req, res, next) {
  try {
    const profileId = req.user.profile.id;
    const role = req.user.profile.role;

    // Fetch role-specific linked record
    let linked = null;
    if (role === 'customer') {
      const { data } = await supabase.from('customers').select('*').eq('profile_id', profileId).maybeSingle();
      linked = data;
    } else if (role === 'dealer') {
      const { data } = await supabase.from('dealers').select('*').eq('profile_id', profileId).maybeSingle();
      linked = data;
    } else if (role === 'staff') {
      const { data } = await supabase.from('staff').select('*').eq('profile_id', profileId).maybeSingle();
      linked = data;
    }

    return ok(res, { profile: req.user.profile, linked });
  } catch (err) {
    next(err);
  }
}

/** PATCH /auth/profile  (update own profile) */
async function updateProfile(req, res, next) {
  try {
    const allowed = ['full_name', 'email', 'phone', 'avatar_url'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (Object.keys(updates).length === 0) {
      return fail(res, 'VALIDATION_ERROR', 'No updatable fields provided', 422);
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', req.user.profile.id)
      .select()
      .single();

    if (error) throw error;
    return ok(res, { profile: data });
  } catch (err) {
    next(err);
  }
}

module.exports = { requestOtp, verifyOtp, login, logout, me, updateProfile };
