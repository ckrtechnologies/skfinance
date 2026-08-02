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
  branch: z.string().optional(),
  region: z.string().optional(),
});

async function list(req, res, next) {
  try {
    const { data, count, error } = await supabase
      .from('staff')
      .select('*, profiles(full_name, phone, email, is_active)', { count: 'exact' })
      .order('created_at', { ascending: false });
    if (error) throw error;
    return ok(res, { items: data, total: count });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, 'VALIDATION_ERROR', parsed.error.issues[0].message, 422);
    const { email, password, full_name, phone, branch, region } = parsed.data;

    const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
      email, password, email_confirm: true,
    });
    if (authErr) throw authErr;

    const { data: profile } = await supabase.from('profiles').insert({
      auth_user_id: authUser.user.id, role: 'staff', full_name, email, phone,
    }).select().single();

    const { data: staffRow } = await supabase.from('staff').insert({
      profile_id: profile.id, branch, region,
    }).select().single();

    await auditRepo.insert({ actor_profile_id: req.user.profile.id, action: 'staff_created', entity: 'staff', entity_id: staffRow.id, detail: { email, full_name } });
    return ok(res, { staff: staffRow }, 201);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const allowed = ['is_active', 'branch', 'region'];
    const profileAllowed = ['full_name', 'phone', 'email'];
    const staffUpdates = {};
    const profileUpdates = {};
    for (const k of allowed) if (req.body[k] !== undefined) staffUpdates[k] = req.body[k];
    for (const k of profileAllowed) if (req.body[k] !== undefined) profileUpdates[k] = req.body[k];

    const { data: staffRow, error } = await supabase.from('staff').select('profile_id').eq('id', req.params.id).single();
    if (error || !staffRow) return fail(res, 'NOT_FOUND', 'Staff not found', 404);

    await Promise.all([
      Object.keys(staffUpdates).length ? supabase.from('staff').update(staffUpdates).eq('id', req.params.id) : Promise.resolve(),
      Object.keys(profileUpdates).length ? supabase.from('profiles').update({ ...profileUpdates, is_active: req.body.is_active }).eq('id', staffRow.profile_id) : Promise.resolve(),
    ]);

    await auditRepo.insert({ actor_profile_id: req.user.profile.id, action: 'staff_updated', entity: 'staff', entity_id: req.params.id, detail: req.body });
    return ok(res, { message: 'Staff updated' });
  } catch (err) { next(err); }
}

module.exports = { list, create, update };
