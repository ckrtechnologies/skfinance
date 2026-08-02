import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export default function WhyPartner() {
  const reasons = [
    "Technology-Focused Approach",
    "Digital Loan Journey Support",
    "API Integration Readiness",
    "Scalable Distribution Model",
    "Customer-Centric Operations",
    "Compliance-Oriented Processes",
    "Strong Leadership & Governance"
  ];

  return (
    <section className="why-partner-section container bg-grid">
      <div className="why-grid">
        <div className="reveal">
          <div className="subheading">WHY PARTNER WITH US</div>
          <h2 className="heading-lg">
            Seven reasons<br/>
            partners<br/>
            <span className="text-primary">choose Shreeja.</span>
          </h2>
          
          <div className="reason-list">
            {reasons.map((reason, index) => (
              <div key={index} className="reason-item reveal" style={{transitionDelay: `${0.1 * index}s`}}>
                <CheckCircle2 className="reason-icon" size={24} />
                <span>{reason}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="reveal" style={{transitionDelay: '0.4s'}}>
          <div style={{position: 'relative', height: '100%', minHeight: '600px', borderRadius: '2rem', overflow: 'hidden'}}>
            <img 
              src="/why_partner_indian.png" 
              alt="Partnership" 
              className="why-image" 
            />
            <div style={{position: 'absolute', bottom: 0, left: 0, right: 0, padding: '3rem', background: 'linear-gradient(to top, rgba(0,11,35,0.9), transparent)'}}>
               <div className="subheading" style={{fontSize: '0.65rem', marginBottom: '0.5rem'}}>SUSTAINABLE GROWTH</div>
               <h3 style={{fontSize: '1.5rem', fontWeight: 600}}>Building India's next-gen lending network</h3>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
