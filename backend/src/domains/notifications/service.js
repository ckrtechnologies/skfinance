'use strict';
const supabase = require('../../config/database');

async function insertForProfile(profileId, { title, body, link_type, link_id }) {
  const { error } = await supabase.from('notifications').insert({ profile_id: profileId, title, body, link_type, link_id });
  if (error) console.error('[notifications] insert failed:', error.message);
}

async function createForDealer(dealerId, payload) {
  const { data: dealer } = await supabase.from('dealers').select('profile_id').eq('id', dealerId).single();
  if (dealer?.profile_id) await insertForProfile(dealer.profile_id, payload);
}

async function createForStaff(staffId, payload) {
  const { data: staff } = await supabase.from('staff').select('profile_id').eq('id', staffId).single();
  if (staff?.profile_id) await insertForProfile(staff.profile_id, payload);
}

async function createForCustomer(customerId, payload) {
  const { data: customer } = await supabase.from('customers').select('profile_id').eq('id', customerId).single();
  if (customer?.profile_id) await insertForProfile(customer.profile_id, payload);
}

async function listForProfile(profileId, { page = 1, limit = 30 } = {}) {
  const from = (page - 1) * limit;
  const { data, count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1);
  if (error) throw error;
  return { items: data, total: count, page, limit };
}

async function markRead(notificationId, profileId) {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('profile_id', profileId);
  if (error) throw error;
}

module.exports = { insertForProfile, createForDealer, createForStaff, createForCustomer, listForProfile, markRead };
