import React, { useState } from 'react';
import { Phone, Mail, Globe, MapPin, Building, ArrowRight, Loader2, CheckCircle } from 'lucide-react';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    message: ''
  });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: '', message: '' });

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      const response = await fetch(`${apiUrl}/api/lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        setStatus({ type: 'success', message: 'Thank you! Your enquiry has been sent.' });
        setFormData({ name: '', email: '', phone: '', city: '', message: '' });
      } else {
        setStatus({ type: 'error', message: data.error || 'Failed to send enquiry.' });
      }
    } catch (error) {
      setStatus({ type: 'error', message: 'Network error. Please try again later.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <section id="contact" className="contact-section container">
      <div className="contact-grid">
        <div className="reveal">
          <div className="subheading">GET IN TOUCH</div>
          <h2 className="heading-lg">
            Let's talk about<br/>
            <span className="text-primary">growing together.</span>
          </h2>
          
          <div className="contact-info" style={{marginTop: '3rem'}}>
            <div className="contact-item">
              <div className="contact-icon"><Phone size={24} /></div>
              <div>
                <div style={{fontSize: '0.75rem', color: 'var(--text-light-secondary)', fontWeight: 600, letterSpacing: '0.1em'}}>CALL / WHATSAPP</div>
                <div style={{marginTop: '0.25rem'}}>
                  <a href="https://wa.me/916388882644" target="_blank" rel="noopener noreferrer" style={{fontWeight: 700, textDecoration: 'none', color: 'inherit'}}>+91 63888 82644</a>
                </div>
              </div>
            </div>
            
            <div className="contact-item">
              <div className="contact-icon"><Mail size={24} /></div>
              <div>
                <div style={{fontSize: '0.75rem', color: 'var(--text-light-secondary)', fontWeight: 600, letterSpacing: '0.1em'}}>EMAIL</div>
                <div style={{marginTop: '0.25rem'}}>
                  <a href="mailto:shiv@shreejafinance.online" style={{fontWeight: 700, textDecoration: 'none', color: 'inherit'}}>shiv@shreejafinance.online</a>
                </div>
              </div>
            </div>
            
            <div className="contact-item">
              <div className="contact-icon"><Globe size={24} /></div>
              <div>
                <div style={{fontSize: '0.75rem', color: 'var(--text-light-secondary)', fontWeight: 600, letterSpacing: '0.1em'}}>WEBSITE</div>
                <div style={{fontWeight: 700, marginTop: '0.25rem'}}>www.shreejafinance.online</div>
              </div>
            </div>
            
            <div className="contact-item">
              <div className="contact-icon"><MapPin size={24} /></div>
              <div>
                <div style={{fontSize: '0.75rem', color: 'var(--text-light-secondary)', fontWeight: 600, letterSpacing: '0.1em'}}>REGISTERED OFFICE</div>
                <div style={{fontWeight: 700, marginTop: '0.25rem'}}>Baboo Ram, Subhas Nagar,<br/>Barabanki City, Uttar Pradesh - 225001</div>
              </div>
            </div>

            <div className="contact-item">
              <div className="contact-icon"><Building size={24} /></div>
              <div>
                <div style={{fontSize: '0.75rem', color: 'var(--text-light-secondary)', fontWeight: 600, letterSpacing: '0.1em'}}>BRANCH OFFICE</div>
                <div style={{fontWeight: 700, marginTop: '0.25rem'}}>Badel Road, Jaya Nagar,<br/>Near Darbari Samosa Hotel,<br/>Nawabganj, Barabanki,<br/>Uttar Pradesh - 225001</div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="reveal" style={{transitionDelay: '0.2s'}}>
          <div className="contact-form">
            <div className="subheading" style={{color: 'var(--text-dark-secondary)'}}>PARTNER ENQUIRY</div>
            <h3 style={{fontSize: '2rem', fontWeight: 700, marginBottom: '2.5rem'}}>Start your partnership</h3>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>FULL NAME *</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} required className="form-control" placeholder="John Doe" />
              </div>
              <div className="form-group">
                <label>EMAIL</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} className="form-control" placeholder="you@company.com" />
              </div>
              <div className="form-group">
                <label>PHONE *</label>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required className="form-control" placeholder="+91" />
              </div>
              <div className="form-group">
                <label>CITY / LOCATION</label>
                <input type="text" name="city" value={formData.city} onChange={handleChange} className="form-control" placeholder="City" />
              </div>
              <div className="form-group">
                <label>MESSAGE</label>
                <textarea name="message" value={formData.message} onChange={handleChange} className="form-control" placeholder="Tell us about your business"></textarea>
              </div>
              
              {status.message && (
                <div style={{
                  padding: '1rem',
                  marginTop: '1rem',
                  borderRadius: '0.5rem',
                  background: status.type === 'success' ? 'rgba(74, 222, 128, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  color: status.type === 'success' ? '#4ADE80' : '#EF4444',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  {status.type === 'success' && <CheckCircle size={20} />}
                  {status.message}
                </div>
              )}

              <button disabled={isSubmitting} className="btn btn-primary" style={{width: '100%', padding: '1rem', marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '0.5rem'}}>
                {isSubmitting ? (
                  <><Loader2 className="animate-spin" size={20} /> Submitting...</>
                ) : (
                  <>Submit enquiry <ArrowRight size={20} /></>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
