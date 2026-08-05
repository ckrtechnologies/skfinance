'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { toggleSidebar, selectSidebarCollapsed } from '@/store/slices/uiSlice';
import { useState, useRef, useEffect } from 'react';

import {
  IconLayoutDashboard,
  IconFileText,
  IconBuildingBank,
  IconBuildingStore,
  IconUsers,
  IconChartBar,
  IconWallet,
  IconSettings,
  IconShieldCheck,
  IconChevronLeft
} from '@tabler/icons-react';

const NAV = [
  {
    group: 'Overview',
    items: [
      { href: '/',                label: 'Dashboard',     icon: IconLayoutDashboard, color: '#3b82f6' },
    ],
  },
  {
    group: 'Operations',
    items: [
      { href: '/applications',    label: 'Applications',  icon: IconFileText, color: '#10b981' },
      { href: '/lenders',         label: 'Lenders',       icon: IconBuildingBank, color: '#8b5cf6' },
      { href: '/dealers',         label: 'Dealers',       icon: IconBuildingStore, color: '#f59e0b' },
      { href: '/staff',           label: 'Staff',         icon: IconUsers, color: '#ec4899' },
      { href: '/customers',       label: 'Customers',     icon: IconUsers, color: '#14b8a6' },
    ],
  },
  {
    group: 'Finance',
    items: [
      { href: '/commissions',     label: 'Commissions',   icon: IconChartBar, color: '#06b6d4' },
      { href: '/withdrawals',     label: 'Withdrawals',   icon: IconWallet, color: '#f43f5e' },
    ],
  },
  {
    group: 'System',
    items: [
      { href: '/settings',        label: 'Settings',      icon: IconSettings, color: '#64748b' },
    ],
  },
];

export default function Sidebar() {
  const collapsed = useSelector(selectSidebarCollapsed);
  const dispatch  = useDispatch();
  const pathname  = usePathname();

  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('sk_theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('sk_theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const handleLogout = () => {
    localStorage.removeItem('sk_admin_token');
    window.location.href = '/login'; 
  };

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
                  <item.icon className="nav-icon" style={{ color: item.color }} stroke={2} size={18} />
                  <span className="nav-label">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      {/* Account Settings as part of Nav */}
      <div style={{ padding: '12px 8px' }}>
        <div className="nav-group-label">Account</div>
        <button className="nav-item" onClick={toggleTheme} style={{ width: '100%', textAlign: 'left', border: 'none', background: 'none' }} title={collapsed ? 'Toggle Theme' : undefined}>
          <IconSettings className="nav-icon" style={{ color: '#64748b' }} stroke={2} size={18} />
          <span className="nav-label">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
        <button className="nav-item" onClick={handleLogout} style={{ width: '100%', textAlign: 'left', border: 'none', background: 'none' }} title={collapsed ? 'Logout' : undefined}>
          <IconUsers className="nav-icon" style={{ color: '#ef4444' }} stroke={2} size={18} />
          <span className="nav-label" style={{ color: 'var(--color-rose)' }}>Logout</span>
        </button>
      </div>
      </div>

      {/* Collapse toggle */}
      <div className="sidebar-footer">
        <button className="sidebar-toggle" onClick={() => dispatch(toggleSidebar())} title={collapsed ? 'Expand' : 'Collapse'}>
          <IconChevronLeft className="nav-icon" size={18} style={{ transform: collapsed ? 'rotate(180deg)' : undefined, transition: 'transform 0.25s' }} />
          <span className="nav-label">Collapse</span>
        </button>
      </div>
    </nav>
  );
}




