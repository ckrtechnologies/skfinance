'use client';

import GlobalDatePicker from './GlobalDatePicker';
import { useSelector } from 'react-redux';
import { selectHeaderInfo } from '@/store/slices/uiSlice';

export default function TopBar() {
  const headerInfo = useSelector(selectHeaderInfo);
  const parent = headerInfo?.breadcrumbs?.[0] || 'SK Finance';
  const current = headerInfo?.title || 'Page';

  return (
    <header className="topbar">
      <div className="topbar-breadcrumb">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            <span>{parent}</span>
            <span className="topbar-breadcrumb-sep">/</span>
            <span>{current}</span>
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>{current}</h1>
        </div>
      </div>
      <div className="topbar-actions">
        <GlobalDatePicker />
      </div>
    </header>
  );
}
