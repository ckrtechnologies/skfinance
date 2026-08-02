import React from 'react';
import { Telescope, Target } from 'lucide-react';

export default function VisionMission() {
  return (
    <section className="vm-section container bg-grid">
      <div className="reveal">
        <h2 className="heading-lg">
          Where we're going.<br/>
          <span className="text-primary">And how we get there.</span>
        </h2>
        <div className="subheading" style={{justifyContent: 'center', marginTop: '1.5rem'}}>
          <div style={{width: '24px', height: '2px', backgroundColor: 'var(--color-primary)'}}></div>
        </div>
      </div>
      
      <div className="vm-cards">
        <div className="vm-card reveal" style={{transitionDelay: '0.2s'}}>
          <div className="icon-wrapper">
            <Telescope size={28} />
          </div>
          <div className="subheading">VISION</div>
          <h3 className="heading-md" style={{marginBottom: '1.5rem'}}>
            A trusted, tech-enabled financial platform for India.
          </h3>
          <p className="text-muted" style={{lineHeight: '1.6'}}>
            To become the go-to platform that simplifies access to credit across
            India through technology and trust.
          </p>
        </div>
        
        <div className="vm-card reveal" style={{transitionDelay: '0.4s'}}>
          <div className="icon-wrapper">
            <Target size={28} />
          </div>
          <div className="subheading">MISSION</div>
          <h3 className="heading-md" style={{marginBottom: '1.5rem'}}>
            Efficient, transparent and technology-driven lending.
          </h3>
          <p className="text-muted" style={{lineHeight: '1.6'}}>
            Delivering efficient, transparent and technology-driven lending
            solutions through innovation, partnerships and customer-focused
            services.
          </p>
        </div>
      </div>
    </section>
  );
}
