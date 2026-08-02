import React from 'react';
import '../PlatformStyles.css';
import { 
  UserCheck, 
  FileText, 
  Edit3, 
  TrendingUp, 
  Bell, 
  Car, 
  FileBox, 
  User, 
  Briefcase, 
  PieChart, 
  CheckCircle,
  FileSignature
} from 'lucide-react';

export default function PlatformExperiences() {
  return (
    <section id="platform" className="platform-section container bg-grid">
      <div className="reveal">
        <div className="subheading">DIGITAL LENDING PLATFORM</div>
        <h2 className="heading-lg">
          One platform.<br/>
          <span className="text-primary">Three purpose-built<br/>experiences.</span>
        </h2>
        <p className="text-muted" style={{marginTop: '1.5rem', maxWidth: '600px', lineHeight: '1.6'}}>
          A modern, API-first stack connecting customers, dealers and internal teams —
          with digital KYC, eSign, bank statement analysis and real-time tracking.
        </p>
      </div>

      <div className="platform-cards">
        <div className="platform-card reveal" style={{transitionDelay: '0.2s'}}>
          <div className="subheading" style={{fontSize: '0.65rem'}}>CONSUMER</div>
          
          <div className="phone-mockup" style={{margin: '2rem 0', transform: 'scale(0.9)', transformOrigin: 'top center'}}>
            <div className="phone-notch"></div>
            <div className="phone-screen bg-blue">
              <div className="app-header">
                <div className="status-bar">
                  <span>9:41</span>
                  <div className="status-icons">
                    <span className="icon-signal"></span>
                    <span className="icon-wifi"></span>
                    <span className="icon-battery"></span>
                  </div>
                </div>
                <div className="app-user-greeting">
                  <div className="user-avatar"><Car size={20} /></div>
                  <div>
                    <div className="greeting-text">Hi, Tarun</div>
                    <div className="greeting-sub">Welcome Back!</div>
                  </div>
                </div>
              </div>
              <div className="app-body" style={{ textAlign: 'left' }}>
                <div className="app-section-title">— YOUR LOAN JOURNEY —</div>
                <div className="app-action-grid">
                  <div className="app-action-btn">
                    <FileBox size={24} color="var(--color-secondary)" />
                    <span>Apply Loan</span>
                  </div>
                  <div className="app-action-btn">
                    <Briefcase size={24} color="var(--color-secondary)" />
                    <span>My Loans</span>
                  </div>
                </div>
                <div className="app-list-section">
                  <div className="app-list-title">SERVICES</div>
                  <div className="app-list-item">
                    <div className="app-list-icon"><UserCheck size={16} /></div>
                    <div className="app-list-content">
                      <div className="app-list-item-title">KYC & Verification</div>
                      <div className="app-list-item-sub">Complete KYC</div>
                    </div>
                  </div>
                  <div className="app-list-item">
                    <div className="app-list-icon"><FileText size={16} /></div>
                    <div className="app-list-content">
                      <div className="app-list-item-title">Bank Statement Analysis</div>
                      <div className="app-list-item-sub">View Analysis</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <h3>Customer App</h3>
          <p className="text-muted" style={{marginTop: '0.5rem'}}>Easy loan apply & tracking with digital KYC.</p>
        </div>

        <div className="platform-card reveal" style={{transitionDelay: '0.4s'}}>
          <div className="subheading" style={{fontSize: '0.65rem'}}>PARTNER</div>
          
          <div className="phone-mockup" style={{margin: '2rem 0', transform: 'scale(0.9)', transformOrigin: 'top center'}}>
            <div className="phone-notch"></div>
            <div className="phone-screen bg-blue">
              <div className="app-header">
                <div className="status-bar">
                  <span>9:41</span>
                  <div className="status-icons">
                    <span className="icon-signal"></span>
                    <span className="icon-wifi"></span>
                    <span className="icon-battery"></span>
                  </div>
                </div>
                <div className="app-navbar">
                  <div className="nav-menu-icon">≡</div>
                  <div className="nav-title">DEALER / PARTNER PANEL</div>
                  <div className="nav-bell-icon"><Bell size={16} /></div>
                </div>
              </div>
              <div className="app-body" style={{ textAlign: 'left' }}>
                <div className="app-stat-card">
                  <div className="stat-icon"><User size={20} /></div>
                  <div className="stat-info">
                    <div className="stat-title">Leads Management</div>
                    <div className="stat-sub">Total Leads <span>128</span></div>
                  </div>
                </div>
                <div className="app-stat-card">
                  <div className="stat-icon"><FileBox size={20} /></div>
                  <div className="stat-info">
                    <div className="stat-title">Applications Received</div>
                    <div className="stat-sub">New Applications <span>56</span></div>
                  </div>
                </div>
                <div className="app-stat-card">
                  <div className="stat-icon"><TrendingUp size={20} /></div>
                  <div className="stat-info">
                    <div className="stat-title">Applications in Process</div>
                    <div className="stat-sub">In Process <span>24</span></div>
                  </div>
                </div>
                <div className="app-stat-card">
                  <div className="stat-icon"><CheckCircle size={20} /></div>
                  <div className="stat-info">
                    <div className="stat-title">Approved Applications</div>
                    <div className="stat-sub">Total Approved <span>18</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <h3>Dealer / Partner Panel</h3>
          <p className="text-muted" style={{marginTop: '0.5rem'}}>Manage leads, applications & earnings.</p>
        </div>

        <div className="platform-card reveal" style={{transitionDelay: '0.6s'}}>
          <div className="subheading" style={{fontSize: '0.65rem'}}>OPS</div>
          
          <div className="phone-mockup" style={{margin: '2rem 0', transform: 'scale(0.9)', transformOrigin: 'top center'}}>
            <div className="phone-notch"></div>
            <div className="phone-screen bg-blue">
              <div className="app-header">
                <div className="status-bar">
                  <span>9:41</span>
                  <div className="status-icons">
                    <span className="icon-signal"></span>
                    <span className="icon-wifi"></span>
                    <span className="icon-battery"></span>
                  </div>
                </div>
                <div className="app-navbar">
                  <div className="nav-menu-icon">≡</div>
                  <div className="nav-title">EMPLOYEE DASHBOARD</div>
                  <div className="nav-bell-icon"><Bell size={16} /></div>
                </div>
              </div>
              <div className="app-body" style={{ textAlign: 'left' }}>
                <div className="app-action-grid">
                  <div className="app-action-btn bg-dark-blue text-white">
                    <Briefcase size={24} />
                    <span>Operations</span>
                  </div>
                  <div className="app-action-btn bg-dark-blue text-white">
                    <CheckCircle size={24} />
                    <span>Approvals</span>
                  </div>
                </div>
                <div className="app-list-section">
                  <div className="app-list-title">OVERVIEW</div>
                  <div className="app-stat-row">
                    <span>Total Applications</span>
                    <strong>342</strong>
                  </div>
                  <div className="app-stat-row">
                    <span>Disbursed Loans</span>
                    <strong>186</strong>
                  </div>
                  <div className="app-button-row">
                    <button className="app-btn-outline"><PieChart size={14} /> View Reports</button>
                    <button className="app-btn-outline"><TrendingUp size={14} /> Performance</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <h3>Employee & Admin Panel</h3>
          <p className="text-muted" style={{marginTop: '0.5rem'}}>Operations, approvals & monitoring.</p>
        </div>
      </div>
      
    </section>
  );
}
