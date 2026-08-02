import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import StatusPill from '../../components/StatusPill';
import styles from '../Lenders/LendersList.module.css'; // Reusing table styles

const DealersList = () => {
  const [dealers, setDealers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ full_name: '', email: '', phone: '', password: '', bank_name: '', bank_account_no: '' });
  const navigate = useNavigate();

  const fetchDealers = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/dealers');
      setDealers(res.data?.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDealers();
  }, []);

  const handleAddDealer = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/dealers', formData);
      alert('Dealer created successfully');
      setShowModal(false);
      setFormData({ full_name: '', email: '', phone: '', password: '', bank_name: '', bank_account_no: '' });
      fetchDealers();
    } catch (err) {
      alert(err?.response?.data?.message || err.message || 'Failed to create dealer');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Dealers</h1>
          <p className={styles.subtitle}>Manage dealership partners</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          style={{
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            color: 'white', border: 'none', padding: '0.5rem 1rem',
            borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer'
          }}>
          Add Dealer
        </button>
      </div>

      <div className={styles.tableCard}>
        <div className={styles.controls}>
          <input 
            type="text" 
            placeholder="Search by business name or phone..." 
            className={styles.searchInput} 
          />
        </div>
        
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Business Name</th>
                <th>Contact Person</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" className={styles.emptyState}>Loading dealers...</td></tr>
              ) : dealers.length === 0 ? (
                <tr><td colSpan="5" className={styles.emptyState}>No dealers found.</td></tr>
              ) : (
                dealers.map(dealer => (
                  <tr key={dealer.id} className={styles.tableRow} onClick={() => alert(`Dealer Detail view for ${dealer.id} coming soon`)}>
                    <td className={styles.lenderName}>{dealer.business_name}</td>
                    <td>{dealer.profiles?.full_name}</td>
                    <td>{dealer.profiles?.phone}</td>
                    <td>
                      <StatusPill status={dealer.is_active ? 'active' : 'inactive'} />
                    </td>
                    <td>{new Date(dealer.created_at).toLocaleDateString('en-IN')}</td>
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
            <h2 style={{ marginBottom: '1.5rem', color: 'white' }}>Add Dealer</h2>
            <form onSubmit={handleAddDealer} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input required placeholder="Business / Full Name" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #334155', background: '#0f172a', color: 'white' }} />
              <input required type="email" placeholder="Email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #334155', background: '#0f172a', color: 'white' }} />
              <input required type="tel" placeholder="Phone" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #334155', background: '#0f172a', color: 'white' }} />
              <input required type="password" placeholder="Temporary Password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #334155', background: '#0f172a', color: 'white' }} />
              <input placeholder="Bank Name" value={formData.bank_name} onChange={e => setFormData({...formData, bank_name: e.target.value})} style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #334155', background: '#0f172a', color: 'white' }} />
              <input placeholder="Bank Account Number" value={formData.bank_account_no} onChange={e => setFormData({...formData, bank_account_no: e.target.value})} style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #334155', background: '#0f172a', color: 'white' }} />
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

export default DealersList;
