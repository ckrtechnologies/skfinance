const { supabase } = require('./src/config/database');
async function run() {
  const { data: d } = await supabase.from('dealers').select('id').limit(1).single();
  const { data, error } = await supabase.from('withdrawal_requests').insert({ dealer_id: d.id, amount_requested: 50 }).select().single();
  if (error) console.error(error);
  else console.log("Inserted status:", data.status);
  await supabase.from('withdrawal_requests').delete().eq('id', data.id);
}
run();
