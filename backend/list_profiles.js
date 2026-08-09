const { supabase } = require('./src/config/database');
async function run() {
  const { data } = await supabase.from('profiles').select('id, email, role, full_name');
  console.log('Profiles:', data);
}
run();
