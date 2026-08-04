'use client';

import { useGetStaffQuery, useCreateStaffMutation, useUpdateStaffMutation, useDeleteStaffMutation } from '@/store/api/adminApi';
import { StatusBadge, LoadingRows, EmptyState } from '@/components/ui/Primitives';
import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setHeaderInfo } from '@/store/slices/uiSlice';
import ExportButtons from '@/components/ui/ExportButtons';

export default function StaffPage() {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(setHeaderInfo({ title: 'Internal Staff', breadcrumbs: ['Operations', 'Staff'] }));
  }, [dispatch]);
  const { data, isLoading, refetch } = useGetStaffQuery();
  const [createStaff, { isLoading: creating }] = useCreateStaffMutation();
  const [deleteStaff] = useDeleteStaffMutation();
  
  const [showModal, setShowModal] = useState(false);
  const [staffToEdit, setStaffToEdit] = useState(null);
  const [newStaff, setNewStaff] = useState({ name: '', email: '', phone: '', password: '', role: 'staff' });
  
  const staff = data?.data || [];

  const exportColumns = [
    { header: 'S.No', accessor: (_, i) => i + 1 },
    { header: 'Name', accessor: (s) => s.profiles?.full_name || '—' },
    { header: 'Role', accessor: (s) => (s.profiles?.role || 'staff').replace(/_/g, ' ') },
    { header: 'Phone', accessor: 'phone' },
    { header: 'Email', accessor: (s) => s.profiles?.email || '—' },
    { header: 'Status', accessor: (s) => s.is_active ? 'Active' : 'Inactive' },
    { header: 'Joined On', accessor: (s) => new Date(s.created_at).toLocaleDateString() },
  ];

  async function handleCreate(e) {
    e.preventDefault();
    try {
      await createStaff({
        full_name: newStaff.name,
        email: newStaff.email,
        phone: newStaff.phone,
        password: newStaff.password,
        role: newStaff.role
      }).unwrap();
      setShowModal(false);
      setNewStaff({ name: '', email: '', phone: '', password: '', role: 'staff' });
      refetch();
    } catch (err) {
      alert(`Failed to create staff: ${err.data?.error?.message || err.message}`);
    }
  }

  async function handleDelete(member) {
    if (confirm(`Are you sure you want to delete ${member.profiles?.full_name || member.staff_code}?`)) {
      try {
        await deleteStaff(member.id).unwrap();
        refetch();
      } catch (err) {
        alert(`Failed to delete staff: ${err.data?.error?.message || err.message}`);
      }
    }
  }

  return (
    <>
      <div className="page-header flex items-center justify-between">
        <ExportButtons data={staff} columns={exportColumns} filename="staff_list" title="Internal Staff" />
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Staff</button>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Name</th>
              <th>Role</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Status</th>
              <th>Joined On</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? <LoadingRows cols={8} /> : staff.length === 0 ? (
              <EmptyState title="No staff members" description="No internal staff have been added yet." />
            ) : staff.map((member, idx) => (
              <tr key={member.id}>
                <td style={{ color: 'var(--color-text-3)' }}>{idx + 1}</td>
                <td style={{ fontWeight: 600 }}>{member.profiles?.full_name || '—'}</td>
                <td style={{ textTransform: 'capitalize' }}>
                  <span className={`badge badge-${member.profiles?.role === 'admin' ? 'earned' : 'draft'}`}>
                    {(member.profiles?.role || 'staff').replace(/_/g, ' ')}
                  </span>
                </td>
                <td><span className="font-mono">{member.phone || '—'}</span></td>
                <td>{member.profiles?.email || '—'}</td>
                <td><StatusBadge status={member.is_active ? 'active' : 'inactive'} /></td>
                <td className="text-muted text-sm">{new Date(member.created_at).toLocaleDateString('en-IN')}</td>
                <td>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setStaffToEdit(member)}>Edit</button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-rose)' }} onClick={() => handleDelete(member)}>Delete</button>
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
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>Add New Staff</h3>
              <button type="button" className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            
            <div className="field">
              <label>Full Name *</label>
              <input required className="input w-full" value={newStaff.name} onChange={e => setNewStaff({...newStaff, name: e.target.value})} placeholder="E.g. Ramesh Kumar" />
            </div>
            <div className="grid-2" style={{ marginTop: 12 }}>
              <div className="field">
                <label>Phone *</label>
                <input required className="input w-full" value={newStaff.phone} onChange={e => setNewStaff({...newStaff, phone: e.target.value})} placeholder="10-digit number" />
              </div>
              <div className="field">
                <label>Email *</label>
                <input required type="email" className="input w-full" value={newStaff.email} onChange={e => setNewStaff({...newStaff, email: e.target.value})} placeholder="ramesh@skfinance.com" />
              </div>
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <label>Password *</label>
              <input required type="password" className="input w-full" value={newStaff.password} onChange={e => setNewStaff({...newStaff, password: e.target.value})} placeholder="••••••••" />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={creating}>{creating ? 'Creating...' : 'Add Staff'}</button>
            </div>
          </form>
        </div>
      )}

      {staffToEdit && (
        <EditStaffModal member={staffToEdit} onClose={() => { setStaffToEdit(null); refetch(); }} />
      )}
    </>
  );
}

function EditStaffModal({ member, onClose }) {
  const [updateStaff, { isLoading }] = useUpdateStaffMutation();
  const [formData, setFormData] = useState({ 
    full_name: member.profiles?.full_name || '', 
    phone: member.phone || '', 
    role: member.profiles?.role || 'staff',
    is_active: member.is_active,
    password: ''
  });
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      await updateStaff({ id: member.id, ...formData }).unwrap();
      onClose();
    } catch (err) {
      setError(err.data?.error?.message || err.message || 'Failed to update staff');
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <form style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 32, width: 440 }} onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700 }}>Edit Staff: {member.staff_code}</h3>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        
        {error && <div style={{ padding: 12, background: 'var(--color-rose-bg)', color: 'var(--color-rose)', fontSize: 13, borderRadius: 8, marginBottom: 16 }}>{error}</div>}

        <div className="field">
          <label>Full Name *</label>
          <input required className="input w-full" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
        </div>
        
        <div className="field" style={{ marginTop: 12 }}>
          <label>Phone *</label>
          <input required className="input w-full" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
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
