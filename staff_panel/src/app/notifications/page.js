'use client';

import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setHeaderInfo } from '@/store/slices/uiSlice';

export default function NotificationsPage() {
  const dispatch = useDispatch();
  
  useEffect(() => {
    dispatch(setHeaderInfo({ title: 'Notifications', breadcrumbs: ['Account', 'Notifications'] }));
  }, [dispatch]);

  return (
    <div className="card">
      <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--color-text-3)' }}>
        <h3 className="text-lg font-bold text-muted mb-2">No new notifications</h3>
        <p className="text-sm">You are all caught up!</p>
      </div>
    </div>
  );
}
