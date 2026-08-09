const { supabase } = require('../../config/database');
const { wa, PNID } = require('./waClient');

// Rate limit: 900 req/hour = 1 req every 4000ms.
const DELAY_MS = 4000;
let isRunning = false;

async function processQueue() {
  if (isRunning) return;
  isRunning = true;

  try {
    while (true) {
      // 1. Fetch one queued message
      const { data: msgData, error: fetchError } = await supabase
        .from('campaign_messages')
        .select('*')
        .eq('status', 'queued')
        .order('id', { ascending: true })
        .limit(1)
        .single();

      if (fetchError || !msgData) {
        // No messages in queue, sleep for 10 seconds before checking again
        await new Promise(res => setTimeout(res, 10000));
        continue;
      }

      // 2. Dispatch the message
      try {
        const { data: waResponse } = await wa.post(`/whatsapp/${PNID}/messages`, msgData.payload);
        
        const wamid = waResponse.messages?.[0]?.id;

        // 3. Mark as sent
        await supabase
          .from('campaign_messages')
          .update({ 
            status: 'sent', 
            wamid: wamid,
            sent_at: new Date().toISOString(),
            attempts: msgData.attempts + 1
          })
          .eq('id', msgData.id);

        // Update campaign counts
        await incrementCampaignCount(msgData.campaign_id, 'sent_count');

      } catch (err) {
        // Handle failure
        const errorMsg = err.response?.data?.error?.message || err.message;
        const errorCode = err.response?.data?.error?.code || 'dispatch_error';
        const retryable = err.retryable !== false; // Retryable by default if not strictly set
        
        if (retryable && msgData.attempts < 3) {
          // Leave as queued to retry later
          await supabase
            .from('campaign_messages')
            .update({ attempts: msgData.attempts + 1 })
            .eq('id', msgData.id);
        } else {
          // Mark as failed
          await supabase
            .from('campaign_messages')
            .update({ 
              status: 'failed', 
              error_message: errorMsg,
              error_code: String(errorCode),
              attempts: msgData.attempts + 1
            })
            .eq('id', msgData.id);

          await incrementCampaignCount(msgData.campaign_id, 'failed_count');
        }
      }

      // Throttle strictly to respect 900/hr limit (1 req / 4 secs)
      await new Promise(res => setTimeout(res, DELAY_MS));
    }
  } catch (globalError) {
    console.error('Fatal error in worker loop', globalError);
    isRunning = false;
  }
}

async function incrementCampaignCount(campaignId, column) {
  // Supabase doesn't have a direct increment natively in JS, use RPC if you have one.
  // We'll just read and update for now (in production, use an RPC for atomic inc).
  const { data } = await supabase.from('campaigns').select(column).eq('id', campaignId).single();
  if (data) {
    const val = data[column] || 0;
    await supabase.from('campaigns').update({ [column]: val + 1 }).eq('id', campaignId);
  }
}

function startWorker() {
  console.log('[whatsapp-worker] Starting campaign dispatcher loop (900/hr limit)');
  processQueue();
}

module.exports = { startWorker };
