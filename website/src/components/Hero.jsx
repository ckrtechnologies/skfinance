import React from 'react';
import { ArrowRight } from 'lucide-react';

export default function Hero() {
  return (
    <section className="hero bg-grid">
      <div className="container">
        <div className="hero-content">
          <div className="hero-text reveal">
            <div className="subheading">TRUST · RELIABILITY · CREDIBILITY</div>
            <h1 className="heading-xl">
              Driving<br/>
              Financial<br/>
              Growth Through<br/>
              <span className="text-primary" style={{textDecoration: 'underline', textDecorationThickness: '6px', textUnderlineOffset: '8px'}}>Technology</span>
            </h1>
            
            <p className="hero-desc">
              Shreeja Finance Private Limited is India's technology-driven
              lending distribution partner — connecting dealers, banks
              and customers through one seamless digital journey.
            </p>
            
            <div className="hero-buttons">
              <a href="#partner" className="btn btn-primary" style={{ textDecoration: 'none' }}>
                Become a Loan Partner <ArrowRight size={16} />
              </a>
              <a href="#products" className="btn btn-outline" style={{ textDecoration: 'none' }}>
                Explore Products
              </a>
            </div>
            
            <div className="hero-stats">
              <div className="stat-item">
                <span className="stat-value">54+</span>
                <span className="stat-label">BANK TIE-UPS</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">100%</span>
                <span className="stat-label">DIGITAL PROCESS</span>
              </div>
              <div className="stat-item">
                <span className="stat-value text-primary">24/7</span>
                <span className="stat-label">PARTNER SUPPORT</span>
              </div>
            </div>
          </div>
          
          <div className="hero-image-wrapper reveal" style={{transitionDelay: '0.2s'}}>
            <img src="/hero_car_handover_indian.png" alt="Car Buyer Handover" className="hero-image" style={{ objectFit: 'cover' }} />
            <div className="floating-card" style={{top: '1rem', left: '1rem', background: 'rgba(0, 0, 0, 0.6)'}}>
              <div className="icon-wrapper" style={{background: 'var(--color-primary)', color: '#000', padding: '0.5rem', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'}}>₹</div>
              <div>
                <div style={{fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)'}}>Disbursed</div>
                <div style={{fontWeight: '700', color: '#FFF'}}>₹250.4 Cr</div>
              </div>
            </div>
            <div className="floating-card" style={{bottom: '2rem', right: '2rem', background: 'rgba(0, 0, 0, 0.6)'}}>
              <div>
                <div style={{fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase'}}>Approvals</div>
                <div style={{fontWeight: '700', fontSize: '1.5rem', color: '#FFF'}}>850 <span style={{color: '#4ADE80', fontSize: '0.875rem'}}>+18.7%</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
