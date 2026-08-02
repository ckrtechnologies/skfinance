'use strict';
const commService = require('../../../domains/commissions/service');
const { ok } = require('../../../shared/utils/response');
const supabase = require('../../../config/database');

async function list(req, res, next) {
  try {
    const { data: dealer } = await supabase.from('dealers').select('id').eq('profile_id', req.user.profile.id).single();
    const result = await commService.findAllForDealer(dealer.id, { page: parseInt(req.query.page ?? 1), limit: parseInt(req.query.limit ?? 20) });
    return ok(res, result);
  } catch (err) { next(err); }
}

module.exports = { list };
