'use client';

import { useGetWithdrawalsQuery, useProcessWithdrawalMutation } from '@/store/api/adminApi';
import { StatusBadge, LoadingRows, EmptyState, AmountCell } from '@/components/ui/Primitives';
import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function WithdrawalsPageContent() {
  const searchParams = useSearchParams();
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [modal, setModal] = useState(null);

  const { data, isLoading, refetch } = useGetWithdrawalsQuery({ status: statusFilter || undefined });
  const [processWithdrawal, { isLoading: processing }] = useProcessWithdrawalMutation();
  const withdrawals = data?.data || [];

  async function handleProcess(wr, approved) {
    const body = approved
      ? { approved: true, payout_utr: modal?.utr || '', payout_date: modal?.date || new Date().toISOString().slice(0,10) }
      : { approved: false, rejection_reason: modal?.reason || 'Rejected' };
    await processWithdrawal({ id: wr.id, ...body });
    setModal(null);
    refetch();
  }

  return (
    <>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Withdrawal Requests</h1>
          <p className="page-desc">Dealer payout requests</p>
        </div>
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {['', 'requested', 'processed', 'rejected'].map(s => (
          <button key={s} className={`date-preset-btn${statusFilter === s ? ' active' : ''}`} onClick={() => setStatusFilter(s)} id={`filter-${s || 'all'}`}>
            {s ? s : 'All'}
          </button>
        ))}
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Dealer</th>
              <th>Amount Requested</th>
              <th>Status</th>
              <th>Requested On</th>
              <th>Processed On</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? <LoadingRows cols={6} /> : withdrawals.length === 0 ? (
              <EmptyState title="No withdrawal requests" description="No requests matching the current filter." />
            ) : withdrawals.map((wr) => (
              <tr key={wr.id} style={{ cursor: 'default' }}>
                <td>{wr.dealers?.business_name || '—'}</td>
                <td style={{ fontWeight: 700 }}><AmountCell value={wr.amount_requested} /></td>
                <td><StatusBadge status={wr.status} /></td>
                <td className="text-muted text-sm">{new Date(wr.created_at).toLocaleDateString('en-IN')}</td>
                <td className="text-muted text-sm">{wr.processed_at ? new Date(wr.processed_at).toLocaleDateString('en-IN') : '—'}</td>
                <td>
                  {wr.status === 'requested' && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-primary btn-sm" onClick={() => setModal({ wr, action: 'approve' })} id={`approve-${wr.id}`}>Approve</button>
                      <button className="btn btn-danger btn-sm" onClick={() => setModal({ wr, action: 'reject' })} id={`reject-${wr.id}`}>Reject</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Process Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }} onClick={() => setModal(null)}>
          <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 32, width: 400 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>
              {modal.action === 'approve' ? '✓ Approve Payout' : '✗ Reject Withdrawal'}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--color-text-3)', marginBottom: 20 }}>
              Amount: <strong style={{ color: 'var(--color-text)' }}>₹{Number(modal.wr.amount_requested).toLocaleString('en-IN')}</strong>
            </p>
            {modal.action === 'approve' ? (
              <>
                <div className="field">
                  <label>UTR Number</label>
                  <input className="input" placeholder="e.g. HDFC202600001" id="payout-utr" onChange={e => setModal(m => ({ ...m, utr: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Payout Date</label>
                  <input className="input" type="date" id="payout-date" defaultValue={new Date().toISOString().slice(0,10)} onChange={e => setModal(m => ({ ...m, date: e.target.value }))} />
                </div>
              </>
            ) : (
              <div className="field">
                <label>Rejection Reason</label>
                <input className="input" placeholder="Enter reason" id="reject-reason" onChange={e => setModal(m => ({ ...m, reason: e.target.value }))} />
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button
                className={`btn ${modal.action === 'approve' ? 'btn-primary' : 'btn-danger'}`}
                disabled={processing}
                onClick={() => handleProcess(modal.wr, modal.action === 'approve')}
                id="confirm-action-btn"
              >
                {processing ? '…' : modal.action === 'approve' ? 'Confirm Payout' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function WithdrawalsPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading withdrawals...</div>}>
      <WithdrawalsPageContent />
    </Suspense>
  );
}
