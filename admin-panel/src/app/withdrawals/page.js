'use client';

import { useGetWithdrawalsQuery, useProcessWithdrawalMutation } from '@/store/api/adminApi';
import { setHeaderInfo } from '@/store/slices/uiSlice';
import { useDispatch } from 'react-redux';
import { StatusBadge, LoadingRows, EmptyState, AmountCell } from '@/components/ui/Primitives';
import ExportButtons from '@/components/ui/ExportButtons';
import { useState, Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

function WithdrawalsPageContent() {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(setHeaderInfo({ title: 'Withdrawal Requests', breadcrumbs: ['Finance', 'Withdrawals'] }));
  }, [dispatch]);

  const searchParams = useSearchParams();
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [modal, setModal] = useState(null);

  const { data, isLoading, refetch } = useGetWithdrawalsQuery({ status: statusFilter || undefined });
  const [processWithdrawal, { isLoading: processing }] = useProcessWithdrawalMutation();
  const rawWithdrawals = data?.data || [];
  
  const withdrawals = rawWithdrawals.filter(w => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const dealerName = w.dealers?.business_name?.toLowerCase() || '';
      if (!dealerName.includes(q)) return false;
    }
    return true;
  });

  const exportColumns = [
    { header: 'S.No', accessor: (_, i) => i + 1 },
    { header: 'Dealer', accessor: (w) => w.dealers?.business_name || '—' },
    { header: 'Amount Requested', accessor: 'amount' },
    { header: 'Status', accessor: 'status' },
    { header: 'Requested On', accessor: (w) => new Date(w.created_at).toLocaleDateString() },
    { header: 'Processed On', accessor: (w) => w.processed_at ? new Date(w.processed_at).toLocaleDateString() : '—' },
    { header: 'Payout UTR', accessor: (w) => w.payout_utr || '—' },
    { header: 'Rejection Reason', accessor: (w) => w.rejection_reason || '—' },
  ];

  async function handleProcess(wr, approved) {
    const body = approved
      ? { 
          approved: true, 
          payout_utr: modal?.utr || '', 
          payout_date: modal?.date || new Date().toISOString().slice(0,10),
          receipt_pdf_url: modal?.receiptPdfUrl || '',
          receipt_pdf_name: modal?.receiptPdfName || ''
        }
      : { approved: false, rejection_reason: modal?.reason || 'Rejected' };
    await processWithdrawal({ id: wr.id, ...body });
    setModal(null);
    refetch();
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      setModal(m => ({
        ...m,
        receiptPdfUrl: evt.target.result,
        receiptPdfName: file.name
      }));
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      {/* Filter and Export */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            type="text"
            className="input"
            placeholder="Search Dealer..."
            style={{ width: 220 }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        {['', 'requested', 'processed', 'rejected'].map(s => (
          <button key={s} className={`date-preset-btn${statusFilter === s ? ' active' : ''}`} onClick={() => setStatusFilter(s)} id={`filter-${s || 'all'}`}>
            {s ? s : 'All'}
          </button>
        ))}
      </div>
        <ExportButtons data={withdrawals} columns={exportColumns} filename="withdrawals_list" title="Withdrawal Requests" />
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Dealer</th>
              <th>Amount Requested</th>
              <th>Status</th>
              <th>Requested On</th>
              <th>Processed Date / UTR</th>
              <th>Receipt PDF</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? <LoadingRows cols={8} /> : withdrawals.length === 0 ? (
              <EmptyState title="No withdrawal requests" description="No requests matching the current filter." />
            ) : withdrawals.map((wr, idx) => (
              <tr key={wr.id} style={{ cursor: 'default' }}>
                <td style={{ color: 'var(--color-text-3)' }}>{idx + 1}</td>
                <td style={{ fontWeight: 600 }}>{wr.dealers?.business_name || '—'}</td>
                <td style={{ fontWeight: 700 }}><AmountCell value={wr.amount_requested} /></td>
                <td><StatusBadge status={wr.status} /></td>
                <td className="text-muted text-sm">{new Date(wr.created_at).toLocaleDateString('en-IN')}</td>
                <td className="text-muted text-sm">
                  {wr.processed_at ? (
                    <div>
                      <div>{new Date(wr.processed_at).toLocaleDateString('en-IN')}</div>
                      {wr.payout_utr && <div style={{ fontSize: 11, color: '#2563eb', fontWeight: 600 }}>UTR: {wr.payout_utr}</div>}
                    </div>
                  ) : '—'}
                </td>
                <td className="text-sm">
                  {wr.receipt_pdf_url ? (
                    <a href={wr.receipt_pdf_url} target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'underline' }}>
                      📄 View Receipt
                    </a>
                  ) : '—'}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <a className="btn btn-secondary btn-sm" href={`/commissions?dealer_id=${wr.dealer_id || wr.dealers?.id}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                      Audit Commissions
                    </a>
                    {wr.status === 'requested' && (
                      <>
                        <button className="btn btn-primary btn-sm" onClick={() => setModal({ wr, action: 'approve' })} id={`approve-${wr.id}`}>Approve</button>
                        <button className="btn btn-danger btn-sm" onClick={() => setModal({ wr, action: 'reject' })} id={`reject-${wr.id}`}>Reject</button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Process Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }} onClick={() => setModal(null)}>
          <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 32, width: 420 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>
              {modal.action === 'approve' ? '✓ Approve Manual Payout' : '✗ Reject Withdrawal'}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--color-text-3)', marginBottom: 20 }}>
              Amount: <strong style={{ color: 'var(--color-text)' }}>₹{Number(modal?.wr?.amount_requested || modal?.wr?.amount || 0).toLocaleString('en-IN')}</strong>
            </p>
            {modal.action === 'approve' ? (
              <>
                <div className="field">
                  <label>Bank UTR / Ref Number</label>
                  <input className="input" placeholder="e.g. HDFC202600001" id="payout-utr" onChange={e => setModal(m => ({ ...m, utr: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Payout Date</label>
                  <input className="input" type="date" id="payout-date" defaultValue={new Date().toISOString().slice(0,10)} onChange={e => setModal(m => ({ ...m, date: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Upload Payment Receipt (PDF / Image)</label>
                  <input className="input" type="file" accept="application/pdf,image/*" id="payout-receipt" onChange={handleFileChange} />
                  {modal?.receiptPdfName && (
                    <div style={{ fontSize: 12, color: '#10b981', marginTop: 4, fontWeight: 600 }}>
                      ✓ File selected: {modal.receiptPdfName}
                    </div>
                  )}
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
