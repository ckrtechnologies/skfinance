'use client';

import { useSearchParams } from 'next/navigation';
import { useSelector } from 'react-redux';
import { selectDateRange } from '@/store/slices/dateRangeSlice';
import { useGetCommissionsQuery } from '@/store/api/adminApi';
import { setHeaderInfo } from '@/store/slices/uiSlice';
import { useDispatch } from 'react-redux';
import { StatusBadge, DateRangeBanner, LoadingRows, EmptyState, AmountCell } from '@/components/ui/Primitives';
import ExportButtons from '@/components/ui/ExportButtons';
import { Suspense, useEffect } from 'react';

function CommissionsPageContent() {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(setHeaderInfo({ title: 'Commissions', breadcrumbs: ['Finance', 'Commissions'] }));
  }, [dispatch]);

  const searchParams = useSearchParams();
  const globalRange  = useSelector(selectDateRange);
  const from = searchParams.get('from') || globalRange.from;
  const to   = searchParams.get('to')   || globalRange.to;

  const { data, isLoading } = useGetCommissionsQuery({ from, to });
  const commissions = data?.data || [];
  const total = commissions.reduce((s, c) => s + Number(c.amount || 0), 0);
  const totalVol = commissions.reduce((s, c) => s + Number(c.disbursed_amount || 0), 0);
  const paid = commissions.filter(c => c.status === 'paid').length;

  const exportColumns = [
    { header: 'S.No', accessor: (_, i) => i + 1 },
    { header: 'Application', accessor: (c) => c.loan_applications?.application_no || '—' },
    { header: 'Dealer', accessor: (c) => c.dealers?.business_name || '—' },
    { header: 'Disbursed Amount', accessor: 'disbursed_amount' },
    { header: 'Rate', accessor: (c) => `${c.rate_percentage}%` },
    { header: 'Commission', accessor: 'amount' },
    { header: 'Status', accessor: 'status' },
    { header: 'Date', accessor: (c) => new Date(c.created_at).toLocaleDateString() },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <DateRangeBanner from={from} to={to} />
        <ExportButtons data={commissions} columns={exportColumns} filename="commissions_list" title="Commissions" />
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Earned', value: `₹${total.toLocaleString('en-IN')}`, color: 'var(--color-primary)' },
          { label: 'Disbursed Volume', value: `₹${totalVol.toLocaleString('en-IN')}`, color: 'var(--color-accent)' },
          { label: 'Paid Out', value: `${paid} / ${commissions.length}`, color: 'var(--color-emerald)' },
        ].map(card => (
          <div key={card.label} className="card card-sm" style={{ borderTop: `2px solid ${card.color}` }}>
            <div className="metric-label">{card.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text)', marginTop: 4 }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Application</th>
              <th>Dealer</th>
              <th>Disbursed Amount</th>
              <th>Rate</th>
              <th>Commission</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? <LoadingRows cols={7} /> : commissions.length === 0 ? (
              <EmptyState title="No commissions" description="No commissions in the selected date range." />
            ) : commissions.map((c, idx) => (
              <tr key={c.id}>
                <td style={{ color: 'var(--color-text-3)' }}>{idx + 1}</td>
                <td><span className="font-mono">{c.loan_applications?.application_no || '—'}</span></td>
                <td>{c.dealers?.business_name || '—'}</td>
                <td><AmountCell value={c.disbursed_amount} /></td>
                <td className="text-muted">{(Number(c.rate_applied) * 100).toFixed(1)}%</td>
                <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}><AmountCell value={c.amount} /></td>
                <td><StatusBadge status={c.status} /></td>
                <td className="text-muted text-sm">{new Date(c.created_at).toLocaleDateString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function CommissionsPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading commissions...</div>}>
      <CommissionsPageContent />
    </Suspense>
  );
}
