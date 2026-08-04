'use client';

import { useGetLenderRulesQuery, useUpdateLenderMutation, useGetLendersQuery } from '@/store/api/adminApi';
import { useState, useEffect, use } from 'react';
import { useDispatch } from 'react-redux';
import { setHeaderInfo } from '@/store/slices/uiSlice';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

const APPLICANT_DOC_OPTIONS = [
  { id: 'kyc_pan', label: 'PAN Card' },
  { id: 'kyc_aadhaar', label: 'Aadhaar Card' },
  { id: 'income_bank_statement', label: 'Bank Statement (6M)' },
  { id: 'address_ownership_proof', label: 'Ownership Proof' }
];

const CO_APPLICANT_DOC_OPTIONS = [
  { id: 'kyc_pan', label: 'PAN Card' },
  { id: 'kyc_aadhaar', label: 'Aadhaar Card' },
  { id: 'address_ownership_proof', label: 'Ownership Proof' }
];

const GUARANTOR_DOC_OPTIONS = [
  { id: 'kyc_pan', label: 'PAN Card' },
  { id: 'kyc_aadhaar', label: 'Aadhaar Card' },
  { id: 'electricity_khatauni', label: 'Electricity/Khatauni' },
];

const CUSTOMER_TYPE_OPTIONS = [
  { id: 'salaried', label: 'Salaried' },
  { id: 'self_employed', label: 'Self Employed' },
  { id: 'agriculture', label: 'Agriculture' },
];

const RENTAL_DOC_OPTIONS = [
  { id: 'address_hometown_documents', label: 'Hometown Docs' },
  { id: 'landlord_electricity_bill', label: 'Landlord Electricity' },
  { id: 'address_local', label: 'Local Address Proof' }
];

export default function LenderRulesPage({ params }) {
  const { lenderId } = use(params);
  const router = useRouter();
  
  // Need to find lender name
  const { data: lendersData } = useGetLendersQuery();
  const lender = lendersData?.data?.find(l => l.id === lenderId);

  const dispatch = useDispatch();
  useEffect(() => {
    if (lender) {
      dispatch(setHeaderInfo({ title: `${lender.name} Rules Management`, breadcrumbs: ['Operations', 'Lenders', 'Rules'] }));
    } else {
      dispatch(setHeaderInfo({ title: 'Rules Management', breadcrumbs: ['Operations', 'Lenders', 'Rules'] }));
    }
  }, [dispatch, lender]);
  
  const { data, isLoading } = useGetLenderRulesQuery(lenderId);
  const [updateLender, { isLoading: isUpdating }] = useUpdateLenderMutation();

  const [activeTab, setActiveTab] = useState('new_car');
  const [activeStage, setActiveStage] = useState('general');
  const [rules, setRules] = useState({ products: {} });
  const [error, setError] = useState(null);

  useEffect(() => {
    if (data?.data) {
      setRules(data.data);
    }
  }, [data]);

  const tabs = [
    { id: 'new_car', label: 'New Car' },
    { id: 'used_car', label: 'Used Car' },
    { id: 'commercial_vehicle', label: 'Commercial Vehicle' }
  ];

  const currentProductRules = rules.products?.[activeTab] || {
    loanRange: { min: 0, max: 0 },
    ltvRange: { min: 0, max: 100 },
    ageRange: { min: 21, max: 65 },
    minCibil: 650,
    cibilNegativeAccepted: false,
    customerTypes: [],
    coApplicantRequired: false,
  };

  const handleUpdateProduct = (key, value) => {
    setRules(prev => {
      const current = prev.products?.[activeTab] || {};
      return {
        ...prev,
        products: {
          ...prev.products,
          [activeTab]: {
            ...current,
            [key]: value
          }
        }
      };
    });
  };

  const handleNestedUpdate = (parent, key, value) => {
    setRules(prev => {
      const current = prev.products?.[activeTab] || {};
      return {
        ...prev,
        products: {
          ...prev.products,
          [activeTab]: {
            ...current,
            [parent]: {
              ...(current[parent] || {}),
              [key]: value
            }
          }
        }
      };
    });
  };

  const handleSave = async () => {
    try {
      setError(null);
      await updateLender({ id: lenderId, rules }).unwrap();
      alert('Rules saved successfully!');
      router.push('/lenders');
    } catch (err) {
      setError(`Failed to save rules: ${err.data?.error?.message || err.message}`);
      alert(`Failed to save rules: ${err.data?.error?.message || err.message}`);
    }
  };

  if (isLoading) return <div style={{ padding: 40 }}>Loading rules...</div>;

  return (
    <>
      <div style={{ position: 'sticky', top: 60, background: 'var(--color-bg)', zIndex: 40, margin: '0 -32px 24px -32px', padding: '16px 32px 0 32px', borderBottom: '1px solid var(--color-border)' }}>
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <Link href="/lenders" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>← Back to Lenders</Link>
          </div>
          <button className="btn btn-primary" onClick={handleSave} disabled={isUpdating}>
            {isUpdating ? 'Saving...' : 'Save All Rules'}
          </button>
        </div>

        {error && <div style={{ padding: 16, background: 'var(--color-rose-bg)', color: 'var(--color-rose)', borderRadius: 8, marginBottom: 24 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 16, borderBottom: '1px solid var(--color-border)' }}>
          {tabs.map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{ 
                padding: '12px 16px', 
                background: 'none', 
                border: 'none', 
                borderBottom: activeTab === tab.id ? '2px solid var(--color-primary)' : '2px solid transparent',
                color: activeTab === tab.id ? 'var(--color-primary)' : 'var(--color-text-2)',
                fontWeight: activeTab === tab.id ? 700 : 500,
                cursor: 'pointer',
                marginBottom: '-1px'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24, paddingBottom: 64, alignItems: 'flex-start' }}>
        
        {/* Left Sidebar Menu */}
        <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8, position: 'sticky', top: 24 }}>
          <h3 style={{ marginBottom: 16, fontSize: 18, fontWeight: 700, textTransform: 'capitalize', color: 'var(--color-text)' }}>{activeTab.replace('_', ' ')} Policy</h3>
          {[
            { id: 'general', label: '1. General Parameters' },
            { id: 'applicant', label: '2. Applicant Rules' },
            { id: 'coapplicant', label: '3. Co-Applicant Rules' },
            { id: 'guarantor', label: '4. Guarantor Policy' },
            { id: 'rental', label: '5. Rental Profile Logic' }
          ].map(stage => (
            <button
              key={stage.id}
              onClick={() => setActiveStage(stage.id)}
              style={{
                padding: '14px 16px',
                textAlign: 'left',
                background: activeStage === stage.id ? 'var(--color-primary)' : 'var(--color-surface)',
                color: activeStage === stage.id ? '#fff' : 'var(--color-text)',
                border: '1px solid',
                borderColor: activeStage === stage.id ? 'var(--color-primary)' : 'var(--color-border)',
                borderRadius: 8,
                fontWeight: activeStage === stage.id ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: activeStage === stage.id ? '0 4px 12px rgba(var(--color-primary-rgb), 0.2)' : 'none'
              }}
            >
              {stage.label}
            </button>
          ))}
        </div>

        {/* Right Content Panel */}
        <div style={{ flex: 1, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 32, minHeight: 400 }}>
          <AnimatePresence mode="wait">
          {activeStage === 'general' && (
            <motion.div
              key="general"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              <h4 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--color-border)' }}>General Parameters</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label className="label">Min Loan Amount (₹)</label>
                  <input type="number" className="input" value={currentProductRules.loanRange?.min || ''} onChange={e => handleNestedUpdate('loanRange', 'min', Number(e.target.value))} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label className="label">Max Loan Amount (₹)</label>
                  <input type="number" className="input" value={currentProductRules.loanRange?.max || ''} onChange={e => handleNestedUpdate('loanRange', 'max', Number(e.target.value))} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label className="label">Min LTV (%)</label>
                  <input type="number" className="input" value={currentProductRules.ltvRange?.min || ''} onChange={e => handleNestedUpdate('ltvRange', 'min', Number(e.target.value))} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label className="label">Max LTV (%)</label>
                  <input type="number" className="input" value={currentProductRules.ltvRange?.max || ''} onChange={e => handleNestedUpdate('ltvRange', 'max', Number(e.target.value))} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label className="label">Min Age (Years)</label>
                  <input type="number" className="input" value={currentProductRules.ageRange?.min || ''} onChange={e => handleNestedUpdate('ageRange', 'min', Number(e.target.value))} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label className="label">Max Age (Years)</label>
                  <input type="number" className="input" value={currentProductRules.ageRange?.max || ''} onChange={e => handleNestedUpdate('ageRange', 'max', Number(e.target.value))} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label className="label">Min CIBIL Score</label>
                  <input type="number" className="input" value={currentProductRules.minCibil || ''} onChange={e => handleUpdateProduct('minCibil', Number(e.target.value))} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 28 }}>
                  <input type="checkbox" id="ntc" checked={currentProductRules.cibilNegativeAccepted || false} onChange={e => handleUpdateProduct('cibilNegativeAccepted', e.target.checked)} />
                  <label htmlFor="ntc" style={{ fontWeight: 600, fontSize: 14 }}>Accept NTC / -1 CIBIL</label>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--color-border)' }}>
                <label className="label">Eligible Customer Types</label>
                <div style={{ display: 'flex', gap: 24 }}>
                  {CUSTOMER_TYPE_OPTIONS.map(type => (
                    <div key={`ct-${type.id}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input 
                        type="checkbox" 
                        id={`ct-${type.id}`}
                        checked={Array.isArray(currentProductRules.customerTypes) ? currentProductRules.customerTypes.includes(type.id) : false}
                        onChange={(e) => {
                          const current = Array.isArray(currentProductRules.customerTypes) ? currentProductRules.customerTypes : [];
                          const updated = e.target.checked ? [...current, type.id] : current.filter(d => d !== type.id);
                          handleUpdateProduct('customerTypes', updated);
                        }}
                      />
                      <label htmlFor={`ct-${type.id}`} style={{ fontSize: 14 }}>{type.label}</label>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeStage === 'applicant' && (
            <motion.div
              key="applicant"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              <h4 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--color-border)' }}>Applicant Rules</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <label className="label">Mandatory Documents</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                  {APPLICANT_DOC_OPTIONS.map(doc => (
                    <div key={`app-${doc.id}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input 
                        type="checkbox" 
                        id={`app-${doc.id}`}
                        checked={Array.isArray(currentProductRules.applicantDocs) ? currentProductRules.applicantDocs.includes(doc.id) : false}
                        onChange={(e) => {
                          const current = Array.isArray(currentProductRules.applicantDocs) ? currentProductRules.applicantDocs : [];
                          const updated = e.target.checked ? [...current, doc.id] : current.filter(d => d !== doc.id);
                          handleUpdateProduct('applicantDocs', updated);
                        }}
                      />
                      <label htmlFor={`app-${doc.id}`} style={{ fontSize: 13 }}>{doc.label}</label>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeStage === 'coapplicant' && (
            <motion.div
              key="coapplicant"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              <h4 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--color-border)' }}>Co-Applicant Rules</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', gap: 24, marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="checkbox" id="coapp-req" checked={currentProductRules.coApplicant?.required || false} onChange={e => {
                      if (e.target.checked) {
                        handleNestedUpdate('coApplicant', 'required', true);
                      } else {
                        handleUpdateProduct('coApplicant', { required: false, bloodRelationOnly: false, docs: [] });
                      }
                    }} />
                    <label htmlFor="coapp-req" style={{ fontWeight: 600, fontSize: 14 }}>Is Required?</label>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: currentProductRules.coApplicant?.required ? 1 : 0.4, pointerEvents: currentProductRules.coApplicant?.required ? 'auto' : 'none', transition: 'all 0.2s' }}>
                    <input type="checkbox" id="coapp-blood" checked={currentProductRules.coApplicant?.bloodRelationOnly || false} onChange={e => handleNestedUpdate('coApplicant', 'bloodRelationOnly', e.target.checked)} />
                    <label htmlFor="coapp-blood" style={{ fontWeight: 600, fontSize: 14 }}>Must be Blood Relation?</label>
                  </div>
                </div>
                <div style={{ opacity: currentProductRules.coApplicant?.required ? 1 : 0.4, pointerEvents: currentProductRules.coApplicant?.required ? 'auto' : 'none', transition: 'all 0.2s' }}>
                  <label className="label">Mandatory Documents</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                  {CO_APPLICANT_DOC_OPTIONS.map(doc => (
                    <div key={`coapp-${doc.id}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input 
                        type="checkbox" 
                        id={`coapp-${doc.id}`}
                        checked={Array.isArray(currentProductRules.coApplicant?.docs) ? currentProductRules.coApplicant.docs.includes(doc.id) : false}
                        onChange={(e) => {
                          const current = Array.isArray(currentProductRules.coApplicant?.docs) ? currentProductRules.coApplicant.docs : [];
                          const updated = e.target.checked ? [...current, doc.id] : current.filter(d => d !== doc.id);
                          handleNestedUpdate('coApplicant', 'docs', updated);
                        }}
                      />
                      <label htmlFor={`coapp-${doc.id}`} style={{ fontSize: 13 }}>{doc.label}</label>
                    </div>
                  ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeStage === 'guarantor' && (
            <motion.div
              key="guarantor"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              <h4 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--color-border)' }}>Guarantor Policy</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <select className="input" style={{ width: '300px' }} value={currentProductRules.guarantorPolicy || 'none'} onChange={e => {
                  const val = e.target.value;
                  if (val === 'none') {
                    setRules(prev => ({
                      ...prev,
                      products: {
                        ...prev.products,
                        [activeTab]: {
                          ...prev.products[activeTab],
                          guarantorPolicy: 'none',
                          guarantorDocs: []
                        }
                      }
                    }));
                  } else {
                    handleUpdateProduct('guarantorPolicy', val);
                  }
                }}>
                  <option value="none">Never Required</option>
                  <option value="rental_only">Only for Rental Profiles</option>
                  <option value="if_no_ownership_proof">If No Ownership Proof Provided</option>
                  <option value="always">Always Required</option>
                </select>
                {currentProductRules.guarantorPolicy && currentProductRules.guarantorPolicy !== 'none' && (
                  <>
                    <label className="label" style={{ marginTop: 8 }}>Guarantor Mandatory Documents</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                      {GUARANTOR_DOC_OPTIONS.map(doc => (
                        <div key={`guar-${doc.id}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input 
                            type="checkbox" 
                            id={`guar-${doc.id}`}
                            checked={Array.isArray(currentProductRules.guarantorDocs) ? currentProductRules.guarantorDocs.includes(doc.id) : false}
                            onChange={(e) => {
                              const current = Array.isArray(currentProductRules.guarantorDocs) ? currentProductRules.guarantorDocs : [];
                              const updated = e.target.checked ? [...current, doc.id] : current.filter(d => d !== doc.id);
                              handleUpdateProduct('guarantorDocs', updated);
                            }}
                          />
                          <label htmlFor={`guar-${doc.id}`} style={{ fontSize: 13 }}>{doc.label}</label>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {activeStage === 'rental' && (
            <motion.div
              key="rental"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              <h4 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--color-border)' }}>Rental Profile Logic</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <input type="checkbox" id="rental-ht" checked={currentProductRules.rentalProfile?.requireHometownStage || false} onChange={e => {
                    if (e.target.checked) {
                      handleNestedUpdate('rentalProfile', 'requireHometownStage', true);
                    } else {
                      handleUpdateProduct('rentalProfile', { requireHometownStage: false, extraDocs: [] });
                    }
                  }} />
                  <label htmlFor="rental-ht" style={{ fontWeight: 600, fontSize: 14 }}>Require Hometown Verification Stage?</label>
                </div>
                <div style={{ opacity: currentProductRules.rentalProfile?.requireHometownStage ? 1 : 0.4, pointerEvents: currentProductRules.rentalProfile?.requireHometownStage ? 'auto' : 'none', transition: 'all 0.2s' }}>
                  <label className="label">Extra Required Documents for Rental Profiles</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                  {RENTAL_DOC_OPTIONS.map(doc => (
                    <div key={`rental-${doc.id}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input 
                        type="checkbox" 
                        id={`rental-${doc.id}`}
                        checked={Array.isArray(currentProductRules.rentalProfile?.extraDocs) ? currentProductRules.rentalProfile.extraDocs.includes(doc.id) : false}
                        onChange={(e) => {
                          const current = Array.isArray(currentProductRules.rentalProfile?.extraDocs) ? currentProductRules.rentalProfile.extraDocs : [];
                          const updated = e.target.checked ? [...current, doc.id] : current.filter(d => d !== doc.id);
                          handleNestedUpdate('rentalProfile', 'extraDocs', updated);
                        }}
                      />
                      <label htmlFor={`rental-${doc.id}`} style={{ fontSize: 13 }}>{doc.label}</label>
                    </div>
                  ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
