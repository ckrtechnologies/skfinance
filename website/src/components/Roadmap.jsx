import React from 'react';

export default function Roadmap() {
  const phases = [
    { phase: 'PHASE 01', title: 'Pan India Dealer & Partner Network', desc: 'Expand across metros & tier 2-3 cities.' },
    { phase: 'PHASE 02', title: 'Multi-NBFC & Bank Integrations', desc: 'Deepen 54+ integrations, add new lenders.' },
    { phase: 'PHASE 03', title: 'Digital Lending Marketplace', desc: 'Consumer-first marketplace for credit.' },
    { phase: 'PHASE 04', title: 'Technology Innovation & Automation', desc: 'AI-led underwriting & workflow automation.' },
    { phase: 'PHASE 05', title: 'Embedded Finance Solutions', desc: 'Credit inside partner platforms & apps.' },
    { phase: 'PHASE 06', title: 'Sustainable & Scalable Growth', desc: 'Long-term profitability and market leadership.' },
  ];

  return (
    <section className="roadmap-section container">
      <div className="reveal text-center">
        <div className="subheading" style={{justifyContent: 'center'}}>OUR GROWTH ROADMAP</div>
        <h2 className="heading-lg">
          Where we're headed<br/>
          <span className="text-primary">next.</span>
        </h2>
      </div>

      <div className="roadmap-timeline">
        {phases.map((item, index) => (
          <div key={index} className="roadmap-item reveal" style={{transitionDelay: `${0.1 * index}s`}}>
            <div className="roadmap-content">
              <div className="phase-label">{item.phase}</div>
              <h3 style={{fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem'}}>{item.title}</h3>
              <p className="text-muted" style={{fontSize: '0.875rem'}}>{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
