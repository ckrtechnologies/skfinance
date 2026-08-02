'use strict';
/**
 * secrets.js — THE ONLY FILE allowed to read process.env.
 * All other files import named exports from here or from config/database.js.
 * ESLint rule `no-restricted-properties` bans process.env outside src/config/.
 */
require('dotenv').config();

const secrets = {
  port: parseInt(process.env.PORT ?? '4000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',

  supabase: {
    url: process.env.SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    jwtSecret: process.env.JWT_SECRET,
  },

  cdn: {
    baseDir: process.env.CDN_BASE_DIR ?? './cdn',
    baseUrl: process.env.CDN_BASE_URL ?? 'http://localhost:4000/cdn',
  },

  sms: {
    provider: process.env.SMS_PROVIDER ?? 'stub',
    apiKey: process.env.SMS_API_KEY ?? '',
  },

  app: {
    appNoPrefix: process.env.APP_NO_PREFIX ?? 'SF',
  },
};

// Fail fast in production if critical secrets are missing
if (secrets.nodeEnv === 'production') {
  const required = [
    ['SUPABASE_URL', secrets.supabase.url],
    ['SUPABASE_SERVICE_ROLE_KEY', secrets.supabase.serviceRoleKey],
    ['JWT_SECRET', secrets.supabase.jwtSecret],
    ['CDN_BASE_DIR', secrets.cdn.baseDir],
    ['CDN_BASE_URL', secrets.cdn.baseUrl],
  ];
  for (const [name, val] of required) {
    if (!val) throw new Error(`Missing required env var: ${name}`);
  }
}

module.exports = secrets;
