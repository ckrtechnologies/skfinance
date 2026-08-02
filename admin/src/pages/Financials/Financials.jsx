import React, { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import StatusPill from '../../components/StatusPill';
import styles from './Financials.module.css';

const Financials = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get('/payouts/withdrawal-requests');
        setRequests(res.data?.items || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, []);

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);

  const handleProcess = (id) => {
    alert(`Modal to process payout (UTR, amount) for request ${id} will open here.`);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Commissions & Payouts</h1>
          <p className={styles.subtitle}>Process dealer withdrawal requests</p>
        </div>
      </div>

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
                          onClick={() => handleProcess(req.id)}
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
    </div>
  );
};

export default Financials;
