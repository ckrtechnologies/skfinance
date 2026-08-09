'use strict';
/**
 * secrets.js — centralised secrets gateway.
 * All env-var reads happen here. No other file reads process.env directly
 * (except config/database.js for the Supabase client).
 */

function requireEnv(key) {
  const value = process.env[key];
  if (!value) throw new Error(`[secrets] Missing required env variable: ${key}`);
  return value;
}

module.exports = {
  JWT_SECRET:                requireEnv('JWT_SECRET'),
  SUPABASE_URL:              requireEnv('SUPABASE_URL'),
  SUPABASE_SERVICE_ROLE_KEY: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  CDN_BASE_URL:              process.env.CDN_BASE_URL || 'http://localhost:4000/cdn',
  CDN_LOCAL_PATH:            process.env.CDN_LOCAL_PATH || './cdn',
  PORT:                      process.env.PORT || 4000,
  CORS_ORIGIN:               process.env.CORS_ORIGIN || '*',
  NODE_ENV:                  process.env.NODE_ENV || 'development',
  MEON_COMPANY_NAME:         process.env.MEON_COMPANY_NAME,
  MEON_SECRET_TOKEN:         process.env.MEON_SECRET_TOKEN,
  MEON_BASE_URL:             process.env.MEON_BASE_URL || 'https://digilocker.meon.co.in',
  MEON_REDIRECT_URL:         process.env.MEON_REDIRECT_URL || 'https://skfinance.in/digilocker/callback',
};
