require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase.from('campaign_messages').select('*').order('id', { ascending: false }).limit(5);
  console.log(JSON.stringify(data, null, 2));
}
run();
