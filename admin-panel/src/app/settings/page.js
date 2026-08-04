'use client';

import { useGetSettingsQuery, useUpdateSettingMutation } from '@/store/api/adminApi';
import { useState, useEffect } from 'react';

export default function SettingsPage() {
  const { data, isLoading } = useGetSettingsQuery();
  const [updateSetting, { isLoading: updating }] = useUpdateSettingMutation();
  const [localSettings, setLocalSettings] = useState({});

  useEffect(() => {
    if (data?.data) {
      const parsed = {};
      data.data.forEach(s => {
        parsed[s.key] = s.value;
      });
      setLocalSettings(parsed);
    }
  }, [data]);

  const handleToggle = async (key, value) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    await updateSetting({ key, value });
  };
  
  const handleInputBlur = async (key, value) => {
    if (data?.data?.find(s => s.key === key)?.value !== value) {
      await updateSetting({ key, value });
    }
  };

  const handleChange = (key, value) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  }

  if (isLoading) return <div className="p-8">Loading settings...</div>;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Global Settings</h1>
        <p className="page-desc">Configure platform-wide settings and parameters</p>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Commissions & Withdrawals</h3>
          
          <div className="field">
            <label>Default Dealer Commission (%)</label>
            <input 
              type="number" 
              step="0.01" 
              className="input" 
              value={localSettings.default_commission_rate || ''} 
              onChange={(e) => handleChange('default_commission_rate', e.target.value)}
              onBlur={(e) => handleInputBlur('default_commission_rate', e.target.value)}
            />
            <div className="text-sm text-muted mt-1">Applied to new dealers unless overridden</div>
          </div>
          
          <div className="field mt-4">
            <label>Minimum Withdrawal Amount (₹)</label>
            <input 
              type="number" 
              className="input" 
              value={localSettings.min_withdrawal_amount || ''} 
              onChange={(e) => handleChange('min_withdrawal_amount', e.target.value)}
              onBlur={(e) => handleInputBlur('min_withdrawal_amount', e.target.value)}
            />
          </div>

          <div className="field mt-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Auto-approve Withdrawals</div>
              <div className="text-sm text-muted">Automatically approve withdrawals below threshold</div>
            </div>
            <label className="toggle">
              <input 
                type="checkbox" 
                checked={localSettings.auto_approve_withdrawals === 'true'} 
                onChange={(e) => handleToggle('auto_approve_withdrawals', String(e.target.checked))} 
              />
              <span className="toggle-track" />
            </label>
          </div>
        </div>

        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Application Rules</h3>
          
          <div className="field">
            <label>Stale Draft Expiry (Days)</label>
            <input 
              type="number" 
              className="input" 
              value={localSettings.stale_draft_expiry_days || '30'} 
              onChange={(e) => handleChange('stale_draft_expiry_days', e.target.value)}
              onBlur={(e) => handleInputBlur('stale_draft_expiry_days', e.target.value)}
            />
            <div className="text-sm text-muted mt-1">Number of days before untouched drafts are cancelled</div>
          </div>

          <div className="field mt-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Enable Bureau Fetch (CIBIL)</div>
              <div className="text-sm text-muted">Toggle actual API calls to credit bureaus</div>
            </div>
            <label className="toggle">
              <input 
                type="checkbox" 
                checked={localSettings.enable_bureau_fetch === 'true'} 
                onChange={(e) => handleToggle('enable_bureau_fetch', String(e.target.checked))} 
              />
              <span className="toggle-track" />
            </label>
          </div>
        </div>
      </div>
    </>
  );
}
