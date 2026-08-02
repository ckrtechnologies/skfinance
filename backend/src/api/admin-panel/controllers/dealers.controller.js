'use strict';
const supabase = require('../../../config/database');
const auditRepo = require('../../../domains/notifications/auditRepository');
const { ok, fail } = require('../../../shared/utils/response');

const { z } = require('zod');

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().min(1),
  phone: z.string().optional(),
  bank_account_no: z.string().optional(),
  bank_ifsc: z.string().optional(),
  bank_name: z.string().optional(),
  pan_no: z.string().optional(),
  gstin: z.string().optional(),
  address: z.string().optional(),
});

async function list(req, res, next) {
  try {
    const { data, count, error } = await supabase
      .from('dealers')
      .select('*, profiles(full_name, phone, email)', { count: 'exact' })
      .order('created_at', { ascending: false });
    if (error) throw error;
    return ok(res, { items: data, total: count });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, 'VALIDATION_ERROR', parsed.error.issues[0].message, 422);
    const { email, password, full_name, phone, bank_account_no, bank_ifsc, bank_name, pan_no, gstin, address } = parsed.data;

    const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
      email, password, email_confirm: true,
    });
    if (authErr) throw authErr;

    const { data: profile } = await supabase.from('profiles').insert({
      auth_user_id: authUser.user.id, role: 'dealer', full_name, email, phone,
    }).select().single();

    const { data: dealerRow, error: dealerErr } = await supabase.from('dealers').insert({
      profile_id: profile.id, bank_account_no, bank_ifsc, bank_name, pan_no, gstin, address
    }).select().single();
    if (dealerErr) throw dealerErr;

    await auditRepo.insert({ actor_profile_id: req.user.profile.id, action: 'dealer_created', entity: 'dealers', entity_id: dealerRow.id, detail: { email, full_name } });
    return ok(res, { dealer: dealerRow }, 201);
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('dealers')
      .select('*, profiles(full_name, phone, email)')
      .eq('id', req.params.id)
      .single();
    if (error || !data) return fail(res, 'NOT_FOUND', 'Dealer not found', 404);
    return ok(res, { dealer: data });
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const allowed = ['is_active', 'bank_account_no', 'bank_ifsc', 'bank_name', 'pan_no', 'gstin', 'address'];
    const updates = {};
    for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];
    const { data, error } = await supabase.from('dealers').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;
    await auditRepo.insert({ actor_profile_id: req.user.profile.id, action: 'dealer_updated', entity: 'dealers', entity_id: req.params.id, detail: updates });
    return ok(res, { dealer: data });
  } catch (err) { next(err); }
}

module.exports = { list, create, getOne, update };
