'use client';

import { useSearchParams } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { selectDateRange } from '@/store/slices/dateRangeSlice';
import { setHeaderInfo } from '@/store/slices/uiSlice';
import { useGetApplicationsQuery } from '@/store/api/staffApi';
import { StatusBadge, DateRangeBanner, LoadingRows, EmptyState, AmountCell } from '@/components/ui/Primitives';
import ExportButtons from '@/components/ui/ExportButtons';
import Link from 'next/link';
import { useState, useEffect, Suspense } from 'react';

const STATUSES = ['', 'draft', 'in_progress', 'approved', 'disbursed', 'rejected', 'cancelled', 'blocked_90d'];
const STAGES   = ['', 'cibil', 'bank', 'valuation', 'fi', 'approval', 'disbursement'];

function ApplicationsPageContent() {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(setHeaderInfo({ title: 'Loan Applications', breadcrumbs: ['Operations', 'Applications'] }));
  }, [dispatch]);

  const searchParams = useSearchParams();
  const globalRange  = useSelector(selectDateRange);

  const from   = searchParams.get('from') || globalRange.from;
  const to     = searchParams.get('to')   || globalRange.to;

  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [stage,  setStage]  = useState(searchParams.get('stage')  || '');
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const { data, isLoading, isFetching } = useGetApplicationsQuery({ from, to, status: status || undefined, stage: stage || undefined, limit, offset });

  const apps  = data?.data?.data  || [];
  const total = data?.data?.count || 0;
  const pages = Math.ceil(total / limit);
  const page  = Math.floor(offset / limit) + 1;

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
        <ExportButtons data={apps} columns={exportColumns} filename="applications_list" title="Loan Applications" />
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
              <th>App No.</th>
              <th>Product</th>
              <th>Requested</th>
              <th>Stage</th>
              <th>Status</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading || isFetching ? (
              <LoadingRows cols={8} rows={8} />
            ) : apps.length === 0 ? (
              <EmptyState title="No applications found" description="Try adjusting the date range or filters." />
            ) : (
              apps.map((app, idx) => (
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
