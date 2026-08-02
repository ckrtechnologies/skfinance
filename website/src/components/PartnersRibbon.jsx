import React from 'react';

export default function PartnersRibbon() {
  const partners = ['SBI', 'AXIS BANK', 'KOTAK', 'IDFC FIRST', 'SK FINANCE', 'IIFL', 'BAJAJ FINSERV'];
  
  return (
    <div className="partners-ribbon">
      <div className="partners-title">54+ BANK & NBFC PARTNERS</div>
      <div className="partners-marquee">
        <div className="partners-scroll">
          {[...partners, ...partners].map((partner, index) => (
            <div key={index} className="partner-logo">
              {partner}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
