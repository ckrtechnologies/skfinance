'use strict';
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('[config/database] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
}

// Service-role client — server-to-server only. Never exposed to the frontend.
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

module.exports = { supabase };
