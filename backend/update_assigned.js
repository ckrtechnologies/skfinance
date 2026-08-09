const { supabase } = require('./src/config/database');

async function run() {
  const { data: profile } = await supabase.from('profiles').select('id, role').eq('email', 'd1@gmail.com').single();
  if (!profile) return console.log('Profile d1@gmail.com not found');
  console.log('Profile:', profile);

  if (profile.role === 'staff') {
    const { data: staff } = await supabase.from('staff').select('id').eq('profile_id', profile.id).single();
    const staffId = staff?.id;
    if (staffId) {
      const { data, error } = await supabase.from('loan_applications').update({ assigned_staff_id: staffId }).is('assigned_staff_id', null);
      console.log('Updated', error ? error : 'Successfully assigned to staff_id ' + staffId);
    }
  } else {
    // Maybe we just find any active staff?
    const { data: staff } = await supabase.from('staff').select('id').eq('is_active', true).limit(1).single();
    if (staff) {
      const { data, error } = await supabase.from('loan_applications').update({ assigned_staff_id: staff.id }).is('assigned_staff_id', null);
      console.log('Updated to first staff member', staff.id);
    } else {
      console.log('No staff member found.');
    }
  }
}
run();
