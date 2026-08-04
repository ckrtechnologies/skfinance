'use client';

import { useGetStaffQuery, useCreateStaffMutation } from '@/store/api/adminApi';
import { StatusBadge, LoadingRows, EmptyState } from '@/components/ui/Primitives';
import { useState } from 'react';

export default function StaffPage() {
  const { data, isLoading, refetch } = useGetStaffQuery();
  const [createStaff, { isLoading: creating }] = useCreateStaffMutation();
  const [showModal, setShowModal] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: '', email: '', phone: '', role: 'field_agent' });
  
  const staff = data?.data || [];

  async function handleCreate(e) {
    e.preventDefault();
    await createStaff(newStaff);
    setShowModal(false);
    setNewStaff({ name: '', email: '', phone: '', role: 'field_agent' });
    refetch();
  }

  return (
    <>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Internal Staff</h1>
          <p className="page-desc">Manage platform staff (Field Agents, Credit Officers, Admins)</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Staff</button>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Status</th>
              <th>Joined On</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? <LoadingRows cols={6} /> : staff.length === 0 ? (
              <EmptyState title="No staff members" description="No internal staff have been added yet." />
            ) : staff.map((member) => (
              <tr key={member.id}>
                <td style={{ fontWeight: 600 }}>{member.name}</td>
                <td style={{ textTransform: 'capitalize' }}>
                  <span className={`badge badge-${member.role === 'admin' ? 'earned' : member.role === 'credit_officer' ? 'payout_pending' : 'draft'}`}>
                    {member.role.replace(/_/g, ' ')}
                  </span>
                </td>
                <td><span className="font-mono">{member.phone || '—'}</span></td>
                <td>{member.email || '—'}</td>
                <td><StatusBadge status={member.is_active ? 'active' : 'inactive'} /></td>
                <td className="text-muted text-sm">{new Date(member.created_at).toLocaleDateString('en-IN')}</td>
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
              <input required className="input" value={newStaff.name} onChange={e => setNewStaff({...newStaff, name: e.target.value})} placeholder="E.g. Ramesh Kumar" />
            </div>
            <div className="grid-2">
              <div className="field">
                <label>Phone *</label>
                <input required className="input" value={newStaff.phone} onChange={e => setNewStaff({...newStaff, phone: e.target.value})} placeholder="10-digit number" />
              </div>
              <div className="field">
                <label>Email *</label>
                <input required type="email" className="input" value={newStaff.email} onChange={e => setNewStaff({...newStaff, email: e.target.value})} placeholder="ramesh@skfinance.com" />
              </div>
            </div>
            <div className="field">
              <label>Role *</label>
              <select required className="select" value={newStaff.role} onChange={e => setNewStaff({...newStaff, role: e.target.value})}>
                <option value="field_agent">Field Agent</option>
                <option value="credit_officer">Credit Officer</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={creating}>{creating ? 'Creating...' : 'Add Staff'}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
