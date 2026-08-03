import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import apiClient from '../../api/client';
import styles from './PolicyBuilder.module.css';

// Reusable Tag Input Component
const TagInput = ({ value = [], onChange, placeholder }) => {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newTag = inputValue.trim();
      if (newTag && !value.includes(newTag)) {
        onChange([...value, newTag]);
      }
      setInputValue('');
    }
  };

  const removeTag = (indexToRemove) => {
    onChange(value.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', background: 'white', alignItems: 'center' }}>
      {value.map((tag, index) => (
        <span key={index} style={{ background: '#e2e8f0', color: '#334155', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          {tag}
          <button type="button" onClick={() => removeTag(index)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}>&times;</button>
        </span>
      ))}
      <input 
        type="text" 
        value={inputValue} 
        onChange={(e) => setInputValue(e.target.value)} 
        onKeyDown={handleKeyDown}
        placeholder={value.length === 0 ? placeholder : 'Type and press Enter...'}
        style={{ border: 'none', outline: 'none', flex: 1, minWidth: '120px', fontSize: '0.875rem', padding: '0.25rem' }}
      />
    </div>
  );
};

const TARGET_OPTIONS = [
  { value: 'applicant.address_type', label: 'Applicant Address Type' },
  { value: 'applicant.customer_type', label: 'Applicant Customer Type' },
  { value: 'co_applicant.relation', label: 'Co-Applicant Relation' },
  { value: 'co_applicant.marital_status', label: 'Co-Applicant Marital Status' },
  { value: 'applicant.cibil_score', label: 'Applicant CIBIL Score' },
  { value: 'loan.requested_amount', label: 'Requested Loan Amount' },
];

const TargetSelector = ({ value, onChange, placeholder, borderColor = '#cbd5e1' }) => {
  const isPredefined = TARGET_OPTIONS.some(o => o.value === value) || value === '';
  const selectValue = isPredefined ? value : 'custom';

  return (
    <div style={{ flex: 2, display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
      <select 
        value={selectValue}
        onChange={(e) => {
          if (e.target.value === 'custom') {
             onChange('applicant.custom_fields.');
          } else {
             onChange(e.target.value);
          }
        }}
        style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', border: `1px solid ${borderColor}`, fontSize: '0.875rem', background: 'white' }}
      >
        <option value="">Select Target...</option>
        {TARGET_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
        <option value="custom">Other (Custom Field)...</option>
      </select>
      {!isPredefined && (
        <input 
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', border: `1px solid ${borderColor}`, fontSize: '0.875rem', background: 'white' }}
        />
      )}
    </div>
  );
};

const PREDEFINED_VALUES = {
  'applicant.address_type': [
    { value: 'owned', label: 'Owned' },
    { value: 'rented', label: 'Rented' },
    { value: 'parental', label: 'Parental' }
  ],
  'applicant.customer_type': [
    { value: 'salaried', label: 'Salaried' },
    { value: 'self_employed', label: 'Self Employed' },
    { value: 'agriculture', label: 'Agriculture' },
    { value: 'commercial_vehicle', label: 'Commercial Vehicle' }
  ],
  'co_applicant.relation': [
    { value: 'spouse', label: 'Spouse' },
    { value: 'parent', label: 'Parent' },
    { value: 'child', label: 'Child' },
    { value: 'sibling', label: 'Sibling' }
  ],
  'co_applicant.marital_status': [
    { value: 'married', label: 'Married' },
    { value: 'unmarried', label: 'Unmarried' }
  ]
};

const ValueSelector = ({ target, value, onChange, placeholder, borderColor = '#cbd5e1' }) => {
  const predefinedValues = PREDEFINED_VALUES[target];
  const [forceCustom, setForceCustom] = useState(false);

  if (predefinedValues) {
    const isCustom = forceCustom || (!predefinedValues.find(v => v.value === value) && value !== '');
    const selectValue = isCustom ? 'custom' : value;

    return (
      <div style={{ flex: 2, display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
        <select
          value={selectValue}
          onChange={(e) => {
            if (e.target.value === 'custom') {
              setForceCustom(true);
              onChange('');
            } else {
              setForceCustom(false);
              onChange(e.target.value);
            }
          }}
          style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', border: `1px solid ${borderColor}`, fontSize: '0.875rem', background: 'white' }}
        >
          <option value="">Select Value...</option>
          {predefinedValues.map(v => (
            <option key={v.value} value={v.value}>{v.label}</option>
          ))}
          <option value="custom">Other...</option>
        </select>
        {isCustom && (
          <input
            value={value}
            onChange={(e) => {
               setForceCustom(true);
               onChange(e.target.value);
            }}
            placeholder={placeholder}
            style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem', border: `1px solid ${borderColor}`, fontSize: '0.875rem', background: 'white' }}
          />
        )}
      </div>
    );
  }

  // Fallback to text input for numbers, booleans, or custom fields that don't have predefined values
  return (
    <input 
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ flex: 2, padding: '0.75rem 1rem', borderRadius: '0.5rem', border: `1px solid ${borderColor}`, fontSize: '0.875rem', background: 'white' }}
    />
  );
};

const PolicyBuilder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setPageMeta } = useOutletContext();
  const [lender, setLender] = useState(null);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Active product selector
  const [selectedProduct, setSelectedProduct] = useState('new_car');

  // Dynamic Rule States mapping exactly to the backend JSON Schema
  const [ownershipRules, setOwnershipRules] = useState([]);
  const [conditionalRules, setConditionalRules] = useState([]);
  const [policyDocs, setPolicyDocs] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    product_type: 'new_car',
    min_loan_amount: '50000',
    max_loan_amount: '1500000',
    ltv_min: '',
    ltv_max: '',
    min_age: '18',
    max_age: '65',
    min_cibil: '650',
    preferred_cibil: '',
    cibil_negative_accepted: false,
    co_applicant_required: false,
    customer_types_salaried: true,
    customer_types_self_employed: true,
    customer_types_agriculture: false
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [lenderRes, policyRes] = await Promise.all([
        apiClient.get(`/lenders/${id}`),
        apiClient.get(`/lenders/${id}/policies`)
      ]);
      setLender(lenderRes.data?.lender || null);
      setPolicies(policyRes.data?.policies || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, [id]);

  const loadPolicyIntoForm = (policy, product) => {
    if (policy) {
      setFormData({
        product_type: policy.product_type,
        min_loan_amount: policy.min_loan_amount || '',
        max_loan_amount: policy.max_loan_amount || '',
        ltv_min: policy.ltv_min || '',
        ltv_max: policy.ltv_max || '',
        min_age: policy.min_age || '',
        max_age: policy.max_age || '',
        min_cibil: policy.min_cibil === -1 ? '' : (policy.min_cibil || ''),
        preferred_cibil: policy.preferred_cibil || '',
        cibil_negative_accepted: policy.cibil_negative_accepted || false,
        co_applicant_required: policy.co_applicant_required || false,
        customer_types_salaried: (policy.customer_types || []).includes('salaried'),
        customer_types_self_employed: (policy.customer_types || []).includes('self_employed'),
        customer_types_agriculture: (policy.customer_types || []).includes('agriculture')
      });
      setOwnershipRules((policy.ownership_proof_rules || []).map(r => ({
        if_address_type: r.if_address_type || '',
        required_docs: r.required_docs || []
      })));
      setConditionalRules((policy.conditional_rules || []).map(r => {
        let triggerTarget = 'applicant.address_type';
        let triggerOperator = '==';
        let triggerValue = '';
        
        if (r.trigger) {
          const match = r.trigger.match(/^([\w.]+)\s*(==|!=)\s*'(.+)'$/);
          if (match) {
            triggerTarget = match[1];
            triggerOperator = match[2];
            triggerValue = match[3];
          } else {
             // Fallback if parsing fails (legacy rule)
             triggerValue = r.trigger;
          }
        }

        let constraintTarget = '';
        let constraintOperator = '>=';
        let constraintValue = '';
        if (r.must_satisfy) {
          const cMatch = r.must_satisfy.match(/^([\w.]+)\s*(>=|<=|>|<|==|!=)\s*(.+)$/);
          if (cMatch) {
            constraintTarget = cMatch[1];
            constraintOperator = cMatch[2];
            constraintValue = cMatch[3];
          } else {
             constraintTarget = r.must_satisfy;
          }
        }

        return {
          triggerTarget,
          triggerOperator,
          triggerValue,
          constraintTarget,
          constraintOperator,
          constraintValue,
          error_message: r.error_message || '',
          requires: r.requires || [],
          guarantor_docs: r.guarantor_docs || [],
          excluded_docs: r.excluded_docs || []
        };
      }));
      setPolicyDocs((policy.policy_documents || []).map(d => ({
        party: d.party || 'applicant',
        doc_type: d.doc_type || '',
        is_mandatory: d.is_mandatory !== undefined ? d.is_mandatory : true
      })));
    } else {
      setFormData({
        product_type: product,
        min_loan_amount: '50000',
        max_loan_amount: '1500000',
        ltv_min: '',
        ltv_max: '',
        min_age: '18',
        max_age: '65',
        min_cibil: '650',
        preferred_cibil: '',
        cibil_negative_accepted: false,
        co_applicant_required: false,
        customer_types_salaried: true,
        customer_types_self_employed: true,
        customer_types_agriculture: false
      });
      setOwnershipRules([]);
      setConditionalRules([]);
      setPolicyDocs([]);
    }
  };

  useEffect(() => {
    if (!policies) return;
    const productPolicies = policies.filter(p => p.product_type === selectedProduct);
    if (productPolicies.length > 0) {
      productPolicies.sort((a, b) => b.version - a.version);
      loadPolicyIntoForm(productPolicies[0], selectedProduct);
    } else {
      loadPolicyIntoForm(null, selectedProduct);
    }
  }, [selectedProduct, policies]);

  useEffect(() => {
    setPageMeta({ 
      title: `${lender ? lender.name : 'Lender'} Policy Configuration`, 
      subtitle: 'Define logic and rules that automatically generate document checklists during loan applications.' 
    });
  }, [setPageMeta, lender]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleCreatePolicy = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    
    try {
      const customer_types = [];
      if (formData.customer_types_salaried) customer_types.push('salaried');
      if (formData.customer_types_self_employed) customer_types.push('self_employed');
      if (formData.customer_types_agriculture) customer_types.push('agriculture');

      const payload = {
        product_type: formData.product_type,
        effective_from: new Date().toISOString(),
        min_loan_amount: Number(formData.min_loan_amount),
        max_loan_amount: Number(formData.max_loan_amount),
        min_age: Number(formData.min_age),
        max_age: Number(formData.max_age),
        cibil_negative_accepted: formData.cibil_negative_accepted,
        co_applicant_required: formData.co_applicant_required,
        customer_types,
        ownership_proof_rules: ownershipRules
          .filter(r => r.if_address_type.trim() !== '')
          .map(r => ({
            if_address_type: r.if_address_type,
            required_docs: r.required_docs
          })),
        conditional_rules: conditionalRules
          .filter(r => r.triggerValue.trim() !== '')
          .map(r => ({
            trigger: `${r.triggerTarget} ${r.triggerOperator} '${r.triggerValue}'`,
            requires: r.requires,
            guarantor_docs: r.guarantor_docs,
            excluded_docs: r.excluded_docs,
            ...(r.constraintTarget && r.constraintValue ? {
              must_satisfy: `${r.constraintTarget} ${r.constraintOperator} ${r.constraintValue}`,
              error_message: r.error_message || ''
            } : {})
          })),
        policy_documents: policyDocs.filter(d => d.doc_type.trim() !== '')
      };

      if (formData.ltv_min) payload.ltv_min = Number(formData.ltv_min);
      if (formData.ltv_max) payload.ltv_max = Number(formData.ltv_max);
      if (formData.min_cibil) payload.min_cibil = Number(formData.min_cibil);
      if (formData.preferred_cibil) payload.preferred_cibil = Number(formData.preferred_cibil);

      // 1. Create the new policy (Draft)
      const res = await apiClient.post(`/lenders/${id}/policies`, payload);
      const newPolicy = res.data?.policy;

      if (newPolicy) {
        // 2. Publish it immediately to make it Active
        await apiClient.post(`/policies/${newPolicy.id}/publish`);
      }
      
      alert('Policy updated successfully');
      
      // Refetch to reload UI state
      await fetchData();
    } catch (err) {
      alert(err?.response?.data?.message || err.message || 'Error updating policy');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading policy configuration...</div>;

  return (
    <div className={styles.container}>
      <button onClick={() => navigate('/lenders')} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', textAlign: 'left', fontWeight: 500, padding: 0, marginBottom: '1rem' }}>
        &larr; Back to Lenders
      </button>

      {/* Top Product Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '1rem', gap: '2rem' }}>
        {[
          { id: 'new_car', label: 'New Car' },
          { id: 'used_car', label: 'Used Car' },
          { id: 'commercial_vehicle', label: 'Commercial Vehicle' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setSelectedProduct(tab.id)}
            style={{
              padding: '1rem 0.5rem',
              background: 'none',
              border: 'none',
              borderBottom: selectedProduct === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
              color: selectedProduct === tab.id ? '#3b82f6' : '#64748b',
              fontWeight: 600,
              fontSize: '1rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={styles.card}>
        <form onSubmit={handleCreatePolicy}>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Min Amount (₹)</label>
              <input className={styles.input} type="number" name="min_loan_amount" value={formData.min_loan_amount} onChange={handleChange} required />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Max Amount (₹)</label>
              <input className={styles.input} type="number" name="max_loan_amount" value={formData.max_loan_amount} onChange={handleChange} required />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Min LTV (%)</label>
              <input className={styles.input} type="number" name="ltv_min" value={formData.ltv_min} onChange={handleChange} placeholder="e.g. 50" />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Max LTV (%)</label>
              <input className={styles.input} type="number" name="ltv_max" value={formData.ltv_max} onChange={handleChange} placeholder="e.g. 90" />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Min Age</label>
              <input className={styles.input} type="number" name="min_age" value={formData.min_age} onChange={handleChange} required />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Max Age</label>
              <input className={styles.input} type="number" name="max_age" value={formData.max_age} onChange={handleChange} required />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Min CIBIL Score</label>
              <input className={styles.input} type="number" name="min_cibil" value={formData.min_cibil} onChange={handleChange} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Preferred CIBIL</label>
              <input className={styles.input} type="number" name="preferred_cibil" value={formData.preferred_cibil} onChange={handleChange} />
            </div>
          </div>

          <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#334155', fontWeight: 500 }}>
              <input type="checkbox" name="cibil_negative_accepted" checked={formData.cibil_negative_accepted} onChange={handleChange} />
              Negative CIBIL Accepted? (-1)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#334155', fontWeight: 500 }}>
              <input type="checkbox" name="co_applicant_required" checked={formData.co_applicant_required} onChange={handleChange} />
              Co-Applicant Required?
            </label>
          </div>

          <div style={{ marginTop: '1.5rem', marginBottom: '2rem' }}>
            <h4 style={{ color: '#0f172a', marginBottom: '0.75rem', fontSize: '1rem', fontWeight: 600 }}>Allowed Customer Types</h4>
            <div style={{ display: 'flex', gap: '2rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#334155', fontWeight: 500 }}>
                <input type="checkbox" name="customer_types_salaried" checked={formData.customer_types_salaried} onChange={handleChange} />
                Salaried
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#334155', fontWeight: 500 }}>
                <input type="checkbox" name="customer_types_self_employed" checked={formData.customer_types_self_employed} onChange={handleChange} />
                Self Employed
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#334155', fontWeight: 500 }}>
                <input type="checkbox" name="customer_types_agriculture" checked={formData.customer_types_agriculture} onChange={handleChange} />
                Agriculture
              </label>
            </div>
          </div>

          {/* Default Documents Builder */}
          <div style={{ marginTop: '1.5rem', marginBottom: '2rem', background: '#f8fafc', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
            <h4 style={{ color: '#0f172a', marginBottom: '1rem', fontSize: '1rem', fontWeight: 600 }}>Default Required Documents</h4>
            {policyDocs.length === 0 && <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1rem' }}>No documents added.</p>}
            
            {policyDocs.map((doc, index) => (
              <div key={index} style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'center' }}>
                <select 
                  value={doc.party}
                  onChange={(e) => {
                    const newDocs = [...policyDocs];
                    newDocs[index] = { ...newDocs[index], party: e.target.value };
                    setPolicyDocs(newDocs);
                  }}
                  style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', background: 'white', color: '#0f172a', fontSize: '0.875rem' }}
                >
                  <option value="applicant">Applicant</option>
                  <option value="co_applicant">Co-Applicant</option>
                  <option value="guarantor">Guarantor</option>
                </select>
                <input 
                  placeholder="Document Key (e.g. pan, aadhaar)"
                  value={doc.doc_type}
                  onChange={(e) => {
                    const newDocs = [...policyDocs];
                    newDocs[index] = { ...newDocs[index], doc_type: e.target.value };
                    setPolicyDocs(newDocs);
                  }}
                  style={{ flex: 2, padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', background: 'white', color: '#0f172a', fontSize: '0.875rem' }}
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#334155', fontWeight: 500, flex: 1 }}>
                  <input 
                    type="checkbox" 
                    checked={doc.is_mandatory} 
                    onChange={(e) => {
                      const newDocs = [...policyDocs];
                      newDocs[index] = { ...newDocs[index], is_mandatory: e.target.checked };
                      setPolicyDocs(newDocs);
                    }} 
                  />
                  Mandatory?
                </label>
                <button 
                  type="button" 
                  onClick={() => setPolicyDocs(policyDocs.filter((_, i) => i !== index))} 
                  style={{ padding: '0.75rem 1rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontWeight: 500 }}
                >
                  Delete
                </button>
              </div>
            ))}
            <button 
              type="button" 
              onClick={() => setPolicyDocs([...policyDocs, { party: 'applicant', doc_type: '', is_mandatory: true }])} 
              style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontWeight: 500 }}
            >
              + Add Document
            </button>
          </div>

          {/* Ownership Proof Rules Builder */}
          <div style={{ marginTop: '1.5rem', marginBottom: '2rem', background: '#f8fafc', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
            <h4 style={{ color: '#0f172a', marginBottom: '1rem', fontSize: '1rem', fontWeight: 600 }}>Ownership Proof Rules</h4>
            {ownershipRules.length === 0 && <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1rem' }}>No rules added.</p>}
            
            {ownershipRules.map((rule, index) => (
              <div key={index} style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'flex-start' }}>
                <select 
                  value={rule.if_address_type}
                  onChange={(e) => {
                    const newRules = [...ownershipRules];
                    newRules[index] = { ...newRules[index], if_address_type: e.target.value };
                    setOwnershipRules(newRules);
                  }}
                  style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', background: 'white', color: '#0f172a', fontSize: '0.875rem', height: '42px' }}
                >
                  <option value="">Select Address Type</option>
                  <option value="owned">Owned</option>
                  <option value="rental">Rental</option>
                </select>
                <div style={{ flex: 3 }}>
                  <TagInput 
                    value={rule.required_docs}
                    onChange={(newTags) => {
                      const newRules = [...ownershipRules];
                      newRules[index] = { ...newRules[index], required_docs: newTags };
                      setOwnershipRules(newRules);
                    }}
                    placeholder="Required Docs (e.g. electricity_bill)"
                  />
                </div>
                <button 
                  type="button" 
                  onClick={() => setOwnershipRules(ownershipRules.filter((_, i) => i !== index))} 
                  style={{ padding: '0.75rem 1rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontWeight: 500, height: '42px' }}
                >
                  Delete
                </button>
              </div>
            ))}
            <button 
              type="button" 
              onClick={() => setOwnershipRules([...ownershipRules, { if_address_type: '', required_docs: [] }])} 
              style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontWeight: 500 }}
            >
              + Add Rule
            </button>
          </div>

          {/* Conditional Rules Builder */}
          <div style={{ marginTop: '1.5rem', marginBottom: '2rem', background: '#f8fafc', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
            <h4 style={{ color: '#0f172a', marginBottom: '1rem', fontSize: '1rem', fontWeight: 600 }}>Conditional Rules</h4>
            {conditionalRules.length === 0 && <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1rem' }}>No rules added.</p>}
            
            {conditionalRules.map((rule, index) => (
              <div key={index} style={{ marginBottom: '1rem', padding: '1.5rem', background: 'white', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                  <strong style={{ fontSize: '0.875rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rule #{index + 1}</strong>
                  <button type="button" onClick={() => setConditionalRules(conditionalRules.filter((_, i) => i !== index))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}>Remove Rule</button>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Trigger Condition</label>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <TargetSelector 
                        value={rule.triggerTarget}
                        onChange={(val) => {
                          const newRules = [...conditionalRules];
                          newRules[index] = { ...newRules[index], triggerTarget: val };
                          setConditionalRules(newRules);
                        }}
                        placeholder="e.g. applicant.custom_fields.gender"
                        borderColor="#cbd5e1"
                      />
                      <select 
                        value={rule.triggerOperator}
                        onChange={(e) => {
                          const newRules = [...conditionalRules];
                          newRules[index] = { ...newRules[index], triggerOperator: e.target.value };
                          setConditionalRules(newRules);
                        }}
                        style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.875rem', background: 'white' }}
                      >
                        <option value="==">Equals (==)</option>
                        <option value="!=">Not Equals (!=)</option>
                      </select>
                      <ValueSelector 
                        target={rule.triggerTarget}
                        value={rule.triggerValue}
                        onChange={(val) => {
                          const newRules = [...conditionalRules];
                          newRules[index] = { ...newRules[index], triggerValue: val };
                          setConditionalRules(newRules);
                        }}
                        placeholder="Value (e.g. rental)"
                        borderColor="#cbd5e1"
                      />
                    </div>
                  </div>

                  {rule.triggerTarget && rule.triggerValue && (
                    <>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Requires Documents</label>
                    <TagInput 
                      value={rule.requires}
                      onChange={(newTags) => {
                        const newRules = [...conditionalRules];
                        newRules[index] = { ...newRules[index], requires: newTags };
                        setConditionalRules(newRules);
                      }}
                      placeholder="e.g. rent_agreement"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Guarantor Documents</label>
                    <TagInput 
                      value={rule.guarantor_docs}
                      onChange={(newTags) => {
                        const newRules = [...conditionalRules];
                        newRules[index] = { ...newRules[index], guarantor_docs: newTags };
                        setConditionalRules(newRules);
                      }}
                      placeholder="e.g. pan, aadhaar"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Excluded Documents</label>
                    <TagInput 
                      value={rule.excluded_docs}
                      onChange={(newTags) => {
                        const newRules = [...conditionalRules];
                        newRules[index] = { ...newRules[index], excluded_docs: newTags };
                        setConditionalRules(newRules);
                      }}
                      placeholder="e.g. electricity_bill"
                    />
                  </div>

                  {/* Optional Rejection Constraint */}
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#e11d48', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Optional: Rejection Constraint</label>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.75rem' }}>If a constraint is added here, failing it will instantly reject the loan.</p>
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                      <TargetSelector 
                        value={rule.constraintTarget}
                        onChange={(val) => {
                          const newRules = [...conditionalRules];
                          newRules[index] = { ...newRules[index], constraintTarget: val };
                          setConditionalRules(newRules);
                        }}
                        placeholder="e.g. applicant.custom_fields.turnover"
                        borderColor="#fda4af"
                      />
                      <select 
                        value={rule.constraintOperator}
                        onChange={(e) => {
                          const newRules = [...conditionalRules];
                          newRules[index] = { ...newRules[index], constraintOperator: e.target.value };
                          setConditionalRules(newRules);
                        }}
                        style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid #fda4af', fontSize: '0.875rem', background: 'white' }}
                      >
                        <option value=">=">Greater Than (&gt;=)</option>
                        <option value="<=">Less Than (&lt;=)</option>
                        <option value=">">Greater (&gt;)</option>
                        <option value="<">Less (&lt;)</option>
                        <option value="==">Equals (==)</option>
                        <option value="!=">Not Equals (!=)</option>
                      </select>
                      <ValueSelector 
                        target={rule.constraintTarget}
                        value={rule.constraintValue}
                        onChange={(val) => {
                          const newRules = [...conditionalRules];
                          newRules[index] = { ...newRules[index], constraintValue: val };
                          setConditionalRules(newRules);
                        }}
                        placeholder="Value (e.g. 5000000 or true)"
                        borderColor="#fda4af"
                      />
                    </div>
                    <div>
                      <input 
                        placeholder="Rejection Message (e.g. Agriculture customers must have a turnover above 50 Lacs.)"
                        value={rule.error_message}
                        onChange={(e) => {
                          const newRules = [...conditionalRules];
                          newRules[index] = { ...newRules[index], error_message: e.target.value };
                          setConditionalRules(newRules);
                        }}
                        style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid #fda4af', fontSize: '0.875rem', background: 'white' }}
                      />
                    </div>
                  </div>
                    </>
                  )}
                </div>
              </div>
            ))}
            <button 
              type="button" 
              onClick={() => setConditionalRules([...conditionalRules, { triggerTarget: 'applicant.address_type', triggerOperator: '==', triggerValue: '', requires: [], guarantor_docs: [], excluded_docs: [] }])} 
              style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontWeight: 500 }}
            >
              + Add Rule
            </button>
          </div>


          <button type="submit" disabled={saving} className={styles.btnPrimary} style={{ width: '100%', padding: '1rem', fontSize: '1rem' }}>
            {saving ? 'Saving...' : 'Save & Activate Policy'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PolicyBuilder;
