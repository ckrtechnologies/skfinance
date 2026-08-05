'use client';

import { useGetDealersQuery, useCreateDealerMutation, useUpdateDealerMutation, useDeleteDealerMutation } from '@/store/api/adminApi';
import { StatusBadge, LoadingRows, EmptyState } from '@/components/ui/Primitives';
import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setHeaderInfo } from '@/store/slices/uiSlice';
import ExportButtons from '@/components/ui/ExportButtons';

export default function DealersPage() {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(setHeaderInfo({ title: 'Dealers', breadcrumbs: ['Operations', 'Dealers'] }));
  }, [dispatch]);
  const { data, isLoading, refetch } = useGetDealersQuery();
  const [createDealer, { isLoading: creating }] = useCreateDealerMutation();
  const [deleteDealer] = useDeleteDealerMutation();
  
  const [showModal, setShowModal] = useState(false);
  const [dealerToEdit, setDealerToEdit] = useState(null);
  const [newDealer, setNewDealer] = useState({ business_name: '', email: '', phone: '', pan_number: '', gst_number: '', password: '' });
  
  const dealers = data?.data || [];

  const exportColumns = [
    { header: 'S.No', accessor: (_, i) => i + 1 },
    { header: 'Business Name', accessor: (d) => d.business_name || d.profiles?.full_name || '—' },
    { header: 'Phone', accessor: (d) => d.phone || d.profiles?.phone || '—' },
    { header: 'Email', accessor: (d) => d.email || d.profiles?.email || '—' },
    { header: 'PAN', accessor: 'pan_number' },
    { header: 'GST', accessor: 'gst_number' },
    { header: 'Status', accessor: (d) => d.is_active ? 'Active' : 'Inactive' },
    { header: 'Joined On', accessor: (d) => new Date(d.created_at).toLocaleDateString() },
  ];

  async function handleCreate(e) {
    e.preventDefault();
    try {
      await createDealer(newDealer).unwrap();
      setShowModal(false);
      setNewDealer({ business_name: '', email: '', phone: '', pan_number: '', gst_number: '', password: '' });
      refetch();
    } catch (err) {
      alert(`Failed to create dealer: ${err.data?.error?.message || err.message}`);
    }
  }

  async function handleDelete(dealer) {
    const name = dealer.business_name || dealer.profiles?.full_name || dealer.dealer_code;
    if (confirm(`Are you sure you want to delete dealer ${name}?`)) {
      try {
        await deleteDealer(dealer.id).unwrap();
        refetch();
      } catch (err) {
        alert(`Failed to delete dealer: ${err.data?.error?.message || err.message}`);
      }
    }
  }

  return (
    <>
      <div className="page-header flex items-center justify-between">
        <ExportButtons data={dealers} columns={exportColumns} filename="dealers_list" title="Dealers" />
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Onboard Dealer</button>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Business Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>PAN / GST</th>
              <th>Status</th>
              <th>Joined On</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? <LoadingRows cols={8} /> : dealers.length === 0 ? (
              <EmptyState title="No dealers" description="No dealers have been onboarded yet." />
            ) : dealers.map((dealer, idx) => (
              <tr key={dealer.id}>
                <td style={{ color: 'var(--color-text-3)' }}>{idx + 1}</td>
                <td style={{ fontWeight: 600 }}>{dealer.business_name || dealer.profiles?.full_name || '—'}</td>
                <td><span className="font-mono">{dealer.phone || dealer.profiles?.phone || '—'}</span></td>
                <td>{dealer.email || dealer.profiles?.email || '—'}</td>
                <td>
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-sm">{dealer.pan_number || '—'}</span>
                    {dealer.gst_number && <span className="font-mono text-sm text-muted">GST: {dealer.gst_number}</span>}
                  </div>
                </td>
                <td><StatusBadge status={dealer.is_active ? 'active' : 'inactive'} /></td>
                <td className="text-muted text-sm">{new Date(dealer.created_at).toLocaleDateString('en-IN')}</td>
                <td>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setDealerToEdit(dealer)}>Edit</button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-rose)' }} onClick={() => handleDelete(dealer)}>Delete</button>
                  </div>
                </td>
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
            <div className="grid-2" style={{ marginTop: 12 }}>
              <div className="field">
                <label>Phone *</label>
                <input required className="input" value={newDealer.phone} onChange={e => setNewDealer({...newDealer, phone: e.target.value})} placeholder="10-digit number" />
              </div>
              <div className="field">
                <label>Email *</label>
                <input required type="email" className="input" value={newDealer.email} onChange={e => setNewDealer({...newDealer, email: e.target.value})} placeholder="contact@skmotors.com" />
              </div>
            </div>
            <div className="grid-2" style={{ marginTop: 12 }}>
              <div className="field">
                <label>PAN Number *</label>
                <input required className="input font-mono" style={{ textTransform: 'uppercase' }} value={newDealer.pan_number} onChange={e => setNewDealer({...newDealer, pan_number: e.target.value})} placeholder="ABCDE1234F" />
              </div>
              <div className="field">
                <label>GST Number</label>
                <input className="input font-mono" style={{ textTransform: 'uppercase' }} value={newDealer.gst_number} onChange={e => setNewDealer({...newDealer, gst_number: e.target.value})} placeholder="Optional" />
              </div>
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <label>Password *</label>
              <input required type="password" className="input" value={newDealer.password} onChange={e => setNewDealer({...newDealer, password: e.target.value})} placeholder="Set initial password" />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={creating}>{creating ? 'Creating...' : 'Create Dealer'}</button>
            </div>
          </form>
        </div>
      )}

      {dealerToEdit && (
        <EditDealerModal dealer={dealerToEdit} onClose={() => { setDealerToEdit(null); refetch(); }} />
      )}
    </>
  );
}

function EditDealerModal({ dealer, onClose }) {
  const [updateDealer, { isLoading }] = useUpdateDealerMutation();
  const [formData, setFormData] = useState({ 
    business_name: dealer.business_name || dealer.profiles?.full_name || '', 
    phone: dealer.phone || dealer.profiles?.phone || '', 
    email: dealer.email || dealer.profiles?.email || '',
    pan_number: dealer.pan_number || '',
    gst_number: dealer.gst_number || '',
    is_active: dealer.is_active ?? dealer.profiles?.is_active ?? true,
    password: ''
  });
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      await updateDealer({ id: dealer.id, ...formData }).unwrap();
      onClose();
    } catch (err) {
      setError(err.data?.error?.message || err.message || 'Failed to update dealer');
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <form style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 32, width: 440 }} onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700 }}>Edit Dealer: {dealer.dealer_code}</h3>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        
        {error && <div style={{ padding: 12, background: 'var(--color-rose-bg)', color: 'var(--color-rose)', fontSize: 13, borderRadius: 8, marginBottom: 16 }}>{error}</div>}

        <div className="field">
          <label>Business Name *</label>
          <input required className="input w-full" value={formData.business_name} onChange={e => setFormData({...formData, business_name: e.target.value})} />
        </div>
        
        <div className="grid-2" style={{ marginTop: 12 }}>
          <div className="field">
            <label>Phone *</label>
            <input required className="input w-full" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
          </div>
          <div className="field">
            <label>Email *</label>
            <input required type="email" className="input w-full" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
          </div>
        </div>

        <div className="grid-2" style={{ marginTop: 12 }}>
          <div className="field">
            <label>PAN Number *</label>
            <input required className="input w-full font-mono" style={{ textTransform: 'uppercase' }} value={formData.pan_number} onChange={e => setFormData({...formData, pan_number: e.target.value})} />
          </div>
          <div className="field">
            <label>GST Number</label>
            <input className="input w-full font-mono" style={{ textTransform: 'uppercase' }} value={formData.gst_number} onChange={e => setFormData({...formData, gst_number: e.target.value})} />
          </div>
        </div>

        <div className="field" style={{ marginTop: 12 }}>
          <label>New Password (Leave blank to keep current)</label>
          <input type="password" className="input w-full" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="••••••••" />
        </div>

        <div className="field" style={{ marginTop: 16 }}>
          <label className="toggle" style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
            />
            <span className="toggle-track" />
            <span style={{ fontSize: 14 }}>Active Account</span>
          </label>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isLoading}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={isLoading}>{isLoading ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </form>
    </div>
  );
}
