'use client';

import { useGetLendersQuery, useUpdateLenderMutation, useGetLenderRulesQuery } from '@/store/api/adminApi';
import { StatusBadge } from '@/components/ui/Primitives';
import { useState } from 'react';

export default function LendersPage() {
  const { data, isLoading } = useGetLendersQuery();
  const [updateLender, { isLoading: updating }] = useUpdateLenderMutation();
  const [rulesModal, setRulesModal] = useState(null); // lender code or null

  const lenders = data?.data || [];

  async function handleToggle(lender) {
    await updateLender({ id: lender.id, is_active: !lender.is_active });
  }
  async function handlePriorityChange(lender, value) {
    const p = parseInt(value, 10);
    if (!isNaN(p)) await updateLender({ id: lender.id, priority: p });
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Lenders</h1>
        <p className="page-desc">Manage lender activation and priority. Credit rules are read-only — defined in backend code.</p>
      </div>

      {rulesModal && <RulesModal code={rulesModal} onClose={() => setRulesModal(null)} />}

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Lender</th>
              <th>Code</th>
              <th>Type</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Rules</th>
              <th>Active</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 6 }, (_, i) => (
                <tr key={i}>{[160, 100, 60, 60, 80, 60, 40].map((w, j) => (
                  <td key={j}><div className="skeleton" style={{ height: 12, width: w }} /></td>
                ))}</tr>
              ))
            ) : lenders.map((lender) => (
              <tr key={lender.id} style={{ cursor: 'default' }}>
                <td style={{ fontWeight: 600 }}>{lender.name}</td>
                <td><span className="font-mono">{lender.code}</span></td>
                <td style={{ textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.06em', color: 'var(--color-text-3)' }}>{lender.lender_type}</td>
                <td>
                  <input
                    type="number" min="1" max="99"
                    defaultValue={lender.priority}
                    onBlur={(e) => handlePriorityChange(lender, e.target.value)}
                    className="input"
                    style={{ width: 64, padding: '4px 8px', fontSize: 13, textAlign: 'center' }}
                    id={`priority-${lender.id}`}
                  />
                </td>
                <td><StatusBadge status={lender.is_active ? 'active' : 'inactive'} /></td>
                <td>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setRulesModal(lender.code)}
                    id={`rules-${lender.code}`}
                  >
                    View Rules
                  </button>
                </td>
                <td>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={lender.is_active}
                      onChange={() => handleToggle(lender)}
                      disabled={updating}
                      id={`toggle-${lender.id}`}
                    />
                    <span className="toggle-track" />
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 12, color: 'var(--color-text-3)' }}>
        ℹ️ Only <strong>is_active</strong> and <strong>priority</strong> can be changed here. Credit rules are hardcoded in backend modules (<code>domains/lenders/&lt;code&gt;/</code>) — deploy a new backend version to update rules.
      </div>
    </>
  );
}

function RulesModal({ code, onClose }) {
  const { data, isLoading } = useGetLenderRulesQuery(code);
  const rules = data?.data;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 32, maxWidth: 640, width: '90%', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>{rules?.lenderName || code} — Rules Reference</h2>
            {rules && <span className="font-mono" style={{ fontSize: 11, color: 'var(--color-text-3)' }}>v{rules.rulesVersion}</span>}
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        {isLoading ? (
          <div className="skeleton" style={{ height: 200 }} />
        ) : rules ? (
          <ProductRulesList rules={rules} />
        ) : (
          <p style={{ color: 'var(--color-rose)', fontSize: 13 }}>No rules module registered for this lender. Check backend registry.js.</p>
        )}
      </div>
    </div>
  );
}

function ProductRulesList({ rules }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {Object.entries(rules.products || {}).map(([product, r]) => (
        <div key={product}>
          <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'capitalize', color: 'var(--color-primary)', marginBottom: 12 }}>
            {product.replace(/_/g, ' ')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              ['Loan Range', `₹${r.loanRange?.min?.toLocaleString('en-IN')} – ₹${r.loanRange?.max?.toLocaleString('en-IN')}`],
              ['LTV Range', `${r.ltvRange?.min}% – ${r.ltvRange?.max}%`],
              ['Age Range', `${r.ageRange?.min} – ${r.ageRange?.max} years`],
              ['Min CIBIL', r.minCibil],
              ['NTC Accepted', r.cibilNegativeAccepted ? '✓ Yes' : '✗ No'],
              ['Customer Types', r.customerTypes?.join(', ')],
              ['Co-applicant Required', r.coApplicantRequired ? '✓ Required' : 'Optional'],
            ].map(([label, value]) => (
              <div key={label} style={{ padding: '10px 12px', background: 'var(--color-surface-3)', borderRadius: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-3)', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{String(value)}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {rules.guarantorConditions && (
        <div style={{ padding: '12px 16px', background: 'var(--color-amber-bg)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, fontSize: 12, color: 'var(--color-amber)' }}>
          <strong>Guarantor:</strong> {rules.guarantorConditions}
        </div>
      )}
      {rules.conditionalRules?.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: 'var(--color-text-2)' }}>Conditional Rules</div>
          {rules.conditionalRules.map((r, i) => (
            <div key={i} style={{ padding: '8px 12px', background: 'var(--color-surface-3)', borderRadius: 6, fontSize: 12, color: 'var(--color-text-2)', marginBottom: 6 }}>• {r}</div>
          ))}
        </div>
      )}
    </div>
  );
}
