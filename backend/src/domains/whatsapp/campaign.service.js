const { supabase } = require('../../config/database');
const crypto = require('crypto');

/**
 * Creates a new draft campaign
 */
async function createCampaign(data, userId) {
  const { name, template_id, media_id, header_var_map, body_var_map, audience_filter } = data;
  
  const idempotency_key = crypto.randomUUID();

  const { data: campaign, error } = await supabase
    .from('campaigns')
    .insert([{
      name,
      template_id,
      media_id,
      header_var_map,
      body_var_map,
      audience_filter,
      status: 'draft',
      created_by: userId,
      idempotency_key
    }])
    .select()
    .single();
    
  if (error) throw error;
  
  return campaign;
}

/**
 * Enqueue messages for a campaign
 * 1. Fetch audience based on filter
 * 2. Generate payloads
 * 3. Insert into campaign_messages
 * 4. Update campaign status to 'queued'
 */
async function enqueueCampaign(campaignId) {
  // 1. Fetch the campaign
  const { data: campaign, error: campError } = await supabase
    .from('campaigns')
    .select('*, wa_templates(*), wa_media(*)')
    .eq('id', campaignId)
    .single();
    
  if (campError) throw campError;
  if (campaign.status !== 'draft') {
    throw new Error('Only draft campaigns can be queued');
  }

  // 2. Fetch audience based on explicit targets
  let targets = campaign.audience_filter?.explicit_targets;
  if (!targets || targets.length === 0) {
    throw new Error('No target audience found for this campaign');
  }

  const dealerIds = targets.map(t => t.dealer_id);
  const { data: dealers, error: dealerError } = await supabase
    .from('dealers')
    .select('*, profiles!profile_id(*)')
    .in('id', dealerIds);

  if (dealerError) throw dealerError;

  // Create a map to easily retrieve the custom phone number for each dealer
  const targetMap = targets.reduce((acc, t) => {
    acc[t.dealer_id] = t.phone;
    return acc;
  }, {});

  if (dealers.length === 0) {
    throw new Error('None of the selected dealers could be found in the database');
  }

  // 3. Prepare campaign messages
  const messagesToInsert = dealers.map(dealer => {
    const customPhone = targetMap[dealer.id];
    
    // We pass the dealer object to buildTemplatePayload so that dynamic variables
    // can be extracted. But the phone number used is the custom one.
    const payload = buildTemplatePayload({
      to: customPhone,
      template: campaign.wa_templates,
      media: campaign.wa_media,
      headerMap: campaign.header_var_map,
      bodyMap: campaign.body_var_map,
      dealer: dealer
    });

    return {
      campaign_id: campaign.id,
      dealer_id: dealer.id,
      to_phone: customPhone,
      payload: payload,
      status: 'queued'
    };
  });

  // 4. Batch insert into campaign_messages
  const { error: insertError } = await supabase
    .from('campaign_messages')
    .insert(messagesToInsert);

  if (insertError) {
    throw new Error(`Failed to enqueue messages: ${insertError.message}`);
  }

  // 5. Update campaign status
  const { error: updateError } = await supabase
    .from('campaigns')
    .update({ 
      status: 'queued', 
      total_count: messagesToInsert.length 
    })
    .eq('id', campaign.id);

  if (updateError) throw updateError;

  return { queuedCount: messagesToInsert.length };
}

/**
 * Builds the WhatsApp Cloud API payload format based on the template and dealer data
 */
function buildTemplatePayload({ to, template, media, headerMap = [], bodyMap = [], dealer }) {
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: to,
    type: 'template',
    template: {
      name: template.name,
      language: { code: template.language },
      components: []
    }
  };

  // Build Header Component
  if (template.header_format !== 'NONE') {
    const headerComponent = { type: 'header', parameters: [] };
    
    if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(template.header_format)) {
      if (media && media.media_id) {
        headerComponent.parameters.push({
          type: template.header_format.toLowerCase(),
          [template.header_format.toLowerCase()]: { id: media.media_id }
        });
      }
    } else if (template.header_format === 'TEXT' && headerMap.length > 0) {
      headerMap.forEach(key => {
        headerComponent.parameters.push({
          type: 'text',
          text: String(resolveVariable(key, dealer))
        });
      });
    }
    
    if (headerComponent.parameters.length > 0) {
      payload.template.components.push(headerComponent);
    }
  }

  // Build Body Component
  if (template.body_var_count > 0 && bodyMap.length > 0) {
    const bodyComponent = { type: 'body', parameters: [] };
    
    bodyMap.forEach(key => {
      bodyComponent.parameters.push({
        type: 'text',
        text: String(resolveVariable(key, dealer))
      });
    });
    
    if (bodyComponent.parameters.length > 0) {
      payload.template.components.push(bodyComponent);
    }
  }

  return payload;
}

/**
 * Helper to resolve dynamic variables like "name" from the dealer object
 * or treat it as a literal string if it starts with static indicator e.g. "LITERAL:..."
 */
function resolveVariable(key, dataObj) {
  if (key.startsWith('LITERAL:')) {
    return key.replace('LITERAL:', '');
  }
  return dataObj[key] || '';
}

/**
 * Cancel a campaign
 */
async function cancelCampaign(campaignId) {
  // Update campaign_messages status from 'queued' to 'cancelled'
  await supabase
    .from('campaign_messages')
    .update({ status: 'failed', error_message: 'Cancelled by admin' })
    .eq('campaign_id', campaignId)
    .eq('status', 'queued');

  // Update campaign
  const { data, error } = await supabase
    .from('campaigns')
    .update({ status: 'cancelled' })
    .eq('id', campaignId)
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

module.exports = {
  createCampaign,
  enqueueCampaign,
  buildTemplatePayload,
  cancelCampaign
};
