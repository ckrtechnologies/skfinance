'use client';

import { useGetLendersQuery, useUpdateLenderMutation, useCreateLenderMutation, useDeleteLenderMutation } from '@/store/api/adminApi';
import { StatusBadge } from '@/components/ui/Primitives';
import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setHeaderInfo } from '@/store/slices/uiSlice';
import Link from 'next/link';
import ExportButtons from '@/components/ui/ExportButtons';

export default function LendersPage() {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(setHeaderInfo({ title: 'Lenders', breadcrumbs: ['Operations', 'Lenders'] }));
  }, [dispatch]);
  const { data, isLoading } = useGetLendersQuery();
  const [updateLender, { isLoading: updating }] = useUpdateLenderMutation();
  const [deleteLender] = useDeleteLenderMutation();
  
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [lenderToEdit, setLenderToEdit] = useState(null);

  const lenders = data?.data || [];

  const exportColumns = [
    { header: 'S.No', accessor: (_, i) => i + 1 },
    { header: 'Lender', accessor: 'name' },
    { header: 'Code', accessor: 'code' },
    { header: 'Type', accessor: 'lender_type' },
    { header: 'Priority', accessor: 'priority' },
    { header: 'Status', accessor: (l) => l.is_active ? 'Active' : 'Inactive' },
  ];

  async function handleToggle(lender) {
    try {
      await updateLender({ id: lender.id, is_active: !lender.is_active }).unwrap();
    } catch (err) {
      alert(`Failed to update status: ${err.data?.error?.message || err.message}`);
    }
  }

  async function handlePriorityChange(lender, value) {
    const p = parseInt(value, 10);
    if (!isNaN(p)) {
      try {
        await updateLender({ id: lender.id, priority: p }).unwrap();
      } catch (err) {
        alert(`Failed to update priority: ${err.data?.error?.message || err.message}`);
      }
    }
  }

  async function handleDelete(lender) {
    if (confirm(`Are you sure you want to delete ${lender.name}?`)) {
      try {
        await deleteLender(lender.id).unwrap();
      } catch (err) {
        alert(`Failed to delete lender: ${err.data?.error?.message || err.message}`);
      }
    }
  }

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <ExportButtons data={lenders} columns={exportColumns} filename="lenders_list" title="NBFCs / Lenders" />
        <button className="btn btn-primary" onClick={() => setCreateModalOpen(true)}>+ Create NBFC</button>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Lender</th>
              <th>Code</th>
              <th>Type</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 6 }, (_, i) => (
                <tr key={i}>{[160, 100, 60, 60, 80, 40, 100].map((w, j) => (
                  <td key={j}><div className="skeleton" style={{ height: 12, width: w }} /></td>
                ))}</tr>
              ))
            ) : lenders.map((lender, idx) => (
              <tr key={lender.id} style={{ cursor: 'default' }}>
                <td style={{ color: 'var(--color-text-3)' }}>{idx + 1}</td>
                <td style={{ fontWeight: 600 }}>{lender.name}</td>
                <td><span className="font-mono">{lender.code}</span></td>
                <td style={{ textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.06em', color: 'var(--color-text-3)' }}>{lender.lender_type}</td>
                <td>
                  <input
                    type="number" min="1" max="99"
                    defaultValue={lender.priority}
                    onBlur={(e) => handlePriorityChange(lender, e.target.value)}
                    className="input"
                    style={{ width: 64, padding: '4px 8px', fontSize: 13, textAlign: 'center' }}
                    id={`priority-${lender.id}`}
                  />
                </td>
                <td><StatusBadge status={lender.is_active ? 'active' : 'inactive'} /></td>
                <td>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={lender.is_active}
                      onChange={() => handleToggle(lender)}
                      disabled={updating}
                      id={`toggle-${lender.id}`}
                    />
                    <span className="toggle-track" />
                  </label>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setLenderToEdit(lender)}>Edit</button>
                    <Link href={`/rules/${lender.id}`} className="btn btn-ghost btn-sm">Rules</Link>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-rose)' }} onClick={() => handleDelete(lender)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isCreateModalOpen && <CreateLenderModal onClose={() => setCreateModalOpen(false)} />}
      {lenderToEdit && <EditLenderModal lender={lenderToEdit} onClose={() => setLenderToEdit(null)} />}
    </>
  );
}

function CreateLenderModal({ onClose }) {
  const [createLender, { isLoading }] = useCreateLenderMutation();
  const [formData, setFormData] = useState({ name: '', code: '', lender_type: 'nbfc', priority: 99 });
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      await createLender(formData).unwrap();
      onClose();
    } catch (err) {
      setError(err.data?.error?.message || err.message || 'Failed to create lender');
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 32, width: 400 }} onClick={e => e.stopPropagation()}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>Create New NBFC</h2>
        
        {error && <div style={{ padding: 12, background: 'var(--color-rose-bg)', color: 'var(--color-rose)', fontSize: 13, borderRadius: 8, marginBottom: 16 }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="label">Lender Name</label>
            <input required className="input w-full" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. SK Finance" />
          </div>
          <div>
            <label className="label">Lender Code</label>
            <input required className="input w-full font-mono" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} placeholder="e.g. sk-finance" />
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input w-full" value={formData.lender_type} onChange={e => setFormData({...formData, lender_type: e.target.value})}>
              <option value="nbfc">NBFC</option>
              <option value="bank">Bank</option>
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={isLoading}>{isLoading ? 'Saving...' : 'Create Lender'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditLenderModal({ lender, onClose }) {
  const [updateLender, { isLoading }] = useUpdateLenderMutation();
  const [formData, setFormData] = useState({ 
    name: lender.name, 
    code: lender.code, 
    lender_type: lender.lender_type 
  });
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      await updateLender({ id: lender.id, ...formData }).unwrap();
      onClose();
    } catch (err) {
      setError(err.data?.error?.message || err.message || 'Failed to update lender');
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 32, width: 400 }} onClick={e => e.stopPropagation()}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>Edit NBFC</h2>
        
        {error && <div style={{ padding: 12, background: 'var(--color-rose-bg)', color: 'var(--color-rose)', fontSize: 13, borderRadius: 8, marginBottom: 16 }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="label">Lender Name</label>
            <input required className="input w-full" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. SK Finance" />
          </div>
          <div>
            <label className="label">Code (Unique)</label>
            <input required className="input w-full" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} placeholder="e.g. SKF" style={{ textTransform: 'uppercase' }} />
          </div>
          <div>
            <label className="label">Lender Type</label>
            <select className="input w-full" value={formData.lender_type} onChange={e => setFormData({...formData, lender_type: e.target.value})}>
              <option value="nbfc">NBFC</option>
              <option value="bank">Bank</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button type="button" className="btn btn-secondary flex-1" onClick={onClose} disabled={isLoading}>Cancel</button>
            <button type="submit" className="btn btn-primary flex-1" disabled={isLoading}>{isLoading ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
