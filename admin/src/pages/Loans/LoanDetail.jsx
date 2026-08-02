import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import StatusPill from '../../components/StatusPill';
import styles from './LoanDetail.module.css';

const LoanDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loan, setLoan] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get(`/applications/${id}`);
        setLoan(res.data?.application);
      } catch (err) {
        console.error('Failed to fetch loan detail', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  const handleDisburse = async () => {
    // Open modal to capture disburse_amount, UTR, remarks, bank_name
    // Call apiClient.post(`/applications/${id}/disburse`, payload)
    // Then re-fetch loan
    alert("Disburse modal will open here");
  };

  const handleStageEntry = async () => {
    alert("Stage entry modal will open here");
  };

  if (loading) return <div>Loading...</div>;
  if (!loan) return <div>Loan not found</div>;

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
  const formatDate = (d) => new Date(d).toLocaleString('en-IN');

  const customerName = loan.customers?.profiles?.full_name || 'Unknown Customer';

  return (
    <div className={styles.container}>
      <button onClick={() => navigate('/loans')} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', textAlign: 'left', fontWeight: 500, padding: 0 }}>
        &larr; Back to Loans
      </button>

      <div className={styles.headerCard}>
        <div className={styles.appInfo}>
          <h1 className={styles.appNo}>
            {loan.application_no} 
            <StatusPill status={loan.status} />
          </h1>
          <span className={styles.customerName}>{customerName} • {loan.product_type?.replace('_', ' ').toUpperCase()}</span>
        </div>
        <div className={styles.actions}>
          {loan.status !== 'disbursed' && loan.status !== 'cancelled' && loan.status !== 'rejected' && (
            <button className={styles.btn} style={{ border: '1px solid #cbd5e1', background: 'white', color: '#0f172a' }} onClick={handleStageEntry}>
              Add Stage Entry
            </button>
          )}
          {loan.status === 'approved' && (
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleDisburse}>
              Disburse Loan
            </button>
          )}
        </div>
      </div>

      <div className={styles.contentGrid}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Application Details</h3>
            <div className={styles.dataGrid}>
              <div>
                <div className={styles.dataLabel}>Requested Amount</div>
                <div className={styles.dataValue}>{formatCurrency(loan.requested_amount || 0)}</div>
              </div>
              <div>
                <div className={styles.dataLabel}>Approved Amount</div>
                <div className={styles.dataValue}>{loan.approved_amount ? formatCurrency(loan.approved_amount) : '—'}</div>
              </div>
              <div>
                <div className={styles.dataLabel}>Disbursed Amount</div>
                <div className={styles.dataValue}>{loan.disbursed_amount ? formatCurrency(loan.disbursed_amount) : '—'}</div>
              </div>
              <div>
                <div className={styles.dataLabel}>Current Stage</div>
                <div className={styles.dataValue}>{loan.current_stage || 'Not started'}</div>
              </div>
            </div>
          </div>
          
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Stage Timeline</h3>
            {loan.loan_stage_entries?.length > 0 ? (
              <div className={styles.timeline}>
                {loan.loan_stage_entries.map((entry) => (
                  <div key={entry.id} className={styles.timelineItem}>
                    <div className={`${styles.timelineDot} ${entry.outcome === 'approved' ? styles.timelineSuccess : entry.outcome === 'rejected' ? styles.timelineError : ''}`}></div>
                    <div className={styles.timelineContent}>
                      <div className={styles.timelineHeader}>
                        <span className={styles.stageName}>{entry.stage} <span style={{fontWeight: 'normal', color: '#64748b', fontSize: '0.8rem'}}>({entry.outcome})</span></span>
                        <span className={styles.timelineDate}>{formatDate(entry.created_at)}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b'}}>By {entry.role}</div>
                      {entry.remarks && <div className={styles.timelineRemarks}>{entry.remarks}</div>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: '#64748b' }}>No stage entries recorded yet.</div>
            )}
          </div>
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Parties Involved</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <div className={styles.dataLabel}>Customer</div>
              <div className={styles.dataValue}>{customerName}</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{loan.customers?.profiles?.phone}</div>
            </div>
            <div>
              <div className={styles.dataLabel}>Dealer</div>
              <div className={styles.dataValue}>{loan.dealers?.business_name || '—'}</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{loan.dealers?.profiles?.full_name}</div>
            </div>
            <div>
              <div className={styles.dataLabel}>Assigned Staff</div>
              <div className={styles.dataValue}>{loan.staff?.profiles?.full_name || 'Unassigned'}</div>
            </div>
            <div>
              <div className={styles.dataLabel}>Lender</div>
              <div className={styles.dataValue}>{loan.lenders?.name || 'TBD'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoanDetail;
