'use strict';
const { supabase } = require('../../config/database');

async function createNotification({ profileId, title, body, linkType, linkId }) {
  const { error } = await supabase.from('notifications').insert({ profile_id: profileId, title, body, link_type: linkType, link_id: linkId });
  if (error) console.error('[notifications] Failed to create notification:', error.message);
}

async function listNotifications(profileId) {
  const { data, error } = await supabase.from('notifications').select('*').eq('profile_id', profileId).order('created_at', { ascending: false }).limit(50);
  if (error) throw error;
  return data;
}

async function markRead(notificationId, profileId) {
  const { data, error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', notificationId).eq('profile_id', profileId).select().single();
  if (error) throw error;
  return data;
}

async function logAudit({ actorProfileId, action, entity, entityId, detail }) {
  const { error } = await supabase.from('audit_log').insert({ actor_profile_id: actorProfileId, action, entity, entity_id: entityId, detail: detail || {} });
  if (error) console.error('[audit_log] Failed to write audit log:', error.message);
}

module.exports = { createNotification, listNotifications, markRead, logAudit };
