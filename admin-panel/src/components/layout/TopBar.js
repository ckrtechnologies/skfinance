'use client';

import GlobalDatePicker from './GlobalDatePicker';
import { usePathname } from 'next/navigation';

const BREADCRUMBS = {
  '/':             ['Overview', 'Dashboard'],
  '/applications': ['Operations', 'Applications'],
  '/lenders':      ['Operations', 'Lenders'],
  '/dealers':      ['Operations', 'Dealers'],
  '/staff':        ['Operations', 'Staff'],
  '/commissions':  ['Finance', 'Commissions'],
  '/withdrawals':  ['Finance', 'Withdrawals'],
  '/settings':     ['System', 'Settings'],
  '/audit-log':    ['System', 'Audit Log'],
};

export default function TopBar() {
  const pathname = usePathname();
  const base = '/' + (pathname.split('/')[1] || '');
  const [parent, current] = BREADCRUMBS[base] || ['SK Finance', 'Page'];

  return (
    <header className="topbar">
      <div className="topbar-breadcrumb">
        <span>{parent}</span>
        <span className="topbar-breadcrumb-sep">/</span>
        <span className="topbar-breadcrumb-current">{current}</span>
      </div>
      <div className="topbar-actions">
        <GlobalDatePicker />
        <AdminAvatar />
      </div>
    </header>
  );
}

function AdminAvatar() {
  return (
    <div style={{
      width: 34, height: 34, borderRadius: '50%',
      background: 'linear-gradient(135deg, #5b8af5, #8b5cf6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 13, fontWeight: 700, color: '#fff',
      cursor: 'pointer', flexShrink: 0,
    }}>
      A
    </div>
  );
}
