import React from 'react';
import { Phone, Mail } from 'lucide-react';

export default function JoinPartner() {
  const features = [
    { step: '01', title: 'High Income Opportunity', desc: 'Attractive commissions on every loan.' },
    { step: '02', title: '54+ Banks Tie-up', desc: 'More options, higher approvals.' },
    { step: '03', title: 'Dedicated Support', desc: 'End-to-end training & assistance.' },
    { step: '04', title: 'Transparent Payouts', desc: '100% transparent, on-time settlements.' }
  ];

  return (
    <section id="partner" className="join-section container bg-grid">
      <div className="reveal">
        <div className="subheading" style={{justifyContent: 'center', background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1.5rem', borderRadius: '2rem', display: 'inline-flex'}}>BECOME A LOAN PARTNER</div>
        <h2 className="heading-lg" style={{marginTop: '2rem'}}>
          Join hands. Grow<br/>
          business. <span className="text-primary">Earn more.</span>
        </h2>
        <p className="text-muted" style={{marginTop: '1.5rem', maxWidth: '700px', margin: '1.5rem auto 0', lineHeight: '1.6'}}>
          We welcome DSA Partners, Agents, Dealers & Consultants across India —
          partner with India's trusted car loan and multi-product credit distribution
          platform.
        </p>
      </div>

      <div className="join-grid">
        {features.map((feature, index) => (
          <div key={index} className="join-card reveal" style={{transitionDelay: `${0.1 * index}s`}}>
            <div className="join-step">{feature.step}</div>
            <h3 style={{fontSize: '1.125rem', marginBottom: '0.5rem'}}>{feature.title}</h3>
            <p className="text-muted" style={{fontSize: '0.875rem'}}>{feature.desc}</p>
          </div>
        ))}
      </div>

      <div className="reveal" style={{display: 'flex', justifyContent: 'center', gap: '1.5rem'}}>
        <a href="tel:+916388882644" className="btn btn-primary" style={{padding: '1rem 2rem', fontSize: '1.125rem'}}>
          <Phone size={20} /> +91 63888 82644
        </a>
        <a href="mailto:shiv@shreejafinance.online" className="btn btn-outline" style={{padding: '1rem 2rem', fontSize: '1.125rem', borderColor: 'rgba(255,255,255,0.2)'}}>
          <Mail size={20} /> shiv@shreejafinance.online
        </a>
      </div>
    </section>
  );
}
