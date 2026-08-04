'use client';

import Sidebar from './Sidebar';
import TopBar  from './TopBar';
import { useSelector } from 'react-redux';
import { selectSidebarCollapsed } from '@/store/slices/uiSlice';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AdminShell({ children }) {
  const collapsed = useSelector(selectSidebarCollapsed);
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem('sk_admin_token');
    if (!token && pathname !== '/login') {
      router.push('/login');
    }
  }, [pathname, router]);

  if (!mounted) return null; // Avoid hydration mismatch

  if (pathname === '/login') {
    return children;
  }

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
