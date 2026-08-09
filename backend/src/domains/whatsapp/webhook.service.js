const { supabase } = require('../../config/database');

/**
 * Handle incoming webhook payload from BuddyInfotech / Meta
 * @param {Object} payload The parsed JSON body from the webhook
 */
async function processWebhook(payload) {
  // Extract entry array
  const entries = payload.entry || [];

  for (const entry of entries) {
    const changes = entry.changes || [];
    
    for (const change of changes) {
      const value = change.value;
      if (!value) continue;

      // Check if it contains status updates
      if (value.statuses && value.statuses.length > 0) {
        for (const statusObj of value.statuses) {
          const wamid = statusObj.id;
          const status = statusObj.status; // 'sent', 'delivered', 'read', 'failed'
          const timestamp = statusObj.timestamp; // Unix timestamp string
          
          let received_at = new Date().toISOString();
          if (timestamp) {
             received_at = new Date(parseInt(timestamp, 10) * 1000).toISOString();
          }

          // 1. Log the event
          await supabase.from('wa_events').insert([{
            wamid,
            event_type: status,
            raw: statusObj,
            received_at
          }]);

          // 2. Update campaign_messages status
          const { data: msgRow } = await supabase
            .from('campaign_messages')
            .select('id, campaign_id, status')
            .eq('wamid', wamid)
            .single();

          if (msgRow) {
            // Only update if it's progressing forwards (basic safeguard)
            // Or just update directly and increment campaign metrics
            
            const updatePayload = { status: status };
            if (status === 'delivered') updatePayload.delivered_at = received_at;
            if (status === 'read') updatePayload.read_at = received_at;
            if (status === 'failed') {
              updatePayload.error_code = statusObj.errors?.[0]?.code?.toString() || null;
              updatePayload.error_message = statusObj.errors?.[0]?.title || null;
            }

            await supabase
              .from('campaign_messages')
              .update(updatePayload)
              .eq('id', msgRow.id);

            // Increment campaign tally
            if (['delivered', 'read', 'failed'].includes(status)) {
              await incrementCampaignCount(msgRow.campaign_id, `${status}_count`);
            }
          }
        }
      }
    }
  }

  return { success: true };
}

async function incrementCampaignCount(campaignId, column) {
  const { data } = await supabase.from('campaigns').select(column).eq('id', campaignId).single();
  if (data) {
    const val = data[column] || 0;
    await supabase.from('campaigns').update({ [column]: val + 1 }).eq('id', campaignId);
  }
}

module.exports = {
  processWebhook
};
