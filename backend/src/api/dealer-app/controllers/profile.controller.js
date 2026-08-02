'use strict';
const { ok, fail } = require('../../../shared/utils/response');
const supabase = require('../../../config/database');

async function get(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.user.profile.id)
      .single();
    if (error) throw error;
    if (!data) return fail(res, 'NOT_FOUND', 'Profile not found', 404);
    
    // Also fetch dealer details
    const { data: dealerData } = await supabase
      .from('dealers')
      .select('*')
      .eq('profile_id', req.user.profile.id)
      .single();
      
    return ok(res, { profile: data, dealer: dealerData });
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const { full_name, email } = req.body;
    const { data, error } = await supabase
      .from('profiles')
      .update({ full_name, email })
      .eq('id', req.user.profile.id)
      .select()
      .single();
    if (error) throw error;
    return ok(res, { profile: data });
  } catch (err) { next(err); }
}

module.exports = { get, update };
