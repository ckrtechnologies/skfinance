'use client';

import { useSelector, useDispatch } from 'react-redux';
import { selectDateRange } from '@/store/slices/dateRangeSlice';
import { setHeaderInfo } from '@/store/slices/uiSlice';
import { useEffect } from 'react';
import { useGetApplicationsQuery } from '@/store/api/staffApi';
import MetricCard from '@/components/dashboard/MetricCard';
import { StatusBadge, AmountCell } from '@/components/ui/Primitives';
import Link from 'next/link';
import { 
  IconFileText, 
  IconCheck, 
  IconClock, 
  IconChevronRight 
} from '@tabler/icons-react';

export default function DashboardPage() {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(setHeaderInfo({ title: 'Dashboard', breadcrumbs: ['Overview', 'Dashboard'] }));
  }, [dispatch]);

  const { from, to, label } = useSelector(selectDateRange);
  const { data: appsData, isLoading: appsLoading } = useGetApplicationsQuery({ from, to, limit: 10 });

  const apps = appsData?.data || [];
  const inProgressApps = apps.filter(a => a.status === 'in_progress').length;
  const approvedApps = apps.filter(a => a.status === 'approved').length;

  const METRICS = [
    {
      label: 'My Applications',
      value: appsLoading ? null : apps.length,
      sub: label,
      color: 'var(--color-primary)',
      bg: 'var(--color-primary-bg)',
      href: '/applications',
      icon: IconFileText,
    },
    {
      label: 'In Progress',
      value: appsLoading ? null : inProgressApps,
      sub: 'Awaiting action',
      color: 'var(--color-amber)',
      bg: 'var(--color-amber-bg)',
      href: '/applications?status=in_progress',
      icon: IconClock,
    },
    {
      label: 'Approved',
      value: appsLoading ? null : approvedApps,
      sub: 'Processed',
      color: 'var(--color-teal)',
      bg: 'var(--color-teal-bg)',
      href: '/applications?status=approved',
      icon: IconCheck,
    },
  ];

  return (
    <>
      <div className="metric-grid" style={{ marginBottom: 32 }}>
        {METRICS.map((m) => (
          <MetricCard key={m.label} {...m} loading={appsLoading} />
        ))}
      </div>

      <div className="grid-2" style={{ gap: 20 }}>
        <div>
          <div className="section-header">
            <div>
              <div className="section-title" style={{ fontSize: 16 }}>Recent Files</div>
              <div className="section-subtitle">Filtered: {label}</div>
            </div>
            <Link href={`/applications?from=${from}&to=${to}`} className="btn btn-ghost btn-sm">
              View all →
            </Link>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>App No.</th>
                  <th>Product</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {appsLoading ? (
                  Array.from({ length: 5 }, (_, i) => (
                    <tr key={i}>
                      {[80, 60, 60, 70].map((w, j) => (
                        <td key={j}><div className="skeleton" style={{ height: 12, width: `${w}%` }} /></td>
                      ))}
                    </tr>
                  ))
                ) : apps.length === 0 ? (
                  <tr><td colSpan="4" style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-3)', fontSize: 13 }}>No applications found</td></tr>
                ) : (
                  apps.map((app) => (
                    <tr key={app.id} onClick={() => window.location.href = `/applications/${app.id}`}>
                      <td><span className="font-mono">{app.application_no}</span></td>
                      <td><span style={{ textTransform: 'capitalize' }}>{app.product_type?.replace(/_/g, ' ')}</span></td>
                      <td><AmountCell value={app.requested_amount} /></td>
                      <td><StatusBadge status={app.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="chart-card">
            <div className="chart-title"><span>Quick Links</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Applications in Progress', href: `/applications?status=in_progress` },
                { label: 'My Profile', href: '/profile' },
              ].map((link) => (
                <Link key={link.href} href={link.href} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', background: 'var(--color-surface-2)', borderRadius: 8, fontSize: 13, color: 'var(--color-text-2)', transition: 'all 0.15s', textDecoration: 'none' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-3)'; e.currentTarget.style.color = 'var(--color-text)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-surface-2)'; e.currentTarget.style.color = 'var(--color-text-2)'; }}
                >
                  <span>{link.label}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <IconChevronRight size={14} />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
