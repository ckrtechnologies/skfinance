'use client';

import Sidebar from './Sidebar';
import TopBar  from './TopBar';
import { useSelector } from 'react-redux';
import { selectSidebarCollapsed } from '@/store/slices/uiSlice';

export default function AdminShell({ children }) {
  const collapsed = useSelector(selectSidebarCollapsed);

  return (
    <div className="admin-layout">
      <Sidebar />
      <div className={`admin-main${collapsed ? ' sidebar-collapsed' : ''}`}>
        <TopBar />
        <div className="admin-content">
          {children}
        </div>
      </div>
    </div>
  );
}
