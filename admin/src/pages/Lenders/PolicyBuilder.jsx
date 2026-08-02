import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import StatusPill from '../../components/StatusPill';
import styles from './PolicyBuilder.module.css';

const PolicyBuilder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [productType, setProductType] = useState('new_car');
  const [minAmount, setMinAmount] = useState(50000);
  const [maxAmount, setMaxAmount] = useState(1500000);

  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get(`/lenders/${id}/policies`);
        setPolicies(res.data?.policies || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPolicies();
  }, [id]);

  const handleCreatePolicy = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        product_type: productType,
        effective_from: new Date().toISOString(),
        min_loan_amount: minAmount || 50000,
        max_loan_amount: maxAmount || 5000000,
        min_age: 18,
        max_age: 65,
        min_cibil: 650,
        customer_types: ['salaried', 'self_employed'],
        policy_documents: [
          { party: 'applicant', doc_type: 'Aadhar', is_mandatory: true },
          { party: 'applicant', doc_type: 'PAN', is_mandatory: true }
        ]
      };
      await apiClient.post(`/lenders/${id}/policies`, payload);
      alert('Policy created successfully');
      // Refetch
      const res = await apiClient.get(`/lenders/${id}/policies`);
      setPolicies(res.data?.policies || []);
    } catch (err) {
      alert(err?.response?.data?.message || err.message || 'Error creating policy');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className={styles.container}>
      <button onClick={() => navigate('/lenders')} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', textAlign: 'left', fontWeight: 500, padding: 0 }}>
        &larr; Back to Lenders
      </button>

      <div className={styles.headerCard}>
        <div>
          <h1 className={styles.title}>Lender Policies</h1>
          <p className={styles.subtitle}>Define loan underwriting rules and document checklists</p>
        </div>
      </div>

      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Create New Policy (Draft)</h3>
        <form onSubmit={handleCreatePolicy}>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Product Type</label>
              <select className={styles.select} value={productType} onChange={e => setProductType(e.target.value)}>
                <option value="new_car">New Car</option>
                <option value="used_car">Used Car</option>
                <option value="commercial">Commercial</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Min CIBIL Score (Mock)</label>
              <input className={styles.input} type="number" value="650" readOnly />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Minimum Amount (₹)</label>
              <input className={styles.input} type="number" value={minAmount} onChange={e => setMinAmount(e.target.value)} required />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Maximum Amount (₹)</label>
              <input className={styles.input} type="number" value={maxAmount} onChange={e => setMaxAmount(e.target.value)} required />
            </div>
          </div>
          <button type="submit" className={styles.btnPrimary}>Save Draft Policy</button>
        </form>
      </div>

      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Existing Policies</h3>
        {policies.length === 0 ? (
          <div style={{ color: '#64748b' }}>No policies defined for this lender.</div>
        ) : (
          policies.map(p => (
            <div key={p.id} className={styles.policyItem}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <strong style={{ textTransform: 'capitalize' }}>{p.product_type.replace('_', ' ')}</strong>
                <StatusPill status={p.status} />
              </div>
              <div style={{ fontSize: '0.875rem', color: '#475569' }}>
                Amount Range: ₹{p.min_amount} - ₹{p.max_amount}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#475569' }}>
                Min CIBIL: {p.min_cibil}
              </div>
              {p.status === 'draft' && (
                <button style={{ marginTop: '0.5rem', background: '#10b981', color: 'white', border: 'none', padding: '0.25rem 0.75rem', borderRadius: '0.25rem', cursor: 'pointer' }}>
                  Publish
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PolicyBuilder;
