import React, { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import apiClient from '../../api/client';
import StatusPill from '../../components/StatusPill';
import styles from './LendersList.module.css';

const LendersList = () => {
  const { setPageMeta } = useOutletContext();
  const [lenders, setLenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedLender, setSelectedLender] = useState(null);
  const defaultForm = { name: '', code: '', lender_type: 'nbfc', priority: 10, is_active: true, contact_name: '', contact_email: '', contact_phone: '' };
  const [formData, setFormData] = useState(defaultForm);
  const navigate = useNavigate();

  useEffect(() => {
    setPageMeta({ title: 'Lenders & Policies', subtitle: 'Manage financial partners and dynamic rule engines' });
  }, [setPageMeta]);

  useEffect(() => {
    const fetchLenders = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get('/lenders?include_inactive=true');
        setLenders(res.data?.lenders || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLenders();
  }, []);

  const openAddModal = () => {
    setSelectedLender(null);
    setFormData(defaultForm);
    setShowModal(true);
  };

  const openEditModal = (e, lender) => {
    e.stopPropagation();
    setSelectedLender(lender);
    setFormData({
      name: lender.name || '',
      code: lender.code || '',
      lender_type: lender.lender_type || 'nbfc',
      priority: lender.priority ?? 10,
      is_active: lender.is_active ?? true,
      contact_name: lender.contact_name || '',
      contact_email: lender.contact_email || '',
      contact_phone: lender.contact_phone || ''
    });
    setShowModal(true);
  };

  const handleSaveLender = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        priority: parseInt(formData.priority, 10)
      };
      
      if (selectedLender) {
        await apiClient.patch(`/lenders/${selectedLender.id}`, payload);
        alert('Lender updated successfully');
      } else {
        await apiClient.post('/lenders', payload);
        alert('Lender added successfully');
      }
      
      setShowModal(false);
      const res = await apiClient.get('/lenders?include_inactive=true');
      setLenders(res.data?.lenders || []);
    } catch (err) {
      alert(err?.response?.data?.message || err.message || 'Failed to save lender');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <button 
            onClick={openAddModal}
            style={{
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            color: 'white', border: 'none', padding: '0.5rem 1rem',
            borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer'
          }}>
            Add Lender
          </button>
        </div>
      </div>

      <div className={styles.tableCard}>
        <div className={styles.controls}>
          <input 
            type="text" 
            placeholder="Search Lenders..." 
            className={styles.searchInput} 
          />
        </div>
        
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Lender Name</th>
                <th>Status</th>
                <th>Created At</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" className={styles.emptyState}>Loading lenders...</td></tr>
              ) : lenders.length === 0 ? (
                <tr><td colSpan="4" className={styles.emptyState}>No lenders found.</td></tr>
              ) : (
                lenders.map(lender => (
                  <tr key={lender.id} className={styles.tableRow} onClick={() => navigate(`/lenders/${lender.id}/policies`)}>
                    <td className={styles.lenderName}>{lender.name}</td>
                    <td>
                      <StatusPill status={lender.is_active ? 'active' : 'inactive'} />
                    </td>
                    <td>{new Date(lender.created_at).toLocaleDateString('en-IN')}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button 
                          onClick={(e) => openEditModal(e, lender)}
                          style={{ padding: '0.4rem 0.75rem', background: '#334155', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.8rem' }}
                        >
                          Edit
                        </button>
                        <button 
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (window.confirm(`Are you sure you want to completely DELETE ${lender.name}? This action cannot be undone.`)) {
                              try {
                                await apiClient.delete(`/lenders/${lender.id}`);
                                const res = await apiClient.get('/lenders?include_inactive=true');
                                setLenders(res.data?.lenders || []);
                              } catch (err) {
                                alert(err?.response?.data?.message || err.message || 'Failed to delete lender');
                              }
                            }
                          }}
                          style={{ padding: '0.4rem 0.75rem', background: '#e11d48', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.8rem' }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1e293b', padding: '2rem', borderRadius: '1rem', width: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: '1.5rem', color: 'white' }}>{selectedLender ? 'Edit Lender' : 'Add New Lender'}</h2>
            <form onSubmit={handleSaveLender} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ color: '#cbd5e1', fontSize: '0.875rem' }}>Lender Name</label>
                  <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{ width: '100%', marginTop: '0.25rem', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #334155', background: '#0f172a', color: 'white' }} placeholder="e.g. SK Finance" />
                </div>
                <div>
                  <label style={{ color: '#cbd5e1', fontSize: '0.875rem' }}>Lender Code</label>
                  <input required value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} style={{ width: '100%', marginTop: '0.25rem', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #334155', background: '#0f172a', color: 'white' }} placeholder="e.g. SKF" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ color: '#cbd5e1', fontSize: '0.875rem' }}>Lender Type</label>
                  <select required value={formData.lender_type} onChange={e => setFormData({...formData, lender_type: e.target.value})} style={{ width: '100%', marginTop: '0.25rem', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #334155', background: '#0f172a', color: 'white' }}>
                    <option value="nbfc">NBFC</option>
                    <option value="bank">Bank</option>
                  </select>
                </div>
                <div>
                  <label style={{ color: '#cbd5e1', fontSize: '0.875rem' }}>Priority (Lower is higher)</label>
                  <input required type="number" min="1" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} style={{ width: '100%', marginTop: '0.25rem', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #334155', background: '#0f172a', color: 'white' }} />
                </div>
              </div>

              <div>
                <label style={{ color: '#cbd5e1', fontSize: '0.875rem' }}>Contact Name</label>
                <input value={formData.contact_name} onChange={e => setFormData({...formData, contact_name: e.target.value})} style={{ width: '100%', marginTop: '0.25rem', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #334155', background: '#0f172a', color: 'white' }} placeholder="Optional" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ color: '#cbd5e1', fontSize: '0.875rem' }}>Contact Email</label>
                  <input type="email" value={formData.contact_email} onChange={e => setFormData({...formData, contact_email: e.target.value})} style={{ width: '100%', marginTop: '0.25rem', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #334155', background: '#0f172a', color: 'white' }} placeholder="Optional" />
                </div>
                <div>
                  <label style={{ color: '#cbd5e1', fontSize: '0.875rem' }}>Contact Phone</label>
                  <input value={formData.contact_phone} onChange={e => setFormData({...formData, contact_phone: e.target.value})} style={{ width: '100%', marginTop: '0.25rem', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #334155', background: '#0f172a', color: 'white' }} placeholder="Optional" />
                </div>
              </div>

              {selectedLender && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <input type="checkbox" id="isActive" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} style={{ width: '1rem', height: '1rem' }} />
                  <label htmlFor="isActive" style={{ color: '#cbd5e1', fontSize: '0.875rem' }}>Active (Uncheck to deactivate)</label>
                </div>
              )}
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: 'none', background: '#334155', color: 'white', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: 'none', background: '#3b82f6', color: 'white', cursor: 'pointer', fontWeight: 600 }}>{selectedLender ? 'Update Lender' : 'Create Lender'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LendersList;
