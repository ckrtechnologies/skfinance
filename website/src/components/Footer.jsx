import React from 'react';
export default function Footer() {
  return (
    <footer className="footer bg-grid">
      <div className="container">
        <div className="footer-grid">
          <div>
            <a href="/" className="logo-container" style={{marginBottom: '1.5rem', display: 'inline-flex'}}>
              <img src="/logo.png" alt="Shreeja Finance Logo" style={{ width: '220px', height: '50px', objectFit: 'fill' }} />
            </a>
            <p className="text-muted" style={{maxWidth: '300px', lineHeight: '1.6'}}>
              Shreeja Finance Private Limited — Driving Financial Growth Through Technology.
              Your trusted digital lending & financial services partner.
            </p>
          </div>
          
          <div>
            <h4 style={{marginBottom: '1.5rem', fontSize: '0.875rem', letterSpacing: '0.1em'}}>COMPANY</h4>
            <div className="footer-links">
              <a href="#about" className="footer-link">About</a>
              <a href="#products" className="footer-link">Products</a>
              <a href="#platform" className="footer-link">Platform</a>
              <a href="#partner" className="footer-link">Partner</a>
              <a href="#team" className="footer-link">Team</a>
              <a href="#contact" className="footer-link">Contact</a>
            </div>
          </div>
          
          <div>
            <h4 style={{marginBottom: '1.5rem', fontSize: '0.875rem', letterSpacing: '0.1em'}}>CREDENTIALS</h4>
            <div className="footer-links">
              <span className="footer-link" style={{pointerEvents: 'none'}}>CIN: U64990UP2026PTC244922</span>
              <span className="footer-link" style={{pointerEvents: 'none'}}>GSTIN: 09ABSCS9519G1ZK</span>
              <span className="footer-link" style={{pointerEvents: 'none'}}>Incorporated: 28 Feb 2026</span>
            </div>
          </div>
          
          <div>
            <h4 style={{marginBottom: '1.5rem', fontSize: '0.875rem', letterSpacing: '0.1em'}}>SOCIAL</h4>
            <div className="footer-links">
              <a href="https://www.facebook.com/share/1HSVsxTACj/" target="_blank" rel="noopener noreferrer" className="footer-link" style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                </svg>
                Facebook
              </a>
              <a href="https://www.instagram.com/shreeja_finance_pvt_ltd" target="_blank" rel="noopener noreferrer" className="footer-link" style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
                Instagram
              </a>
            </div>
          </div>
        </div>
        
        <div className="footer-bottom">
          <div>© 2026 Shreeja Finance Private Limited. All rights reserved.</div>
          <div>Barabanki, Uttar Pradesh · India</div>
        </div>
      </div>
    </footer>
  );
}
