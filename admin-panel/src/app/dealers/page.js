'use client';

import { useGetDealersQuery, useCreateDealerMutation } from '@/store/api/adminApi';
import { StatusBadge, LoadingRows, EmptyState } from '@/components/ui/Primitives';
import { useState } from 'react';

export default function DealersPage() {
  const { data, isLoading, refetch } = useGetDealersQuery();
  const [createDealer, { isLoading: creating }] = useCreateDealerMutation();
  const [showModal, setShowModal] = useState(false);
  const [newDealer, setNewDealer] = useState({ business_name: '', email: '', phone: '', pan_number: '', gst_number: '' });
  
  const dealers = data?.data || [];

  async function handleCreate(e) {
    e.preventDefault();
    await createDealer(newDealer);
    setShowModal(false);
    setNewDealer({ business_name: '', email: '', phone: '', pan_number: '', gst_number: '' });
    refetch();
  }

  return (
    <>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Dealers</h1>
          <p className="page-desc">Manage automotive dealers onboarded to the platform</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Onboard Dealer</button>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Business Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>PAN / GST</th>
              <th>Status</th>
              <th>Joined On</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? <LoadingRows cols={6} /> : dealers.length === 0 ? (
              <EmptyState title="No dealers" description="No dealers have been onboarded yet." />
            ) : dealers.map((dealer) => (
              <tr key={dealer.id}>
                <td style={{ fontWeight: 600 }}>{dealer.business_name}</td>
                <td><span className="font-mono">{dealer.phone || '—'}</span></td>
                <td>{dealer.email || '—'}</td>
                <td>
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-sm">{dealer.pan_number}</span>
                    {dealer.gst_number && <span className="font-mono text-sm text-muted">GST: {dealer.gst_number}</span>}
                  </div>
                </td>
                <td><StatusBadge status={dealer.is_active ? 'active' : 'inactive'} /></td>
                <td className="text-muted text-sm">{new Date(dealer.created_at).toLocaleDateString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }} onClick={() => setShowModal(false)}>
          <form style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 32, width: 440 }} onClick={e => e.stopPropagation()} onSubmit={handleCreate}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>Onboard New Dealer</h3>
              <button type="button" className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            
            <div className="field">
              <label>Business Name *</label>
              <input required className="input" value={newDealer.business_name} onChange={e => setNewDealer({...newDealer, business_name: e.target.value})} placeholder="E.g. SK Motors" />
            </div>
            <div className="grid-2">
              <div className="field">
                <label>Phone *</label>
                <input required className="input" value={newDealer.phone} onChange={e => setNewDealer({...newDealer, phone: e.target.value})} placeholder="10-digit number" />
              </div>
              <div className="field">
                <label>Email *</label>
                <input required type="email" className="input" value={newDealer.email} onChange={e => setNewDealer({...newDealer, email: e.target.value})} placeholder="contact@skmotors.com" />
              </div>
            </div>
            <div className="grid-2">
              <div className="field">
                <label>PAN Number *</label>
                <input required className="input font-mono" style={{ textTransform: 'uppercase' }} value={newDealer.pan_number} onChange={e => setNewDealer({...newDealer, pan_number: e.target.value})} placeholder="ABCDE1234F" />
              </div>
              <div className="field">
                <label>GST Number</label>
                <input className="input font-mono" style={{ textTransform: 'uppercase' }} value={newDealer.gst_number} onChange={e => setNewDealer({...newDealer, gst_number: e.target.value})} placeholder="Optional" />
              </div>
            </div>
            <div className="field">
              <label>Default Commission Rate (%)</label>
              <input type="number" step="0.01" min="0" max="100" className="input" defaultValue={1.00} />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={creating}>{creating ? 'Creating...' : 'Create Dealer'}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
