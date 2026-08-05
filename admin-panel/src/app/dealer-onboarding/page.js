'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { setHeaderInfo } from '@/store/slices/uiSlice';
import { StatusBadge, LoadingRows, EmptyState } from '@/components/ui/Primitives';
import { IconCheck, IconX, IconChevronRight } from '@tabler/icons-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('sk_admin_token') : ''; }

const STATUS_COLORS = {
  pending: 'orange',
  under_review: 'blue',
  approved: 'green',
  rejected: 'red',
};

export default function DealerOnboardingPage() {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(setHeaderInfo({ title: 'Dealer Onboarding', breadcrumbs: ['Operations', 'Dealer Onboarding'] }));
  }, [dispatch]);

  const [statusFilter, setStatusFilter] = useState('under_review');
  const [dealers, setDealers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);    // selected dealer for detail panel
  const [actionLoading, setActionLoading] = useState(false);

  // Modal state
  const [approveModal, setApproveModal] = useState(false);
  const [dealerCode, setDealerCode] = useState('');
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const fetchDealers = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/admin/dealer-onboarding?status=${statusFilter}&limit=50`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      const d = await r.json();
      setDealers(d?.data?.dealers || []);
      setTotal(d?.data?.total || 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { fetchDealers(); }, [fetchDealers]);

  const handleApprove = async () => {
    if (!dealerCode.trim()) { alert('Please enter a dealer code'); return; }
    setActionLoading(true);
    try {
      const r = await fetch(`${API_URL}/admin/dealer-onboarding/${selected.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ dealer_code: dealerCode })
      });
      if (!r.ok) throw new Error('Approval failed');
      setApproveModal(false); setDealerCode(''); setSelected(null);
      fetchDealers();
    } catch (e) { alert(e.message); }
    finally { setActionLoading(false); }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) { alert('Please enter a rejection reason'); return; }
    setActionLoading(true);
    try {
      const r = await fetch(`${API_URL}/admin/dealer-onboarding/${selected.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ reason: rejectReason })
      });
      if (!r.ok) throw new Error('Rejection failed');
      setRejectModal(false); setRejectReason(''); setSelected(null);
      fetchDealers();
    } catch (e) { alert(e.message); }
    finally { setActionLoading(false); }
  };

  return (
    <div style={{ display: 'flex', gap: 16, height: '100%' }}>
      {/* List Panel */}
      <div style={{ flex: selected ? '0 0 420px' : 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8 }}>
          {['under_review', 'pending', 'approved', 'rejected'].map(s => (
            <button key={s} onClick={() => { setStatusFilter(s); setSelected(null); }}
              style={{
                padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: 13,
                backgroundColor: statusFilter === s ? '#3b82f6' : 'var(--color-surface)',
                color: statusFilter === s ? 'white' : 'var(--color-text-secondary)',
              }}>
              {s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </button>
          ))}
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table" style={{ width: '100%' }}>
            <thead><tr>
              <th>Name</th><th>Business</th><th>City</th><th>Submitted</th><th>Status</th><th></th>
            </tr></thead>
            <tbody>
              {loading ? <LoadingRows cols={6} /> : dealers.length === 0 ?
                <tr><td colSpan={6}><EmptyState message={`No dealers with status: ${statusFilter}`} /></td></tr> :
                dealers.map(d => (
                  <tr key={d.id} onClick={() => setSelected(d)} style={{ cursor: 'pointer', backgroundColor: selected?.id === d.id ? 'rgba(59,130,246,0.08)' : undefined }}>
                    <td>{d.profiles?.full_name || '—'}</td>
                    <td>{d.business_name || '—'}</td>
                    <td>{d.city || '—'}</td>
                    <td>{d.onboarding_submitted_at ? new Date(d.onboarding_submitted_at).toLocaleDateString() : '—'}</td>
                    <td><StatusBadge status={d.onboarding_status} /></td>
                    <td><IconChevronRight size={16} /></td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Panel */}
      {selected && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18 }}>{selected.profiles?.full_name}</h2>
                <p style={{ margin: '4px 0 0', color: 'var(--color-text-secondary)', fontSize: 13 }}>
                  {selected.profiles?.phone} · {selected.profiles?.email}
                </p>
              </div>
              <StatusBadge status={selected.onboarding_status} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              {[
                ['Business Name', selected.business_name],
                ['PAN Number', selected.pan_number],
                ['GST Number', selected.gst_number],
                ['Address', selected.business_address],
                ['City', selected.city],
                ['State', selected.state],
                ['Pincode', selected.pincode],
                ['Bank', selected.bank_name],
                ['Account No.', selected.bank_account_number],
                ['IFSC', selected.bank_ifsc],
              ].map(([label, value]) => (
                <div key={label}>
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 2 }}>{label}</div>
                  <div style={{ fontWeight: 500 }}>{value || '—'}</div>
                </div>
              ))}
            </div>

            {/* Documents */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Uploaded Documents</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                {Object.entries(selected.documents || {}).map(([key, url]) => url ? (
                  <div key={key} style={{
                    border: '1px solid var(--color-border)', borderRadius: 8, padding: 10,
                    backgroundColor: 'var(--color-surface)', display: 'flex', flexDirection: 'column', gap: 6
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                      {key.replace(/_url$/, '').replace(/_/g, ' ').toUpperCase()}
                    </div>
                    <a href={url} target="_blank" rel="noreferrer" style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12,
                      color: '#3b82f6', fontWeight: 500, textDecoration: 'none'
                    }}>
                      📄 View Document ↗
                    </a>
                  </div>
                ) : null)}
                {Object.values(selected.documents || {}).filter(Boolean).length === 0 && (
                  <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', gridColumn: '1 / -1' }}>
                    No documents uploaded yet
                  </span>
                )}
              </div>
            </div>

            {/* Rejection reason if rejected */}
            {selected.onboarding_rejection_reason && (
              <div style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#ef4444', marginBottom: 4 }}>Rejection Reason</div>
                <div style={{ fontSize: 13 }}>{selected.onboarding_rejection_reason}</div>
              </div>
            )}

            {/* Actions */}
            {selected.onboarding_status === 'under_review' && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setApproveModal(true)}
                  style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer', backgroundColor: '#10b981', color: 'white', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <IconCheck size={16} /> Approve
                </button>
                <button onClick={() => setRejectModal(true)}
                  style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer', backgroundColor: '#ef4444', color: 'white', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <IconX size={16} /> Reject
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {approveModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: 360, padding: 24 }}>
            <h3 style={{ margin: '0 0 4px' }}>Approve Dealer</h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--color-text-secondary)' }}>Assign a unique dealer code to activate their account.</p>
            <input value={dealerCode} onChange={e => setDealerCode(e.target.value)} placeholder="e.g. DLR-010"
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', fontSize: 14, marginBottom: 16, boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setApproveModal(false)} style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px solid var(--color-border)', cursor: 'pointer', backgroundColor: 'transparent', color: 'var(--color-text)' }}>Cancel</button>
              <button onClick={handleApprove} disabled={actionLoading}
                style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer', backgroundColor: '#10b981', color: 'white', fontWeight: 600 }}>
                {actionLoading ? 'Approving...' : 'Confirm Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: 380, padding: 24 }}>
            <h3 style={{ margin: '0 0 4px' }}>Reject Application</h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--color-text-secondary)' }}>Provide a reason so the dealer knows how to fix their application.</p>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="e.g. PAN card image is blurry. Please reupload a clear photo."
              rows={4}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', fontSize: 14, marginBottom: 16, boxSizing: 'border-box', resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setRejectModal(false)} style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px solid var(--color-border)', cursor: 'pointer', backgroundColor: 'transparent', color: 'var(--color-text)' }}>Cancel</button>
              <button onClick={handleReject} disabled={actionLoading}
                style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer', backgroundColor: '#ef4444', color: 'white', fontWeight: 600 }}>
                {actionLoading ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
