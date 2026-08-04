'use client';

import { useGetApplicationQuery, useGetStageEntriesQuery, useAddStageEntryMutation } from '@/store/api/staffApi';
import { StatusBadge, AmountCell, LoadingRows } from '@/components/ui/Primitives';
import { useState, useEffect, use } from 'react';
import { useDispatch } from 'react-redux';
import { setHeaderInfo } from '@/store/slices/uiSlice';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ApplicationDetailsPage({ params }) {
  const unwrappedParams = use(params);
  const id = unwrappedParams.id;
  const router = useRouter();

  const { data: appData, isLoading } = useGetApplicationQuery(id);
  const { data: stagesData, isLoading: stagesLoading } = useGetStageEntriesQuery(id);
  const [addStageEntry, { isLoading: addingEntry }] = useAddStageEntryMutation();

  const [modal, setModal] = useState(null); // 'stage'
  const [stageNotes, setStageNotes] = useState('');
  const [stageStatus, setStageStatus] = useState('approved');

  const app = appData?.data;
  const stages = stagesData?.data || [];

  const dispatch = useDispatch();
  useEffect(() => {
    if (app) {
      dispatch(setHeaderInfo({ title: `App: ${app.application_no}`, breadcrumbs: ['Operations', 'Applications', 'Details'] }));
    } else {
      dispatch(setHeaderInfo({ title: 'Application Details', breadcrumbs: ['Operations', 'Applications', 'Details'] }));
    }
  }, [dispatch, app?.application_no]);

  if (isLoading) return <div className="p-8">Loading application details...</div>;
  if (!app) return <div className="p-8 text-rose-500">Application not found</div>;

  async function handleAddStageEntry() {
    await addStageEntry({ id, stage: app.current_stage, status: stageStatus, notes: stageNotes });
    setModal(null);
    setStageNotes('');
  }

  return (
    <>
      <div className="page-header flex items-start justify-between">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <button onClick={() => router.back()} className="btn btn-secondary btn-sm">← Back</button>
            <StatusBadge status={app.status} />
            <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-2)', marginLeft: '8px' }}>
              {app.customers?.first_name} {app.customers?.last_name} • {app.product_type?.replace(/_/g, ' ')}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {app.status === 'in_progress' && (
            <button className="btn btn-secondary" onClick={() => setModal('stage')}>+ Add Stage Entry</button>
          )}
        </div>
      </div>

      <div className="grid-2 mt-6">
        {/* Left Column: Details */}
        <div className="flex flex-col gap-6">
          <div className="card">
            <h3 className="text-sm font-bold text-muted mb-4 uppercase tracking-wider">Loan Details</h3>
            <div className="grid-2">
              <DetailRow label="Requested Amount" value={<AmountCell value={app.requested_amount} />} />
              <DetailRow label="Tenure" value={`${app.tenure_months} months`} />
              <DetailRow label="Stage" value={<span className="capitalize">{app.current_stage?.replace(/_/g, ' ')}</span>} />
              <DetailRow label="Created At" value={new Date(app.created_at).toLocaleString('en-IN')} />
            </div>
          </div>

          <div className="card">
            <h3 className="text-sm font-bold text-muted mb-4 uppercase tracking-wider">Customer Information</h3>
            <div className="grid-2">
              <DetailRow label="Name" value={`${app.customers?.first_name} ${app.customers?.last_name}`} />
              <DetailRow label="Phone" value={app.customers?.phone} />
              <DetailRow label="PAN Number" value={<span className="font-mono uppercase">{app.customers?.pan_number}</span>} />
              <DetailRow label="Date of Birth" value={new Date(app.customers?.date_of_birth).toLocaleDateString('en-IN')} />
            </div>
          </div>

          <div className="card">
            <h3 className="text-sm font-bold text-muted mb-4 uppercase tracking-wider">Dealer & Staff</h3>
            <div className="grid-2">
              <DetailRow label="Dealer" value={app.dealers?.business_name || 'Direct'} />
              <DetailRow label="Assigned To" value={app.staff?.name || 'Unassigned'} />
            </div>
          </div>
        </div>

        {/* Right Column: Stage Timeline */}
        <div className="card">
          <h3 className="text-sm font-bold text-muted mb-4 uppercase tracking-wider">Stage Timeline</h3>
          {stagesLoading ? <LoadingRows cols={1} rows={4} /> : stages.length === 0 ? (
            <div className="text-muted text-sm">No stage entries yet.</div>
          ) : (
            <div className="flex flex-col gap-4 relative">
              <div style={{ position: 'absolute', left: 11, top: 20, bottom: 20, width: 2, background: 'var(--color-border)' }} />
              {stages.map((stg, i) => (
                <div key={stg.id} style={{ display: 'flex', gap: 16, position: 'relative', zIndex: 1 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--color-surface)', border: `2px solid ${stg.status === 'approved' ? 'var(--color-emerald)' : stg.status === 'rejected' ? 'var(--color-rose)' : 'var(--color-amber)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: stg.status === 'approved' ? 'var(--color-emerald)' : stg.status === 'rejected' ? 'var(--color-rose)' : 'var(--color-amber)' }} />
                  </div>
                  <div style={{ flex: 1, padding: 12, background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm capitalize">{stg.stage_name.replace(/_/g, ' ')}</span>
                      <span className="text-xs text-muted font-mono">{new Date(stg.created_at).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="mb-2">
                      <StatusBadge status={stg.status} />
                    </div>
                    {stg.notes && <p className="text-sm text-text-2 mt-2">{stg.notes}</p>}
                    {stg.staff && <p className="text-xs text-muted mt-2">— by {stg.staff.name}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {modal === 'stage' && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Add Stage Entry ({app.current_stage})</h3>
            <div className="field">
              <label>Status</label>
              <select className="select" value={stageStatus} onChange={e => setStageStatus(e.target.value)}>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="field">
              <label>Notes</label>
              <textarea className="input" rows="3" value={stageNotes} onChange={e => setStageNotes(e.target.value)} placeholder="Add internal notes for this stage..."></textarea>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddStageEntry} disabled={addingEntry}>{addingEntry ? 'Saving...' : 'Save Entry'}</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 1000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
        .modal-content { background: var(--color-surface-2); border: 1px solid var(--color-border); border-radius: var(--radius-xl); padding: 32px; width: 440px; }
      `}</style>
    </>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="mb-4">
      <div className="text-xs font-bold text-muted uppercase tracking-wider mb-1">{label}</div>
      <div className="text-sm font-medium">{value || '—'}</div>
    </div>
  );
}
