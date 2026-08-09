const { supabase } = require('../../config/database');
const { wa, WABA } = require('./waClient');

/**
 * Fetch approved marketing templates from WhatsApp/BuddyInfotech API and sync them to Supabase.
 */
async function syncTemplates() {
  if (!WABA) {
    throw new Error('MC_WABA_ID is required to sync templates');
  }

  // Fetch from Multichannel API
  // According to buddyinfotech API docs, the endpoint is usually:
  // GET /sms/templates (but wait, WABA is for whatsapp templates)
  // Let's use the path defined in docs: /whatsapp/{waba_id}/message_templates
  const { data } = await wa.get(`/whatsapp/${WABA}/message_templates?limit=100`);
  
  if (!data || !data.data) {
    throw new Error('Invalid response from WhatsApp API');
  }

  const templates = data.data; // array of templates
  
  const upsertData = templates.map((t) => ({
    meta_template_id: String(t.id),
    name: t.name,
    language: t.language,
    category: t.category,
    status: t.status,
    header_format: getHeaderFormat(t.components),
    header_var_count: getVarCount(t.components, 'HEADER'),
    body_var_count: getVarCount(t.components, 'BODY'),
    raw_components: t.components,
    synced_at: new Date().toISOString()
  }));

  // Perform bulk upsert in Supabase
  const { error } = await supabase
    .from('wa_templates')
    .upsert(upsertData, { onConflict: 'meta_template_id' });

  if (error) {
    console.error('Failed to sync WA templates to DB', error);
    throw error;
  }

  return { syncedCount: upsertData.length };
}

/**
 * Helper to get the format of the header (IMAGE, VIDEO, DOCUMENT, TEXT, NONE)
 */
function getHeaderFormat(components = []) {
  const header = components.find(c => c.type === 'HEADER');
  return header?.format || 'NONE';
}

/**
 * Helper to count variables in a specific component type
 * Variables look like {{1}}, {{2}} in the text
 */
function getVarCount(components = [], type) {
  const comp = components.find(c => c.type === type);
  if (!comp || !comp.text) return 0;
  
  const matches = comp.text.match(/\{\{(\d+)\}\}/g);
  return matches ? matches.length : 0;
}

/**
 * Fetch cached templates from Supabase
 */
async function getCachedTemplates(filters = {}) {
  let query = supabase.from('wa_templates').select('*');
  
  if (filters.category) query = query.eq('category', filters.category);
  if (filters.status) query = query.eq('status', filters.status);
  
  const { data, error } = await query;
  if (error) throw error;
  
  return data;
}

/**
 * Fetch a single cached template by its DB ID
 */
async function getTemplateById(id) {
  const { data, error } = await supabase
    .from('wa_templates')
    .select('*')
    .eq('id', id)
    .single();
    
  if (error) throw error;
  return data;
}

module.exports = {
  syncTemplates,
  getCachedTemplates,
  getTemplateById
};
