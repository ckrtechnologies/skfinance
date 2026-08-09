'use client';

import { useGetCustomersQuery, useUpdateCustomerMutation, useDeleteCustomerMutation } from '@/store/api/adminApi';
import { StatusBadge, LoadingRows, EmptyState } from '@/components/ui/Primitives';
import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setHeaderInfo } from '@/store/slices/uiSlice';
import ExportButtons from '@/components/ui/ExportButtons';

export default function CustomersPage() {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(setHeaderInfo({ title: 'Customers', breadcrumbs: ['Operations', 'Customers'] }));
  }, [dispatch]);
  const { data, isLoading, refetch } = useGetCustomersQuery();
  const [deleteCustomer] = useDeleteCustomerMutation();
  
  const [customerToEdit, setCustomerToEdit] = useState(null);
  
  const customers = data?.data || [];

  const exportColumns = [
    { header: 'S.No', accessor: (_, i) => i + 1 },
    { header: 'Name', accessor: (c) => c.profiles?.full_name || '—' },
    { header: 'Phone', accessor: 'profiles.phone' },
    { header: 'PAN', accessor: 'pan_number' },
    { header: 'Status', accessor: (c) => c.profiles?.is_active ? 'Active' : 'Inactive' },
    { header: 'Address', accessor: 'address_line1' },
    { header: 'Joined On', accessor: (c) => new Date(c.created_at).toLocaleDateString() },
  ];

  async function handleDelete(customer) {
    if (confirm(`Are you sure you want to delete ${customer.profiles?.full_name || 'this customer'}? This action cannot be undone.`)) {
      try {
        await deleteCustomer(customer.id).unwrap();
        refetch();
      } catch (err) {
        alert(`Failed to delete customer: ${err.data?.error?.message || err.message}`);
      }
    }
  }

  return (
    <>
      <div className="page-header flex items-center justify-between">
        <ExportButtons data={customers} columns={exportColumns} filename="customers_list" title="Customers" />
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>PAN Number</th>
              <th>Co-Applicant</th>
              <th>Address</th>
              <th>Status</th>
              <th>Joined On</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? <LoadingRows cols={9} /> : customers.length === 0 ? (
              <EmptyState title="No customers" description="No customers have been auto-generated yet." />
            ) : customers.map((customer, idx) => (
              <tr key={customer.id}>
                <td style={{ color: 'var(--color-text-3)' }}>{idx + 1}</td>
                <td style={{ fontWeight: 600 }}>{customer.profiles?.full_name || '—'}</td>
                <td><span className="font-mono">{customer.profiles?.phone || '—'}</span></td>
                <td>{customer.profiles?.email || '—'}</td>
                <td><span className="font-mono">{customer.pan_number || '—'}</span></td>
                <td>{customer.co_applicant_name || '—'}</td>
                <td style={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={customer.address_line1}>{customer.address_line1 || '—'}</td>
                <td><StatusBadge status={customer.profiles?.is_active ? 'active' : 'inactive'} /></td>
                <td className="text-muted text-sm">{new Date(customer.created_at).toLocaleDateString('en-IN')}</td>
                <td>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setCustomerToEdit(customer)}>Edit</button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-rose)' }} onClick={() => handleDelete(customer)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {customerToEdit && (
        <EditCustomerModal customer={customerToEdit} onClose={() => { setCustomerToEdit(null); refetch(); }} />
      )}
    </>
  );
}

function EditCustomerModal({ customer, onClose }) {
  const [updateCustomer, { isLoading }] = useUpdateCustomerMutation();
  const [formData, setFormData] = useState({ 
    full_name: customer.profiles?.full_name || '', 
    phone: customer.profiles?.phone || '', 
    email: customer.profiles?.email || '',
    pan_number: customer.pan_number || '',
    co_applicant_name: customer.co_applicant_name || '',
    address_line1: customer.address_line1 || '',
    dob: customer.dob || '',
    gender: customer.custom_fields?.digilocker_gender || '',
    fathername: customer.custom_fields?.digilocker_fathername || '',
    is_active: customer.profiles?.is_active !== false,
  });
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      await updateCustomer({ id: customer.id, ...formData }).unwrap();
      onClose();
    } catch (err) {
      setError(err.data?.error?.message || err.message || 'Failed to update customer');
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <form style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 32, width: 500, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700 }}>Edit Customer</h3>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        
        {error && <div style={{ padding: 12, background: 'var(--color-rose-bg)', color: 'var(--color-rose)', fontSize: 13, borderRadius: 8, marginBottom: 16 }}>{error}</div>}

        <div className="field">
          <label>Full Name *</label>
          <input required className="input w-full" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
        </div>
        
        <div className="grid-2" style={{ marginTop: 12 }}>
          <div className="field">
            <label>Phone *</label>
            <input required className="input w-full" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" className="input w-full" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
          </div>
        </div>

        <div className="grid-2" style={{ marginTop: 12 }}>
          <div className="field">
            <label>PAN Number</label>
            <input className="input w-full" value={formData.pan_number} onChange={e => setFormData({...formData, pan_number: e.target.value})} />
          </div>
          <div className="field">
            <label>Co-Applicant Name</label>
            <input className="input w-full" value={formData.co_applicant_name} onChange={e => setFormData({...formData, co_applicant_name: e.target.value})} />
          </div>
        </div>

        <div className="grid-2" style={{ marginTop: 12 }}>
          <div className="field">
            <label>Date of Birth</label>
            <input type="date" className="input w-full" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} />
          </div>
          <div className="field">
            <label>Gender (Read-only)</label>
            <input className="input w-full" disabled value={formData.gender} />
          </div>
        </div>

        <div className="field" style={{ marginTop: 12 }}>
          <label>Father's Name (Read-only)</label>
          <input className="input w-full" disabled value={formData.fathername?.replace('S/O ', '') || ''} />
        </div>

        <div className="field" style={{ marginTop: 12 }}>
          <label>Address</label>
          <textarea className="input w-full" rows="2" value={formData.address_line1} onChange={e => setFormData({...formData, address_line1: e.target.value})} />
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
