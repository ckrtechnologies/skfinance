'use client';

import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setHeaderInfo } from '@/store/slices/uiSlice';
import { 
  useGetWaTemplatesQuery, 
  useSyncWaTemplatesMutation,
  useCreateWaCampaignMutation,
  useSendWaCampaignMutation,
  useUploadWaMediaMutation,
  useGetDealersQuery
} from '@/store/api/adminApi';

export default function WhatsAppCampaignsPage() {
  const dispatch = useDispatch();
  
  useEffect(() => {
    dispatch(setHeaderInfo({ title: 'WhatsApp Campaigns', breadcrumbs: ['Operations', 'WhatsApp Campaigns'] }));
  }, [dispatch]);

  const { data: templatesData, isLoading: isLoadingTemplates, refetch } = useGetWaTemplatesQuery();
  const { data: dealersData, isLoading: isLoadingDealers } = useGetDealersQuery();
  
  const [syncTemplates, { isLoading: syncing }] = useSyncWaTemplatesMutation();
  const [createCampaign, { isLoading: creating }] = useCreateWaCampaignMutation();
  const [sendCampaign, { isLoading: sending }] = useSendWaCampaignMutation();
  const [uploadMedia] = useUploadWaMediaMutation();

  const templates = templatesData?.data || [];
  const allDealers = dealersData?.data || [];

  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  
  // State for targeting
  const [selectedDealers, setSelectedDealers] = useState({}); // { dealer_id: phone_number }

  const handleSync = async () => {
    try {
      await syncTemplates().unwrap();
      refetch();
      alert('Templates synced successfully!');
    } catch (err) {
      alert('Failed to sync templates: ' + (err.data?.error || err.message));
    }
  };

  const toggleDealer = (dealer) => {
    setSelectedDealers(prev => {
      const next = { ...prev };
      if (next[dealer.id]) {
        delete next[dealer.id];
      } else {
        // Pre-fill with existing phone number if available
        next[dealer.id] = dealer.phone_e164 || dealer.phone || dealer.profiles?.phone || '';
      }
      return next;
    });
  };

  const updateDealerPhone = (dealerId, phone) => {
    setSelectedDealers(prev => ({
      ...prev,
      [dealerId]: phone
    }));
  };

  const validatePhone = (phone) => {
    // Basic WhatsApp validation: must start with country code (e.g., 91) and be digits only
    // This regex checks for 10-15 digits (standard international phone numbers)
    const regex = /^\d{10,15}$/;
    return regex.test(phone.replace(/\D/g, ''));
  };

  const handleLaunchCampaign = async (e) => {
    e.preventDefault();
    if (!campaignName || !selectedTemplate) {
      return alert('Please enter a campaign name and select a template.');
    }

    const explicit_targets = Object.entries(selectedDealers).map(([dealer_id, phone]) => ({
      dealer_id: dealer_id,
      phone: phone.replace(/\D/g, '') // Sanitize to just digits
    }));

    if (explicit_targets.length === 0) {
      return alert('Please select at least one dealer to target.');
    }

    // Validate phones
    for (const target of explicit_targets) {
      if (!validatePhone(target.phone)) {
        return alert(`Invalid phone number: ${target.phone}. It must include country code (e.g. 91...) and contain only digits.`);
      }
    }

    try {
      let mediaId = null;
      if (mediaFile) {
        const formData = new FormData();
        formData.append('file', mediaFile);
        const mediaRes = await uploadMedia(formData).unwrap();
        mediaId = mediaRes.data?.id;
      }

      // 1. Create draft campaign with explicit targets
      const campaignRes = await createCampaign({
        name: campaignName,
        template_id: selectedTemplate,
        media_id: mediaId,
        header_var_map: [],
        body_var_map: [],
        audience_filter: { explicit_targets }
      }).unwrap();

      // 2. Dispatch/Send it
      await sendCampaign(campaignRes.data.id).unwrap();
      
      alert('Campaign launched and queued successfully!');
      setCampaignName('');
      setSelectedTemplate('');
      setMediaFile(null);
      setSelectedDealers({});
      
    } catch (err) {
      alert('Failed to launch campaign: ' + (err.data?.error || err.message));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">New Campaign</h2>
        <button 
          onClick={handleSync} 
          disabled={syncing}
          className="btn btn-primary btn-sm"
        >
          {syncing ? 'Syncing...' : 'Sync Templates from Meta'}
        </button>
      </div>

      <div className="card p-6">
        <form onSubmit={handleLaunchCampaign} className="space-y-6 max-w-4xl">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="field">
              <label className="text-xs font-semibold mb-1 block">Campaign Name</label>
              <input 
                type="text" 
                required
                value={campaignName}
                onChange={e => setCampaignName(e.target.value)}
                className="input w-full"
                placeholder="e.g. Diwali Promo 2026"
              />
            </div>

            <div className="field">
              <label className="text-xs font-semibold mb-1 block">Select Template</label>
              {isLoadingTemplates ? (
                <p className="text-sm text-muted mt-1">Loading templates...</p>
              ) : (
                <select 
                  required
                  value={selectedTemplate}
                  onChange={e => setSelectedTemplate(e.target.value)}
                  className="select w-full"
                >
                  <option value="">-- Choose an approved template --</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.language}) - {t.category}</option>
                  ))}
                </select>
              )}
            </div>
            
            <div className="md:col-span-2 field">
              <label className="text-xs font-semibold mb-1 block">Header Media (Image/Video/Document) [Optional]</label>
              <input 
                type="file" 
                onChange={e => setMediaFile(e.target.files[0])}
                className="input w-full"
              />
              <p className="text-xs text-muted mt-1">Only required if the template expects a media header.</p>
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--border-color)]">
            <h3 className="text-lg font-bold mb-2">Target Audience</h3>
            <p className="text-sm text-muted mb-4">Select the dealers you want to target. You can modify their phone numbers specifically for this campaign without altering their main profile.</p>
            
            {isLoadingDealers ? (
               <p className="text-sm text-muted mt-1">Loading dealers...</p>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '60px' }}>Target</th>
                      <th>Dealer Name</th>
                      <th>Campaign Phone Number (Must include CC, e.g. 91)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allDealers.map(dealer => {
                      const isSelected = selectedDealers[dealer.id] !== undefined;
                      return (
                        <tr key={dealer.id} className={isSelected ? 'bg-primary/5' : ''}>
                          <td>
                            <input 
                              type="checkbox" 
                              checked={isSelected}
                              onChange={() => toggleDealer(dealer)}
                              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                          </td>
                          <td className="font-medium">
                            {dealer.business_name || dealer.profiles?.full_name || `Dealer #${dealer.id}`}
                          </td>
                          <td>
                            {isSelected ? (
                              <input 
                                type="text"
                                value={selectedDealers[dealer.id]}
                                onChange={(e) => updateDealerPhone(dealer.id, e.target.value)}
                                className="input w-full"
                                placeholder="919876543210"
                                required
                              />
                            ) : (
                              <span className="text-muted italic text-sm">Not Selected</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-[var(--border-color)] flex justify-end">
            <button 
              type="submit" 
              disabled={creating || sending}
              className="btn btn-primary"
            >
              {creating || sending ? 'Launching Campaign...' : `Launch Campaign to ${Object.keys(selectedDealers).length} Dealers`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
