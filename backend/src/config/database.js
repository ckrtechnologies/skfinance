'use strict';
const { createClient } = require('@supabase/supabase-js');
const secrets = require('./secrets');

if (!secrets.supabase.url || !secrets.supabase.serviceRoleKey) {
  throw new Error(
    'Supabase credentials missing. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env'
  );
}

/**
 * Single Supabase client using service-role key.
 * Server-to-server only — this key is NEVER sent to clients.
 * All auth context is enforced in Express middleware + domain services.
 */
const supabase = createClient(secrets.supabase.url, secrets.supabase.serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

module.exports = supabase;
