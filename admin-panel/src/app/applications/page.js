'use client';

import { useSearchParams } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { selectDateRange } from '@/store/slices/dateRangeSlice';
import { setHeaderInfo } from '@/store/slices/uiSlice';
import { useGetApplicationsQuery, useGetStaffQuery, useGetDealersQuery, useBulkAssignApplicationsMutation } from '@/store/api/adminApi';
import { StatusBadge, DateRangeBanner, LoadingRows, EmptyState, AmountCell } from '@/components/ui/Primitives';
import ExportButtons from '@/components/ui/ExportButtons';
import Link from 'next/link';
import { useState, useEffect, Suspense } from 'react';

const STATUSES = ['', 'draft', 'in_progress', 'clarification_requested', 'approved', 'disbursed', 'rejected', 'cancelled', 'blocked_90d'];
const STAGES   = ['', 'pre_check', 'cibil', 'document_verification', 'bank', 'valuation', 'fi', 'sanction', 'approval', 'disbursement'];

function ApplicationsPageContent() {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(setHeaderInfo({ title: 'Loan Applications', breadcrumbs: ['Operations', 'Applications'] }));
  }, [dispatch]);

  const searchParams = useSearchParams();
  const globalRange  = useSelector(selectDateRange);

  const from   = searchParams.get('from') || globalRange.from;
  const to     = searchParams.get('to')   || globalRange.to;

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [stage,  setStage]  = useState(searchParams.get('stage')  || '');
  const [source, setSource] = useState(searchParams.get('source') || '');
  const [assignment, setAssignment] = useState(searchParams.get('assignment') || ''); // 'unassigned', or staff_id
  const [dealerId, setDealerId] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const [selectedApps, setSelectedApps] = useState([]);
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [selectedStaffIds, setSelectedStaffIds] = useState([]);
  
  const [bulkAssign, { isLoading: isAssigning }] = useBulkAssignApplicationsMutation();

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setOffset(0);
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  const { data, isLoading, isFetching } = useGetApplicationsQuery({ 
    search: debouncedSearch || undefined, 
    from, 
    to, 
    status: status || undefined, 
    stage: stage || undefined, 
    source: source || undefined,
    assigned_staff_id: assignment && assignment !== 'unassigned' ? assignment : undefined,
    unassigned: assignment === 'unassigned',
    dealer_id: dealerId || undefined,
    limit, 
    offset 
  });

  const { data: staffData } = useGetStaffQuery();
  const staffList = staffData?.data || [];

  const { data: dealersData } = useGetDealersQuery();
  const dealersList = dealersData?.data || [];

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
    { header: 'Assigned To', accessor: (a) => a.assigned_staff?.profiles?.full_name || 'Unassigned' },
    { header: 'Requested', accessor: 'requested_amount' },
    { header: 'Approved', accessor: 'approved_amount' },
  ];

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const pageAppIds = apps.map(a => a.id);
      setSelectedApps(Array.from(new Set([...selectedApps, ...pageAppIds])));
    } else {
      const pageAppIds = apps.map(a => a.id);
      setSelectedApps(selectedApps.filter(id => !pageAppIds.includes(id)));
    }
  };

  const toggleAppSelection = (id) => {
    if (selectedApps.includes(id)) {
      setSelectedApps(selectedApps.filter(a => a !== id));
    } else {
      setSelectedApps([...selectedApps, id]);
    }
  };

  const handleBulkAssignSubmit = async () => {
    if (selectedStaffIds.length === 0) return alert('Select at least one staff member');
    try {
      await bulkAssign({ application_ids: selectedApps, staff_ids: selectedStaffIds }).unwrap();
      setShowBulkAssign(false);
      setSelectedApps([]);
      setSelectedStaffIds([]);
      alert('Applications assigned successfully');
    } catch (err) {
      alert('Failed to assign applications');
      console.error(err);
    }
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <DateRangeBanner from={from} to={to} />
        <ExportButtons data={apps} columns={exportColumns} filename="applications_list" title="Loan Applications" />
      </div>

      {/* Filters */}
      <div className="card card-sm" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1.5, minWidth: 200 }}>
            <input 
              type="text" 
              className="input w-full" 
              placeholder="Search App No, Name, Phone..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <select className="select" value={status} onChange={(e) => { setStatus(e.target.value); setOffset(0); }} id="filter-status">
              {STATUSES.map(s => <option key={s} value={s}>{s ? s.replace(/_/g, ' ') : 'All statuses'}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <select className="select" value={source} onChange={(e) => { setSource(e.target.value); setOffset(0); }} id="filter-source">
              <option value="">All sources</option>
              <option value="dealer">Dealer</option>
              <option value="staff">Staff</option>
              <option value="direct">Customer Direct</option>
            </select>
          </div>
          {source === 'dealer' && (
            <div style={{ flex: 1, minWidth: 160 }}>
              <select className="select" value={dealerId} onChange={(e) => { setDealerId(e.target.value); setOffset(0); }} id="filter-dealer">
                <option value="">All Dealers</option>
                {dealersList.map(d => (
                  <option key={d.id} value={d.id}>{d.business_name || d.dealer_code}</option>
                ))}
              </select>
            </div>
          )}
          <div style={{ flex: 1, minWidth: 160 }}>
            <select className="select" value={stage} onChange={(e) => { setStage(e.target.value); setOffset(0); }} id="filter-stage">
              {STAGES.map(s => <option key={s} value={s}>{s || 'All stages'}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <select className="select" value={assignment} onChange={(e) => { setAssignment(e.target.value); setOffset(0); }} id="filter-assignment">
              <option value="">Filter by Staff (All)</option>
              <option value="unassigned">Unassigned (No Staff)</option>
              {staffList.filter(s => s.is_active).map(s => (
                <option key={s.id} value={s.id}>{s.profiles?.full_name || s.staff_code}</option>
              ))}
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
              <th style={{ width: 40 }}>
                <input 
                  type="checkbox" 
                  checked={apps.length > 0 && apps.every(a => selectedApps.includes(a.id))}
                  onChange={handleSelectAll}
                />
              </th>
              <th>S.No</th>
              <th>App No.</th>
              <th>Source</th>
              <th>Customer</th>
              <th>Product</th>
              <th>Requested</th>
              <th>Stage</th>
              <th>Status</th>
              <th>Assigned To</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading || isFetching ? (
              <LoadingRows cols={10} rows={8} />
            ) : apps.length === 0 ? (
              <EmptyState title="No applications found" description="Try adjusting the date range or filters." />
            ) : (
              apps.map((app, idx) => {
                const source = app.source || {
                  type: app.dealer_id ? 'dealer' : app.staff_id ? 'staff' : 'customer',
                  label: app.dealer_id ? 'Dealer Portal' : app.staff_id ? 'Staff Assisted' : 'Customer Direct',
                  detail: app.dealers?.business_name || app.staff?.name || 'Direct'
                };
                const customerName = app.customers?.profiles?.full_name || app.applicant_details?.customer_name || 'Customer';

                return (
                  <tr key={app.id} className={selectedApps.includes(app.id) ? 'bg-primary/5' : ''}>
                    <td>
                      <input 
                        type="checkbox" 
                        checked={selectedApps.includes(app.id)}
                        onChange={() => toggleAppSelection(app.id)}
                      />
                    </td>
                    <td style={{ color: 'var(--color-text-3)' }}>{offset + idx + 1}</td>
                    <td><span className="font-mono font-bold text-primary">{app.application_no || app.id?.substring(0,8)}</span></td>
                    <td>
                      <span className="text-xs px-2 py-0.5 rounded font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        {source.type === 'dealer' ? '🏬 Dealer' : source.type === 'staff' ? '👔 Staff' : '👤 Direct'}
                      </span>
                    </td>
                    <td className="font-medium">{customerName}</td>
                    <td style={{ textTransform: 'capitalize' }}>{app.product_type?.replace(/_/g, ' ')}</td>
                    <td><AmountCell value={app.requested_amount} /></td>
                    <td style={{ textTransform: 'capitalize' }} className="font-semibold">{app.current_stage?.replace(/_/g, ' ')}</td>
                    <td><StatusBadge status={app.status} /></td>
                    <td>
                      {app.assignees && app.assignees.length > 0 ? (
                        <span className="text-sm font-medium">
                          {app.assignees[0].staff?.profiles?.full_name}
                          {app.assignees.length > 1 && <span className="text-xs text-muted-foreground ml-1">(+{app.assignees.length - 1})</span>}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Unassigned</span>
                      )}
                    </td>
                    <td className="text-muted text-sm">{new Date(app.created_at).toLocaleDateString('en-IN')}</td>
                    <td>
                      <Link href={`/applications/${app.id}?from=${from}&to=${to}`} className="btn btn-ghost btn-sm">
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selectedApps.length > 0 && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          backgroundColor: 'var(--color-surface)', padding: '16px 24px', borderRadius: 12,
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          display: 'flex', alignItems: 'center', gap: 20, zIndex: 100, border: '1px solid var(--color-border)'
        }}>
          <div>
            <span style={{ fontWeight: 600 }}>{selectedApps.length}</span> applications selected
          </div>
          <button className="btn btn-primary" onClick={() => setShowBulkAssign(true)}>
            Bulk Assign
          </button>
          <button className="btn btn-ghost" onClick={() => setSelectedApps([])}>
            Cancel
          </button>
        </div>
      )}

      {showBulkAssign && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
        }}>
          <div style={{
            backgroundColor: 'var(--color-surface)', borderRadius: 12, padding: 24,
            width: '100%', maxWidth: 450, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Assign Staff to {selectedApps.length} Applications</h3>
            
            <div style={{ maxHeight: 400, overflowY: 'auto', marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {staffList.filter(s => s.is_active).map(staff => (
                <label key={staff.id} style={{
                  display: 'flex', alignItems: 'center', padding: 12, borderRadius: 8,
                  border: '1px solid var(--color-border)', cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    style={{ marginRight: 12 }}
                    checked={selectedStaffIds.includes(staff.id)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedStaffIds([...selectedStaffIds, staff.id]);
                      else setSelectedStaffIds(selectedStaffIds.filter(id => id !== staff.id));
                    }}
                  />
                  <div>
                    <div style={{ fontWeight: 600 }}>{staff.profiles?.full_name}</div>
                    <div style={{ fontSize: 13, color: 'var(--color-text-2)' }}>{staff.role} • {staff.staff_code}</div>
                  </div>
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button className="btn btn-ghost" onClick={() => setShowBulkAssign(false)}>Cancel</button>
              <button 
                className="btn btn-primary" 
                disabled={isAssigning || selectedStaffIds.length === 0}
                onClick={handleBulkAssignSubmit}
              >
                {isAssigning ? 'Assigning...' : 'Assign Selected'}
              </button>
            </div>
          </div>
        </div>
      )}

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
