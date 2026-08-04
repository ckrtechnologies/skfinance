'use client';

import { useGetProfileQuery, useChangePasswordMutation } from '@/store/api/staffApi';
import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setHeaderInfo } from '@/store/slices/uiSlice';

export default function ProfilePage() {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(setHeaderInfo({ title: 'My Profile', breadcrumbs: ['Account', 'Profile'] }));
  }, [dispatch]);

  const { data: profileRes, isLoading } = useGetProfileQuery();
  const profile = profileRes?.data;

  const [changePassword, { isLoading: isChanging }] = useChangePasswordMutation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [msg, setMsg] = useState({ text: '', type: '' });

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMsg({ text: 'New passwords do not match', type: 'error' });
      return;
    }
    if (newPassword.length < 6) {
      setMsg({ text: 'Password must be at least 6 characters', type: 'error' });
      return;
    }

    try {
      await changePassword({ currentPassword, newPassword }).unwrap();
      setMsg({ text: 'Password changed successfully', type: 'success' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setMsg({ text: err.data?.message || 'Failed to change password', type: 'error' });
    }
  };

  if (isLoading) return <div className="p-8">Loading profile...</div>;

  return (
    <div className="grid-2" style={{ gap: 24 }}>
      <div className="card">
        <h2 className="text-lg font-bold mb-4">Profile Information</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="field">
            <label>Full Name</label>
            <input type="text" className="input" value={profile?.full_name || ''} disabled />
          </div>
          <div className="field">
            <label>Email Address</label>
            <input type="email" className="input" value={profile?.email || ''} disabled />
          </div>
          <div className="field">
            <label>Phone Number</label>
            <input type="text" className="input" value={profile?.phone || ''} disabled />
          </div>
          <div className="field">
            <label>Role</label>
            <input type="text" className="input capitalize" value={profile?.role || ''} disabled />
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-bold mb-4">Change Password</h2>
        <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {msg.text && (
            <div style={{ 
              padding: '12px', 
              borderRadius: 'var(--radius-sm)', 
              background: msg.type === 'error' ? 'var(--color-rose-bg)' : 'var(--color-emerald-bg)', 
              color: msg.type === 'error' ? 'var(--color-rose)' : 'var(--color-emerald)' 
            }}>
              {msg.text}
            </div>
          )}

          <div className="field">
            <label>Current Password</label>
            <input 
              type="password" 
              className="input" 
              value={currentPassword} 
              onChange={(e) => setCurrentPassword(e.target.value)} 
              required 
            />
          </div>
          <div className="field">
            <label>New Password</label>
            <input 
              type="password" 
              className="input" 
              value={newPassword} 
              onChange={(e) => setNewPassword(e.target.value)} 
              required 
            />
          </div>
          <div className="field">
            <label>Confirm New Password</label>
            <input 
              type="password" 
              className="input" 
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)} 
              required 
            />
          </div>
          <button type="submit" className="btn btn-primary mt-2" disabled={isChanging}>
            {isChanging ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
