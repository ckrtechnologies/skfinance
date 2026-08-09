const { supabase } = require('./src/config/database');

async function run() {
  const { data: profile } = await supabase.from('profiles').select('id, email, role').eq('email', 'd1@gmail.com').single();
  if (!profile) return console.log('Profile d1@gmail.com not found');
  console.log('Profile:', profile);

  if (profile.role === 'dealer') {
    const { data: dealer } = await supabase.from('dealers').select('id').eq('profile_id', profile.id).single();
    if (dealer) {
      const { data, error } = await supabase.from('loan_applications').update({ dealer_id: dealer.id }).neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) {
         console.error('Error updating:', error);
      } else {
         console.log('Successfully mapped all loan applications to dealer_id:', dealer.id);
      }
    } else {
       console.log('Dealer record not found');
    }
  } else {
    console.log('d1@gmail.com is not a dealer');
  }
}
run();
