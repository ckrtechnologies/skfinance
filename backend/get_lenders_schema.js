const { supabase } = require('./src/config/database');

async function run() {
  const { data, error } = await supabase.from('lenders').select('*').limit(1);
  if (error) console.error(error);
  if (data && data.length > 0) {
    console.log(Object.keys(data[0]));
  }
}
run();
