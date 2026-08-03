import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import apiClient from '../../api/client';
import StatusPill from '../../components/StatusPill';
import styles from './LoanDetail.module.css';

const LoanDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setPageMeta } = useOutletContext();
  const [loan, setLoan] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [showDisburseModal, setShowDisburseModal] = useState(false);
  const [disburseForm, setDisburseForm] = useState({ disbursed_amount: '', remarks: '', disbursed_to: '', utr: '', bank_name: '' });

  const [showStageModal, setShowStageModal] = useState(false);
  const [stageForm, setStageForm] = useState({ stage: '', outcome: 'approved', remarks: '' });


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

  const handleDisburse = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post(`/applications/${id}/disburse`, {
        ...disburseForm,
        disbursed_amount: Number(disburseForm.disbursed_amount)
      });
      alert("Loan disbursed successfully");
      setShowDisburseModal(false);
      // refetch
      const res = await apiClient.get(`/applications/${id}`);
      setLoan(res.data?.application);
    } catch (err) {
      alert(err?.response?.data?.message || err.message || "Failed to disburse loan");
    }
  };

  const handleStageEntry = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post(`/applications/${id}/stage-entries`, stageForm);
      alert("Stage updated successfully");
      setShowStageModal(false);
      // refetch
      const res = await apiClient.get(`/applications/${id}`);
      setLoan(res.data?.application);
    } catch (err) {
      alert(err?.response?.data?.message || err.message || "Failed to add stage entry");
    }
  };

  useEffect(() => {
    if (loan) {
      setPageMeta({ title: `Loan Application ${loan.application_no}`, subtitle: `Dealer: ${loan.dealers?.business_name || 'N/A'}` });
    } else {
      setPageMeta({ title: 'Loan Application', subtitle: '' });
    }
  }, [setPageMeta, loan]);

  if (loading) return <div>Loading...</div>;
  if (!loan) return <div>Loan not found</div>;

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
  const formatDate = (d) => new Date(d).toLocaleString('en-IN');

  const customerName = loan.customers?.profiles?.full_name || 'Unknown Customer';

  return (
    <div className={styles.container}>
      <button onClick={() => navigate('/loans')} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', textAlign: 'left', fontWeight: 500, padding: 0, marginBottom: '1rem' }}>
        &larr; Back to Loans
      </button>

      <div className={styles.appHeaderCard} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className={styles.appInfo}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <span className={styles.customerName}>{customerName}</span>
            <StatusPill status={loan.status} />
          </div>
          <div style={{ color: '#64748b', fontSize: '0.875rem' }}>
            Product: {loan.product_type?.replace('_', ' ').toUpperCase()} • Date: {formatDate(loan.created_at)}
          </div>
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
            <div className={styles.actions}>
            {loan.status === 'approved' && (
              <button className={styles.btnPrimary} onClick={() => setShowDisburseModal(true)}>Disburse Loan</button>
            )}
            <button className={styles.btnSecondary} onClick={() => setShowStageModal(true)}>Add Stage Entry</button>
          </div>
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

      {showDisburseModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1e293b', padding: '2rem', borderRadius: '1rem', width: '400px' }}>
            <h2 style={{ marginBottom: '1.5rem', color: 'white' }}>Disburse Loan</h2>
            <form onSubmit={handleDisburse} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ color: '#cbd5e1', fontSize: '0.875rem' }}>Disbursed Amount</label>
                <input required type="number" value={disburseForm.disbursed_amount} onChange={e => setDisburseForm({...disburseForm, disbursed_amount: e.target.value})} style={{ width: '100%', marginTop: '0.25rem', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #334155', background: '#0f172a', color: 'white' }} />
              </div>
              <div>
                <label style={{ color: '#cbd5e1', fontSize: '0.875rem' }}>Bank Name</label>
                <input value={disburseForm.bank_name} onChange={e => setDisburseForm({...disburseForm, bank_name: e.target.value})} style={{ width: '100%', marginTop: '0.25rem', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #334155', background: '#0f172a', color: 'white' }} />
              </div>
              <div>
                <label style={{ color: '#cbd5e1', fontSize: '0.875rem' }}>UTR / Ref No.</label>
                <input value={disburseForm.utr} onChange={e => setDisburseForm({...disburseForm, utr: e.target.value})} style={{ width: '100%', marginTop: '0.25rem', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #334155', background: '#0f172a', color: 'white' }} />
              </div>
              <div>
                <label style={{ color: '#cbd5e1', fontSize: '0.875rem' }}>Remarks</label>
                <input value={disburseForm.remarks} onChange={e => setDisburseForm({...disburseForm, remarks: e.target.value})} style={{ width: '100%', marginTop: '0.25rem', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #334155', background: '#0f172a', color: 'white' }} />
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowDisburseModal(false)} style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: 'none', background: '#334155', color: 'white', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: 'none', background: '#3b82f6', color: 'white', cursor: 'pointer' }}>Disburse</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showStageModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1e293b', padding: '2rem', borderRadius: '1rem', width: '400px' }}>
            <h2 style={{ marginBottom: '1.5rem', color: 'white' }}>Advance Stage</h2>
            <form onSubmit={handleStageEntry} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ color: '#cbd5e1', fontSize: '0.875rem' }}>Stage</label>
                <select required value={stageForm.stage} onChange={e => setStageForm({...stageForm, stage: e.target.value})} style={{ width: '100%', marginTop: '0.25rem', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #334155', background: '#0f172a', color: 'white' }}>
                  <option value="">Select Stage</option>
                  <option value="cibil">CIBIL</option>
                  <option value="bank">Bank</option>
                  <option value="valuation">Valuation</option>
                  <option value="fi">FI</option>
                  <option value="approval">Approval</option>
                </select>
              </div>
              <div>
                <label style={{ color: '#cbd5e1', fontSize: '0.875rem' }}>Outcome</label>
                <select required value={stageForm.outcome} onChange={e => setStageForm({...stageForm, outcome: e.target.value})} style={{ width: '100%', marginTop: '0.25rem', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #334155', background: '#0f172a', color: 'white' }}>
                  <option value="approved">Passed / Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div>
                <label style={{ color: '#cbd5e1', fontSize: '0.875rem' }}>Remarks</label>
                <textarea required value={stageForm.remarks} onChange={e => setStageForm({...stageForm, remarks: e.target.value})} rows={3} style={{ width: '100%', marginTop: '0.25rem', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #334155', background: '#0f172a', color: 'white' }} />
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowStageModal(false)} style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: 'none', background: '#334155', color: 'white', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: 'none', background: '#3b82f6', color: 'white', cursor: 'pointer' }}>Save Entry</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoanDetail;
