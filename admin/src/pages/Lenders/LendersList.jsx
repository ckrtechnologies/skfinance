import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import StatusPill from '../../components/StatusPill';
import styles from './LendersList.module.css';

const LendersList = () => {
  const [lenders, setLenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLenders = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get('/lenders');
        setLenders(res.data?.lenders || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLenders();
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Lenders</h1>
          <p className={styles.subtitle}>Manage NBFC partners and their policies</p>
        </div>
        <button style={{
          background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
          color: 'white', border: 'none', padding: '0.5rem 1rem',
          borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer'
        }}>
          Add Lender
        </button>
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
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="3" className={styles.emptyState}>Loading lenders...</td></tr>
              ) : lenders.length === 0 ? (
                <tr><td colSpan="3" className={styles.emptyState}>No lenders found.</td></tr>
              ) : (
                lenders.map(lender => (
                  <tr key={lender.id} className={styles.tableRow} onClick={() => navigate(`/lenders/${lender.id}/policies`)}>
                    <td className={styles.lenderName}>{lender.name}</td>
                    <td>
                      <StatusPill status={lender.is_active ? 'active' : 'inactive'} />
                    </td>
                    <td>{new Date(lender.created_at).toLocaleDateString('en-IN')}</td>
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

export default LendersList;
