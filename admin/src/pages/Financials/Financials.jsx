import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import apiClient from '../../api/client';
import StatusPill from '../../components/StatusPill';
import styles from './Financials.module.css';

const Financials = () => {
  const { setPageMeta } = useOutletContext();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPageMeta({ title: 'Commissions & Payouts', subtitle: 'Review and process dealer payouts' });
    
    const fetchRequests = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get('/withdrawal-requests');
        setRequests(res.data?.items || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, [setPageMeta]);

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);

  const [showModal, setShowModal] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [formData, setFormData] = useState({ amount: '', payout_utr: '', payout_date: new Date().toISOString().slice(0, 10) });

  const handleProcessClick = (id, reqAmount) => {
    setSelectedId(id);
    setFormData({ amount: reqAmount, payout_utr: '', payout_date: new Date().toISOString().slice(0, 10) });
    setShowModal(true);
  };

  const handleProcessSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post(`/withdrawal-requests/${selectedId}/process`, {
        amount: Number(formData.amount),
        payout_utr: formData.payout_utr,
        payout_date: new Date(formData.payout_date).toISOString()
      });
      alert('Payout processed successfully');
      setShowModal(false);
      // refetch
      const res = await apiClient.get('/withdrawal-requests');
      setRequests(res.data?.items || []);
    } catch (err) {
      alert(err?.response?.data?.message || err.message || 'Failed to process payout');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.tableCard}>
        <div className={styles.controls}>
          <select style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }}>
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="processed">Processed</option>
          </select>
        </div>
        
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Dealer</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Requested On</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className={styles.emptyState}>Loading requests...</td></tr>
              ) : requests.length === 0 ? (
                <tr><td colSpan="6" className={styles.emptyState}>No withdrawal requests found.</td></tr>
              ) : (
                requests.map(req => (
                  <tr key={req.id} className={styles.tableRow}>
                    <td style={{ color: '#64748b' }}>{req.id.substring(0, 8)}...</td>
                    <td style={{ fontWeight: 500 }}>{req.dealers?.business_name || 'Unknown'}</td>
                    <td className={styles.amount}>{formatCurrency(req.amount)}</td>
                    <td><StatusPill status={req.status} /></td>
                    <td>{new Date(req.created_at).toLocaleDateString('en-IN')}</td>
                    <td>
                      {req.status === 'pending' && (
                        <button 
                          onClick={() => handleProcessClick(req.id, req.amount)}
                          style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                        >
                          Process
                        </button>
                      )}
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
          <div style={{ background: '#1e293b', padding: '2rem', borderRadius: '1rem', width: '400px' }}>
            <h2 style={{ marginBottom: '1.5rem', color: 'white' }}>Process Payout</h2>
            <form onSubmit={handleProcessSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ color: '#cbd5e1', fontSize: '0.875rem' }}>Amount</label>
                <input required type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} style={{ width: '100%', marginTop: '0.25rem', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #334155', background: '#0f172a', color: 'white' }} />
              </div>
              <div>
                <label style={{ color: '#cbd5e1', fontSize: '0.875rem' }}>Bank UTR (Reference No.)</label>
                <input required value={formData.payout_utr} onChange={e => setFormData({...formData, payout_utr: e.target.value})} style={{ width: '100%', marginTop: '0.25rem', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #334155', background: '#0f172a', color: 'white' }} />
              </div>
              <div>
                <label style={{ color: '#cbd5e1', fontSize: '0.875rem' }}>Payout Date</label>
                <input required type="date" value={formData.payout_date} onChange={e => setFormData({...formData, payout_date: e.target.value})} style={{ width: '100%', marginTop: '0.25rem', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #334155', background: '#0f172a', color: 'white' }} />
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: 'none', background: '#334155', color: 'white', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: 'none', background: '#3b82f6', color: 'white', cursor: 'pointer' }}>Confirm</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Financials;
