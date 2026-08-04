'use client';

import { useGetSettingsQuery, useUpdateSettingMutation } from '@/store/api/adminApi';
import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setHeaderInfo } from '@/store/slices/uiSlice';

export default function SettingsPage() {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(setHeaderInfo({ title: 'Global Settings', breadcrumbs: ['System', 'Settings'] }));
  }, [dispatch]);
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

  const [pwd, setPwd] = useState({ current: '', new: '', confirm: '' });
  const [pwdStatus, setPwdStatus] = useState({ loading: false, error: null, success: false });

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwd.new !== pwd.confirm) {
      setPwdStatus({ loading: false, error: 'New passwords do not match', success: false });
      return;
    }
    if (pwd.new.length < 6) {
      setPwdStatus({ loading: false, error: 'Password must be at least 6 characters', success: false });
      return;
    }

    setPwdStatus({ loading: true, error: null, success: false });
    try {
      const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem('sk_admin_token');
      const res = await fetch(`${BASE_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword: pwd.current, newPassword: pwd.new }),
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.message || data.error?.message || 'Failed to change password');
      
      setPwdStatus({ loading: false, error: null, success: true });
      setPwd({ current: '', new: '', confirm: '' });
      setTimeout(() => setPwdStatus(s => ({ ...s, success: false })), 3000);
    } catch (err) {
      setPwdStatus({ loading: false, error: err.message, success: false });
    }
  };

  if (isLoading) return <div className="p-8">Loading settings...</div>;

  return (
    <>
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

        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Security</h3>
          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {pwdStatus.error && <div style={{ background: 'var(--color-rose-bg)', color: 'var(--color-rose)', padding: '10px 14px', borderRadius: 8, fontSize: 13 }}>{pwdStatus.error}</div>}
            {pwdStatus.success && <div style={{ background: 'var(--color-emerald-bg)', color: 'var(--color-emerald)', padding: '10px 14px', borderRadius: 8, fontSize: 13 }}>Password changed successfully!</div>}
            
            <div className="field">
              <label>Current Password</label>
              <input 
                type="password" 
                className="input" 
                value={pwd.current} 
                onChange={e => setPwd({ ...pwd, current: e.target.value })} 
                required 
              />
            </div>
            <div className="field">
              <label>New Password</label>
              <input 
                type="password" 
                className="input" 
                value={pwd.new} 
                onChange={e => setPwd({ ...pwd, new: e.target.value })} 
                required 
              />
            </div>
            <div className="field">
              <label>Confirm New Password</label>
              <input 
                type="password" 
                className="input" 
                value={pwd.confirm} 
                onChange={e => setPwd({ ...pwd, confirm: e.target.value })} 
                required 
              />
            </div>
            <div>
              <button type="submit" className="btn btn-primary" disabled={pwdStatus.loading}>
                {pwdStatus.loading ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
