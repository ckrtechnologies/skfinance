'use client';

import { useSelector } from 'react-redux';
import { selectDateRange } from '@/store/slices/dateRangeSlice';
import { useGetDashboardQuery, useGetApplicationsQuery, useGetCommissionsQuery, useGetWithdrawalsQuery } from '@/store/api/adminApi';
import MetricCard from '@/components/dashboard/MetricCard';
import { StatusBadge, AmountCell } from '@/components/ui/Primitives';
import Link from 'next/link';

export default function DashboardPage() {
  const { from, to, label } = useSelector(selectDateRange);
  const { data: dashData, isLoading: dashLoading } = useGetDashboardQuery();
  const { data: appsData, isLoading: appsLoading } = useGetApplicationsQuery({ from, to, limit: 6 });
  const { data: commissionsData } = useGetCommissionsQuery({ from, to });
  const { data: withdrawalsData } = useGetWithdrawalsQuery({ status: 'requested' });

  const apps = appsData?.data?.data || [];
  const commissions = commissionsData?.data || [];
  const withdrawals = withdrawalsData?.data || [];
  const pendingWithdrawals = withdrawals.filter(w => w.status === 'requested').length;

  const totalDisbursed = commissions.reduce((s, c) => s + Number(c.disbursed_amount || 0), 0);
  const totalCommissions = commissions.reduce((s, c) => s + Number(c.amount || 0), 0);

  const METRICS = [
    {
      label: 'Total Applications',
      value: dashLoading ? null : (dashData?.data?.total_applications ?? 0),
      sub: 'All time',
      color: 'var(--color-primary)',
      bg: 'var(--color-primary-bg)',
      href: '/applications',
      icon: IconFile,
    },
    {
      label: 'Approved',
      value: dashLoading ? null : (dashData?.data?.approved ?? 0),
      sub: 'Awaiting disbursement',
      color: 'var(--color-teal)',
      bg: 'var(--color-teal-bg)',
      href: '/applications',
      icon: IconCheck,
    },
    {
      label: 'Disbursed',
      value: dashLoading ? null : (dashData?.data?.disbursed ?? 0),
      sub: 'Loans paid out',
      color: 'var(--color-emerald)',
      bg: 'var(--color-emerald-bg)',
      href: '/applications',
      icon: IconStar,
    },
    {
      label: 'Disbursed Volume',
      value: totalDisbursed ? `₹${(totalDisbursed / 100000).toFixed(1)}L` : '—',
      sub: label,
      color: 'var(--color-accent)',
      bg: 'var(--color-accent-bg)',
      href: '/commissions',
      icon: IconTrend,
    },
    {
      label: 'Commissions Earned',
      value: totalCommissions ? `₹${totalCommissions.toLocaleString('en-IN')}` : '—',
      sub: label,
      color: 'var(--color-amber)',
      bg: 'var(--color-amber-bg)',
      href: '/commissions',
      icon: IconRupee,
    },
    {
      label: 'Pending Withdrawals',
      value: pendingWithdrawals,
      sub: 'Awaiting payout',
      color: pendingWithdrawals > 0 ? 'var(--color-rose)' : 'var(--color-emerald)',
      bg: pendingWithdrawals > 0 ? 'var(--color-rose-bg)' : 'var(--color-emerald-bg)',
      href: '/withdrawals',
      icon: IconWallet,
    },
  ];

  return (
    <>
      {/* Page header */}
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-desc">Platform overview — Shreeja Finance</p>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="metric-grid" style={{ marginBottom: 32 }}>
        {METRICS.map((m) => (
          <MetricCard key={m.label} {...m} loading={dashLoading && m.label === 'Total Applications'} />
        ))}
      </div>

      {/* Two-column: Recent Applications + Activity */}
      <div className="grid-2" style={{ gap: 20 }}>
        {/* Recent Applications */}
        <div>
          <div className="section-header">
            <div>
              <div className="section-title" style={{ fontSize: 16 }}>Recent Applications</div>
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
                  <tr><td colSpan="4" style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-3)', fontSize: 13 }}>No applications in this range</td></tr>
                ) : (
                  apps.map((app) => (
                    <tr key={app.id} onClick={() => window.location.href = `/applications/${app.id}?from=${from}&to=${to}`}>
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

        {/* Right column: Commissions + Quick Links */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Mini Commission Bar Chart */}
          <div className="chart-card">
            <div className="chart-title">
              <span>Commissions — {label}</span>
              <Link href={`/commissions?from=${from}&to=${to}`} style={{ fontSize: 12, color: 'var(--color-primary)' }}>View all →</Link>
            </div>
            {commissions.length === 0 ? (
              <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-3)', fontSize: 13 }}>
                No commissions in this range
              </div>
            ) : (
              <MiniBarChart commissions={commissions} />
            )}
          </div>

          {/* Quick Actions */}
          <div className="chart-card">
            <div className="chart-title"><span>Quick Links</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Pending Withdrawals', href: '/withdrawals?status=requested', badge: pendingWithdrawals },
                { label: 'Applications in Progress', href: `/applications?status=in_progress&from=${from}&to=${to}` },
                { label: 'Lender Configuration', href: '/lenders' },
                { label: 'Audit Log', href: `/audit-log?from=${from}&to=${to}` },
              ].map((link) => (
                <Link key={link.href} href={link.href} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', background: 'var(--color-surface-2)', borderRadius: 8, fontSize: 13, color: 'var(--color-text-2)', transition: 'all 0.15s', textDecoration: 'none' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-3)'; e.currentTarget.style.color = 'var(--color-text)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-surface-2)'; e.currentTarget.style.color = 'var(--color-text-2)'; }}
                >
                  <span>{link.label}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {link.badge > 0 && <span className="nav-badge">{link.badge}</span>}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
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

function MiniBarChart({ commissions }) {
  const max = Math.max(...commissions.map(c => Number(c.amount)));
  const display = commissions.slice(0, 8);
  return (
    <div className="chart-area">
      {display.map((c, i) => (
        <div key={i} className="chart-bar-wrap" title={`₹${Number(c.amount).toLocaleString('en-IN')}`}>
          <div
            className="chart-bar"
            style={{ height: `${Math.max(8, (Number(c.amount) / max) * 160)}px` }}
          />
          <div className="chart-bar-label">{String(i + 1).padStart(2, '0')}</div>
        </div>
      ))}
    </div>
  );
}

/* Inline icons */
function IconFile({ size = 20 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>;
}
function IconCheck({ size = 20 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="20 6 9 17 4 12" /></svg>;
}
function IconStar({ size = 20 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>;
}
function IconTrend({ size = 20 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>;
}
function IconRupee({ size = 20 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 3h12M6 8h12M6 13l8.5 8L18 13" /></svg>;
}
function IconWallet({ size = 20 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M16 12h2" /></svg>;
}
