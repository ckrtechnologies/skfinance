import React from 'react';
import { Settings, Users, FileText, CheckCircle } from 'lucide-react';

export default function Features() {
  const features = [
    { icon: <Settings size={24} />, title: "Technology Driven" },
    { icon: <Users size={24} />, title: "Customer Centric" },
    { icon: <FileText size={24} />, title: "Transparent Processes" },
    { icon: <CheckCircle size={24} />, title: "Reliable Partnerships" },
  ];

  return (
    <section id="about" className="features-section container">
      <div className="features-grid">
        <div className="feature-image-wrapper reveal">
          <img src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80" alt="Modern Building" className="feature-image" />
          <div className="feature-badge">
            <span>INCORPORATED</span>
            <h4>Feb 2026</h4>
            <div style={{fontSize: '0.75rem', marginTop: '0.5rem', opacity: 0.8}}>Barabanki, Uttar Pradesh</div>
          </div>
        </div>
        
        <div className="reveal" style={{transitionDelay: '0.2s'}}>
          <div className="subheading">COMPANY OVERVIEW</div>
          <h2 className="heading-lg">
            A tech-first<br/>
            lending<br/>
            <span className="text-primary">distribution<br/>platform.</span>
          </h2>
          
          <p className="text-muted" style={{marginTop: '1.5rem', marginBottom: '2rem', lineHeight: '1.6'}}>
            Shreeja Finance Private Limited is focused on digital lending
            distribution, loan sourcing, customer acquisition and technology-
            enabled financial solutions — built to simplify access to credit
            across India.
          </p>
          
          <div className="feature-cards">
            {features.map((feature, index) => (
              <div key={index} className="feature-card reveal" style={{transitionDelay: `${0.3 + index * 0.1}s`}}>
                <div className="icon">{feature.icon}</div>
                <h4 style={{fontWeight: 600}}>{feature.title}</h4>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
