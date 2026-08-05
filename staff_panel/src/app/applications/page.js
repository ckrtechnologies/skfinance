'use client';

import { useSearchParams } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { selectDateRange } from '@/store/slices/dateRangeSlice';
import { setHeaderInfo } from '@/store/slices/uiSlice';
import { useGetApplicationsQuery } from '@/store/api/staffApi';
import { StatusBadge, DateRangeBanner, LoadingRows, EmptyState, AmountCell } from '@/components/ui/Primitives';
import ExportButtons from '@/components/ui/ExportButtons';
import Link from 'next/link';
import { useState, useEffect, Suspense, useMemo } from 'react';

const STATUSES = ['', 'draft', 'in_progress', 'approved', 'disbursed', 'rejected', 'cancelled', 'blocked_90d'];
const STAGES = ['', 'cibil', 'bank', 'valuation', 'fi', 'approval', 'disbursement'];
const LIMIT_OPTIONS = [20, 100, 200, 300, 400, 500];

function ApplicationsPageContent() {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(setHeaderInfo({ title: 'Loan Applications', breadcrumbs: ['Operations', 'Applications'] }));
  }, [dispatch]);

  const searchParams = useSearchParams();
  const globalRange = useSelector(selectDateRange);

  const from = searchParams.get('from') || globalRange.from;
  const to = searchParams.get('to') || globalRange.to;

  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [stage, setStage] = useState(searchParams.get('stage') || '');
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(100);

  // Sorting state
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });

  const { data, isLoading, isFetching } = useGetApplicationsQuery({ from, to, status: status || undefined, stage: stage || undefined, limit, offset });

  const apps = data?.data?.data || [];
  const total = data?.data?.count || 0;
  const pages = Math.ceil(total / limit);
  const page = Math.floor(offset / limit) + 1;

  const sortedApps = useMemo(() => {
    let sortableApps = [...apps];
    if (sortConfig.key) {
      sortableApps.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Handle nested fields
        if (sortConfig.key === 'customer_name') {
          aValue = a.applicant_details?.personal?.full_name || '';
          bValue = b.applicant_details?.personal?.full_name || '';
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableApps;
  }, [apps, sortConfig]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) return '⇅';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const exportColumns = [
    { header: 'S.No', accessor: (_, i) => offset + i + 1 },
    { header: 'ID / Date', accessor: (a) => `${a.reference_id || a.id.split('-')[0]} / ${new Date(a.created_at).toLocaleDateString()}` },
    { header: 'Customer', accessor: (a) => a.applicant_details?.personal?.full_name || 'N/A' },
    { header: 'Lender', accessor: (a) => a.lenders?.name || a.lender_id },
    { header: 'Stage', accessor: 'current_stage' },
    { header: 'Status', accessor: 'status' },
    { header: 'Requested', accessor: 'requested_amount' },
    { header: 'Approved', accessor: 'approved_amount' },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <DateRangeBanner from={from} to={to} />
        <ExportButtons data={sortedApps} columns={exportColumns} filename="applications_list" title="Loan Applications" />
      </div>

      {/* Filters */}
      <div className="card card-sm" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <select className="select" value={status} onChange={(e) => { setStatus(e.target.value); setOffset(0); }} id="filter-status">
              {STATUSES.map(s => <option key={s} value={s}>{s ? s.replace(/_/g, ' ') : 'All statuses'}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <select className="select" value={stage} onChange={(e) => { setStage(e.target.value); setOffset(0); }} id="filter-stage">
              {STAGES.map(s => <option key={s} value={s}>{s || 'All stages'}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 13, color: 'var(--color-text-2)' }}>Show:</label>
            <select className="select" style={{ padding: '4px 8px', minHeight: 32 }} value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setOffset(0); }}>
              {LIMIT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div style={{ color: 'var(--color-text-3)', fontSize: 12, marginLeft: 'auto' }}>
            {total} result{total !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th onClick={() => requestSort('application_no')} style={{ cursor: 'pointer' }}>App No. <span className="text-muted text-xs">{getSortIcon('application_no')}</span></th>
              <th onClick={() => requestSort('product_type')} style={{ cursor: 'pointer' }}>Product <span className="text-muted text-xs">{getSortIcon('product_type')}</span></th>
              <th onClick={() => requestSort('requested_amount')} style={{ cursor: 'pointer' }}>Requested <span className="text-muted text-xs">{getSortIcon('requested_amount')}</span></th>
              <th onClick={() => requestSort('current_stage')} style={{ cursor: 'pointer' }}>Stage <span className="text-muted text-xs">{getSortIcon('current_stage')}</span></th>
              <th onClick={() => requestSort('status')} style={{ cursor: 'pointer' }}>Status <span className="text-muted text-xs">{getSortIcon('status')}</span></th>
              <th onClick={() => requestSort('created_at')} style={{ cursor: 'pointer' }}>Created <span className="text-muted text-xs">{getSortIcon('created_at')}</span></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading || isFetching ? (
              <LoadingRows cols={8} rows={8} />
            ) : sortedApps.length === 0 ? (
              <EmptyState title="No applications found" description="Try adjusting the date range or filters." />
            ) : (
              sortedApps.map((app, idx) => (
                <tr key={app.id}>
                  <td style={{ color: 'var(--color-text-3)' }}>{offset + idx + 1}</td>
                  <td><span className="font-mono">{app.application_no}</span></td>
                  <td style={{ textTransform: 'capitalize' }}>{app.product_type?.replace(/_/g, ' ')}</td>
                  <td><AmountCell value={app.requested_amount} /></td>
                  <td style={{ textTransform: 'capitalize' }}>{app.current_stage?.replace(/_/g, ' ')}</td>
                  <td><StatusBadge status={app.status} /></td>
                  <td className="text-muted text-sm">{new Date(app.created_at).toLocaleDateString('en-IN')}</td>
                  <td>
                    <Link href={`/applications/${app.id}?from=${from}&to=${to}`} className="btn btn-ghost btn-sm">
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setOffset(Math.max(0, offset - limit))}>← Prev</button>
          <span style={{ fontSize: 13, color: 'var(--color-text-2)' }}>Page {page} of {pages}</span>
          <button className="btn btn-secondary btn-sm" disabled={page === pages} onClick={() => setOffset(offset + limit)}>Next →</button>
        </div>
      )}
    </>
  );
}

export default function ApplicationsPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading applications...</div>}>
      <ApplicationsPageContent />
    </Suspense>
  );
}

