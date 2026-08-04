'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { toggleSidebar, selectSidebarCollapsed } from '@/store/slices/uiSlice';

const NAV = [
  {
    group: 'Overview',
    items: [
      { href: '/',                label: 'Dashboard',     icon: IconGrid },
    ],
  },
  {
    group: 'Operations',
    items: [
      { href: '/applications',    label: 'Applications',  icon: IconFile },
      { href: '/lenders',         label: 'Lenders',       icon: IconBank },
      { href: '/dealers',         label: 'Dealers',       icon: IconStore },
      { href: '/staff',           label: 'Staff',         icon: IconUsers },
    ],
  },
  {
    group: 'Finance',
    items: [
      { href: '/commissions',     label: 'Commissions',   icon: IconChart },
      { href: '/withdrawals',     label: 'Withdrawals',   icon: IconWallet },
    ],
  },
  {
    group: 'System',
    items: [
      { href: '/settings',        label: 'Settings',      icon: IconSettings },
      { href: '/audit-log',       label: 'Audit Log',     icon: IconShield },
    ],
  },
];

export default function Sidebar() {
  const collapsed = useSelector(selectSidebarCollapsed);
  const dispatch  = useDispatch();
  const pathname  = usePathname();

  return (
    <nav className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">S</div>
        <span className="sidebar-logo-text">SK Finance</span>
      </div>

      {/* Navigation */}
      <div className="sidebar-nav">
        {NAV.map((group) => (
          <div key={group.group}>
            <div className="nav-group-label">{group.group}</div>
            {group.items.map((item) => {
              const isActive = item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-item${isActive ? ' active' : ''}`}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon className="nav-icon" />
                  <span className="nav-label">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Collapse toggle */}
      <div className="sidebar-footer">
        <button className="sidebar-toggle" onClick={() => dispatch(toggleSidebar())} title={collapsed ? 'Expand' : 'Collapse'}>
          <IconChevron className="nav-icon" style={{ transform: collapsed ? 'rotate(180deg)' : undefined, transition: 'transform 0.25s' }} />
          <span className="nav-label">Collapse</span>
        </button>
      </div>
    </nav>
  );
}

/* ── Inline SVG Icons ─────────────────────────────────────────────────── */
function IconGrid({ className, style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}
function IconFile({ className, style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
    </svg>
  );
}
function IconBank({ className, style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="10" width="18" height="11" rx="1" /><path d="M12 2L3 10h18L12 2z" /><path d="M7 14v4M12 14v4M17 14v4" />
    </svg>
  );
}
function IconStore({ className, style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
function IconUsers({ className, style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function IconChart({ className, style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
function IconWallet({ className, style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2" y="5" width="20" height="14" rx="2" /><path d="M16 12h2" />
    </svg>
  );
}
function IconSettings({ className, style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}
function IconShield({ className, style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
function IconChevron({ className, style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}
