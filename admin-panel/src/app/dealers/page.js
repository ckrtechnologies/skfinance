'use client';

import { useGetDealersQuery, useCreateDealerMutation, useUpdateDealerMutation, useDeleteDealerMutation } from '@/store/api/adminApi';
import { StatusBadge, LoadingRows, EmptyState } from '@/components/ui/Primitives';
import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setHeaderInfo } from '@/store/slices/uiSlice';
import { selectDateRange } from '@/store/slices/dateRangeSlice';
import ExportButtons from '@/components/ui/ExportButtons';

export default function DealersPage() {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(setHeaderInfo({ title: 'Dealers', breadcrumbs: ['Operations', 'Dealers'] }));
  }, [dispatch]);
  
  const dateRange = useSelector(selectDateRange);
  
  const { data, isLoading, refetch } = useGetDealersQuery({
    from: dateRange?.from,
    to: dateRange?.to
  });
  const [createDealer, { isLoading: creating }] = useCreateDealerMutation();
  const [deleteDealer] = useDeleteDealerMutation();
  
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const [showModal, setShowModal] = useState(false);
  const [dealerToEdit, setDealerToEdit] = useState(null);
  const [dealerToView, setDealerToView] = useState(null);
  const [newDealer, setNewDealer] = useState({ business_name: '', email: '', phone: '', pan_number: '', gst_number: '', password: '' });
  
  const dealers = data?.data || [];

  const sortedDealers = [...dealers].sort((a, b) => {
    let aVal, bVal;
    switch(sortConfig.key) {
      case 'business_name':
        aVal = a.business_name || a.profiles?.full_name || '';
        bVal = b.business_name || b.profiles?.full_name || '';
        break;
      case 'phone':
        aVal = a.phone || a.profiles?.phone || '';
        bVal = b.phone || b.profiles?.phone || '';
        break;
      case 'email':
        aVal = a.email || a.profiles?.email || '';
        bVal = b.email || b.profiles?.email || '';
        break;
      case 'pan_number':
        aVal = a.pan_number || '';
        bVal = b.pan_number || '';
        break;
      case 'is_active':
        aVal = a.is_active ? 1 : 0;
        bVal = b.is_active ? 1 : 0;
        break;
      case 'created_at':
        aVal = new Date(a.created_at).getTime();
        bVal = new Date(b.created_at).getTime();
        break;
      case 'onboarding_submitted_at':
        aVal = a.onboarding_submitted_at ? new Date(a.onboarding_submitted_at).getTime() : 0;
        bVal = b.onboarding_submitted_at ? new Date(b.onboarding_submitted_at).getTime() : 0;
        break;
      default:
        aVal = ''; bVal = '';
    }
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return <span style={{ opacity: 0.3, marginLeft: 4 }}>↕</span>;
    return <span style={{ marginLeft: 4 }}>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
  };

  const exportColumns = [
    { header: 'S.No', accessor: (_, i) => i + 1 },
    { header: 'Business Name', accessor: (d) => d.business_name || d.profiles?.full_name || '—' },
    { header: 'Phone', accessor: (d) => d.phone || d.profiles?.phone || '—' },
    { header: 'Email', accessor: (d) => d.email || d.profiles?.email || '—' },
    { header: 'PAN', accessor: 'pan_number' },
    { header: 'GST', accessor: 'gst_number' },
    { header: 'Status', accessor: (d) => d.is_active ? 'Active' : 'Inactive' },
    { header: 'Joined On', accessor: (d) => new Date(d.created_at).toLocaleDateString() },
    { header: 'Onboarded On', accessor: (d) => d.onboarding_submitted_at ? new Date(d.onboarding_submitted_at).toLocaleDateString() : '—' },
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
        <ExportButtons data={sortedDealers} columns={exportColumns} filename="dealers_list" title="Dealers" />
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Onboard Dealer</button>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th onClick={() => handleSort('business_name')} style={{ cursor: 'pointer' }}>Business Name <SortIcon columnKey="business_name" /></th>
              <th onClick={() => handleSort('phone')} style={{ cursor: 'pointer' }}>Phone <SortIcon columnKey="phone" /></th>
              <th onClick={() => handleSort('email')} style={{ cursor: 'pointer' }}>Email <SortIcon columnKey="email" /></th>
              <th onClick={() => handleSort('pan_number')} style={{ cursor: 'pointer' }}>PAN / GST <SortIcon columnKey="pan_number" /></th>
              <th onClick={() => handleSort('is_active')} style={{ cursor: 'pointer' }}>Status <SortIcon columnKey="is_active" /></th>
              <th onClick={() => handleSort('created_at')} style={{ cursor: 'pointer' }}>Joined On <SortIcon columnKey="created_at" /></th>
              <th onClick={() => handleSort('onboarding_submitted_at')} style={{ cursor: 'pointer' }}>Onboarded On <SortIcon columnKey="onboarding_submitted_at" /></th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? <LoadingRows cols={9} /> : sortedDealers.length === 0 ? (
              <EmptyState title="No dealers" description="No dealers have been onboarded yet." />
            ) : sortedDealers.map((dealer, idx) => (
              <tr key={dealer.id}>
                <td style={{ color: 'var(--color-text-3)' }}>{idx + 1}</td>
                <td style={{ fontWeight: 600 }}>
                  <div>{dealer.business_name || dealer.profiles?.full_name || '—'}</div>
                  {dealer.dealer_code && <div className="text-muted text-sm font-mono mt-1" style={{ fontSize: 12 }}>{dealer.dealer_code}</div>}
                </td>
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
                <td className="text-muted text-sm">{dealer.onboarding_submitted_at ? new Date(dealer.onboarding_submitted_at).toLocaleDateString('en-IN') : '—'}</td>
                <td>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setDealerToView(dealer)}>View</button>
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

      {dealerToView && (
        <ViewDealerModal dealer={dealerToView} onClose={() => setDealerToView(null)} />
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

function ViewDealerModal({ dealer, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 32, width: 540, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Dealer Details</h3>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          {[
            ['Business Name', dealer.business_name || dealer.profiles?.full_name],
            ['Dealer Code', dealer.dealer_code],
            ['PAN Number', dealer.pan_number],
            ['GST Number', dealer.gst_number],
            ['Phone', dealer.phone || dealer.profiles?.phone],
            ['Email', dealer.email || dealer.profiles?.email],
            ['Address', dealer.business_address],
            ['City', dealer.city],
            ['State', dealer.state],
            ['Pincode', dealer.pincode],
            ['Bank', dealer.bank_name],
            ['Account Number', dealer.account_number],
            ['IFSC Code', dealer.ifsc_code],
            ['Account Name', dealer.account_name],
          ].map(([label, value]) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text)' }}>{value || '—'}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
