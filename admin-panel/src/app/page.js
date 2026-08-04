'use client';

import { useSelector, useDispatch } from 'react-redux';
import { selectDateRange } from '@/store/slices/dateRangeSlice';
import { setHeaderInfo } from '@/store/slices/uiSlice';
import { useEffect } from 'react';
import { useGetDashboardQuery, useGetApplicationsQuery, useGetCommissionsQuery, useGetWithdrawalsQuery } from '@/store/api/adminApi';
import MetricCard from '@/components/dashboard/MetricCard';
import { StatusBadge, AmountCell } from '@/components/ui/Primitives';
import Link from 'next/link';
import { 
  IconFileText, 
  IconCheck, 
  IconStar, 
  IconTrendingUp, 
  IconCurrencyRupee, 
  IconWallet, 
  IconChevronRight 
} from '@tabler/icons-react';

export default function DashboardPage() {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(setHeaderInfo({ title: 'Dashboard', breadcrumbs: ['Overview', 'Dashboard'] }));
  }, [dispatch]);

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
      icon: IconFileText,
    },
    {
      label: 'Approved',
      value: dashLoading ? null : (dashData?.data?.approved ?? 0),
      sub: 'Awaiting disbursement',
      color: 'var(--color-teal)',
      bg: 'var(--color-teal-bg)',
      href: '/applications?status=approved',
      icon: IconCheck,
    },
    {
      label: 'Disbursed',
      value: dashLoading ? null : (dashData?.data?.disbursed ?? 0),
      sub: 'Loans paid out',
      color: 'var(--color-emerald)',
      bg: 'var(--color-emerald-bg)',
      href: '/applications?status=disbursed',
      icon: IconStar,
    },
    {
      label: 'Disbursed Volume',
      value: totalDisbursed ? `₹${(totalDisbursed / 100000).toFixed(1)}L` : '—',
      sub: label,
      color: 'var(--color-accent)',
      bg: 'var(--color-accent-bg)',
      href: '/commissions',
      icon: IconTrendingUp,
    },
    {
      label: 'Commissions Earned',
      value: totalCommissions ? `₹${totalCommissions.toLocaleString('en-IN')}` : '—',
      sub: label,
      color: 'var(--color-amber)',
      bg: 'var(--color-amber-bg)',
      href: '/commissions',
      icon: IconCurrencyRupee,
    },
    {
      label: 'Pending Withdrawals',
      value: pendingWithdrawals,
      sub: 'Awaiting payout',
      color: pendingWithdrawals > 0 ? 'var(--color-rose)' : 'var(--color-emerald)',
      bg: pendingWithdrawals > 0 ? 'var(--color-rose-bg)' : 'var(--color-emerald-bg)',
      href: '/withdrawals?status=requested',
      icon: IconWallet,
    },
  ];

  return (
    <>


      <div className="metric-grid" style={{ marginBottom: 32 }}>
        {METRICS.map((m) => (
          <MetricCard key={m.label} {...m} loading={dashLoading && m.label === 'Total Applications'} />
        ))}
      </div>

      <div className="grid-2" style={{ gap: 20 }}>
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="chart-card">
            <div className="chart-title">
              <span>Commissions — {label}</span>
              <Link href={`/commissions?from=${from}&to=${to}`} style={{ fontSize: 12, color: 'var(--color-primary)' }}>View all →</Link>
            </div>
            {commissions.length === 0 ? (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-3)', fontSize: 13 }}>
                No commissions in this range
              </div>
            ) : (
              <MiniBarChart commissions={commissions} />
            )}
          </div>

          <div className="chart-card">
            <div className="chart-title"><span>Quick Links</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Pending Withdrawals', href: '/withdrawals?status=requested', badge: pendingWithdrawals },
                { label: 'Applications in Progress', href: `/applications?status=in_progress&from=${from}&to=${to}` },
                { label: 'Lender Configuration', href: '/lenders' },
              ].map((link) => (
                <Link key={link.href} href={link.href} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', background: 'var(--color-surface-2)', borderRadius: 8, fontSize: 13, color: 'var(--color-text-2)', transition: 'all 0.15s', textDecoration: 'none' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-3)'; e.currentTarget.style.color = 'var(--color-text)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-surface-2)'; e.currentTarget.style.color = 'var(--color-text-2)'; }}
                >
                  <span>{link.label}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {link.badge > 0 && <span className="nav-badge">{link.badge}</span>}
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

import { BarChart } from '@mantine/charts';

function MiniBarChart({ commissions }) {
  // Aggregate commissions by day
  const daily = commissions.reduce((acc, curr) => {
    const d = new Date(curr.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    acc[d] = (acc[d] || 0) + Number(curr.amount || 0);
    return acc;
  }, {});

  const data = Object.keys(daily).map(date => ({
    date,
    Commission: daily[date]
  })).slice(-10); // Show last 10 days max

  return (
    <div style={{ height: 200, marginTop: 16 }}>
      <BarChart
        h={200}
        data={data}
        dataKey="date"
        series={[{ name: 'Commission', color: 'blue.5' }]}
        tickLine="y"
        withYAxis={false}
        barProps={{ radius: 4 }}
        tooltipAnimationDuration={200}
      />
    </div>
  );
}
