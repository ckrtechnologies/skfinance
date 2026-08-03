import React, { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useSelector } from 'react-redux';
import apiClient from '../../api/client';
import StatusPill from '../../components/StatusPill';
import styles from './LoansList.module.css';

const LoansList = () => {
  const { setPageMeta } = useOutletContext();
  const dateRange = useSelector((state) => state.filters.dateRange);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setPageMeta({ title: 'Loan Files', subtitle: 'Manage and review loan applications' });
  }, [setPageMeta]);

  useEffect(() => {
    const fetchLoans = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get('/applications', { 
          params: { start: dateRange.startDate, end: dateRange.endDate } 
        });
        // Handle paginated response: { items: [], total: x, page: y }
        setLoans(res.data?.items || []);
      } catch (err) {
        console.error('Failed to fetch loans', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLoans();
  }, [dateRange]);

  const formatCurrency = (val) => {
    if (!val) return '—';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  const formatDate = (isoString) => {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className={styles.container}>
      <div className={styles.tableCard}>
        <div className={styles.controls}>
          <input 
            type="text" 
            placeholder="Search Application No or Customer ID..." 
            className={styles.searchInput} 
          />
          {/* Add select dropdowns for Status filtering here */}
        </div>
        
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>App No</th>
                <th>Product</th>
                <th>Requested</th>
                <th>Current Stage</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className={styles.emptyState}>Loading loan files...</td></tr>
              ) : loans.length === 0 ? (
                <tr><td colSpan="6" className={styles.emptyState}>No loan files found.</td></tr>
              ) : (
                loans.map(loan => (
                  <tr key={loan.id} className={styles.tableRow} onClick={() => navigate(`/loans/${loan.id}`)}>
                    <td style={{ fontWeight: 500, color: '#2563eb' }}>{loan.application_no}</td>
                    <td style={{ textTransform: 'capitalize' }}>{loan.product_type?.replace('_', ' ')}</td>
                    <td className={styles.amount}>{formatCurrency(loan.requested_amount)}</td>
                    <td>{loan.current_stage || '—'}</td>
                    <td><StatusPill status={loan.status} /></td>
                    <td>{formatDate(loan.created_at)}</td>
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

export default LoansList;
