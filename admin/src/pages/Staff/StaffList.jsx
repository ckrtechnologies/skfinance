import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import apiClient from '../../api/client';
import StatusPill from '../../components/StatusPill';
import styles from '../Lenders/LendersList.module.css';

const StaffList = () => {
  const { setPageMeta } = useOutletContext();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ full_name: '', email: '', phone: '', password: '', branch: '' });

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/staff');
      setStaff(res.data?.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  useEffect(() => {
    setPageMeta({ title: 'Staff Management', subtitle: 'Manage internal platform users and roles' });
  }, [setPageMeta]);

  const handleAddStaff = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/staff', formData);
      alert('Staff created successfully');
      setShowModal(false);
      setFormData({ full_name: '', email: '', phone: '', password: '', branch: '' });
      fetchStaff();
    } catch (err) {
      alert(err?.response?.data?.message || err.message || 'Failed to create staff');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div />
        <button 
          onClick={() => setShowModal(true)}
          style={{
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            color: 'white', border: 'none', padding: '0.5rem 1rem',
            borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer'
          }}>
          Add Staff
        </button>
      </div>

      <div className={styles.tableCard}>
        <div className={styles.controls}>
          <input 
            type="text" 
            placeholder="Search by name or email..." 
            className={styles.searchInput} 
          />
        </div>
        
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Status</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" className={styles.emptyState}>Loading staff...</td></tr>
              ) : staff.length === 0 ? (
                <tr><td colSpan="5" className={styles.emptyState}>No staff found.</td></tr>
              ) : (
                staff.map(member => (
                  <tr key={member.id} className={styles.tableRow} onClick={() => alert('Staff Detail view coming soon')}>
                    <td className={styles.lenderName}>{member.profiles?.full_name}</td>
                    <td>{member.profiles?.phone}</td>
                    <td>{member.profiles?.email}</td>
                    <td>
                      <StatusPill status={member.is_active ? 'active' : 'inactive'} />
                    </td>
                    <td>{new Date(member.created_at).toLocaleDateString('en-IN')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1e293b', padding: '2rem', borderRadius: '1rem', width: '400px' }}>
            <h2 style={{ marginBottom: '1.5rem', color: 'white' }}>Add Staff Member</h2>
            <form onSubmit={handleAddStaff} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input required placeholder="Full Name" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #334155', background: '#0f172a', color: 'white' }} />
              <input required type="email" placeholder="Email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #334155', background: '#0f172a', color: 'white' }} />
              <input required type="tel" placeholder="Phone" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #334155', background: '#0f172a', color: 'white' }} />
              <input required type="password" placeholder="Temporary Password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #334155', background: '#0f172a', color: 'white' }} />
              <input placeholder="Branch" value={formData.branch} onChange={e => setFormData({...formData, branch: e.target.value})} style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #334155', background: '#0f172a', color: 'white' }} />
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: 'none', background: '#334155', color: 'white', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: 'none', background: '#3b82f6', color: 'white', cursor: 'pointer' }}>Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffList;
