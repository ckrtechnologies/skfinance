import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { logout } from '../store/slices/authSlice';
import { 
  LayoutDashboard, FileText, Users, Briefcase, 
  Settings, Landmark, ShieldAlert, BadgeIndianRupee, 
  LogOut, KeyRound 
} from 'lucide-react';
import styles from './Sidebar.module.css';

const navGroups = [
  {
    title: 'Main',
    items: [
      { path: '/', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/loans', label: 'Loan Files', icon: FileText },
    ]
  },
  {
    title: 'Network',
    items: [
      { path: '/lenders', label: 'Lenders & Policies', icon: Landmark },
      { path: '/dealers', label: 'Dealers', icon: Briefcase },
      { path: '/financials', label: 'Commissions & Payouts', icon: BadgeIndianRupee },
    ]
  },
  {
    title: 'System',
    items: [
      { path: '/staff', label: 'Staff', icon: Users },
      { path: '/settings', label: 'Settings', icon: Settings },
      { path: '/audit-log', label: 'Audit Log', icon: ShieldAlert },
    ]
  }
];

const Sidebar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logoArea}>
        <div className={styles.logoIcon}>🔵</div>
        <span className={styles.logoText}>Shreeja Finance</span>
      </div>
      
      <div className={styles.scrollArea}>
        {navGroups.map((group) => (
          <div key={group.title} className={styles.navGroup}>
            <div className={styles.groupTitle}>{group.title}</div>
            <nav className={styles.nav}>
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => 
                    `${styles.navLink} ${isActive ? styles.activeLink : ''}`
                  }
                >
                  <item.icon size={20} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        ))}
      </div>

      <div className={styles.bottomActions}>
        <button onClick={() => navigate('/change-password')} className={styles.actionButton}>
          <KeyRound size={20} />
          <span>Change Password</span>
        </button>
        <button onClick={handleLogout} className={`${styles.actionButton} ${styles.logoutButton}`}>
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
