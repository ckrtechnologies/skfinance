import React, { useState, useEffect } from 'react';
import { ArrowRight, Menu, X } from 'lucide-react';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <a href="/" className="logo-container" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
        <img src="/logo.png" alt="Shreeja Finance Logo" style={{ height: '40px', width: 'auto', objectFit: 'contain' }} />
        <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-dark-primary)' }}>Shreeja Finance</span>
      </a>
      
      <div className="nav-links">
        <a href="#about" className="nav-link">About</a>
        <a href="#products" className="nav-link">Products</a>
        <a href="#platform" className="nav-link">Platform</a>
        <a href="#partner" className="nav-link">Partner</a>
        <a href="#team" className="nav-link">Team</a>
        <a href="#contact" className="nav-link">Contact</a>
      </div>

      <a href="#partner" className="btn btn-primary nav-cta" style={{ textDecoration: 'none' }}>
        Become a Partner <ArrowRight size={16} />
      </a>
      
      <button 
        className="mobile-menu-btn" 
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'none' }}
      >
        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {mobileMenuOpen && (
        <div className="mobile-menu">
          <a href="#about" className="nav-link" onClick={() => setMobileMenuOpen(false)}>About</a>
          <a href="#products" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Products</a>
          <a href="#platform" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Platform</a>
          <a href="#partner" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Partner</a>
          <a href="#team" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Team</a>
          <a href="#contact" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Contact</a>
          <a href="#partner" className="btn btn-primary" style={{ textDecoration: 'none', width: '100%', justifyContent: 'center' }} onClick={() => setMobileMenuOpen(false)}>
            Become a Partner <ArrowRight size={16} />
          </a>
        </div>
      )}
    </nav>
  );
}
