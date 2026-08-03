import React from 'react';
import { useSelector } from 'react-redux';
import GlobalDatePicker from './GlobalDatePicker';
import styles from './Header.module.css';

const Header = ({ title, subtitle }) => {
  const { profile } = useSelector((state) => state.auth);

  return (
    <header className={styles.header}>
      <div className={styles.leftSection}>
        {title && <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>{title}</h1>}
        {subtitle && <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0.25rem 0 0 0', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>{subtitle}</p>}
      </div>

      <div className={styles.rightSection}>
        <GlobalDatePicker />
        <div className={styles.profileInfo}>
          <div className={styles.avatar}>
            {profile?.full_name?.charAt(0) || 'A'}
          </div>
          <div>
            <div className={styles.userName}>{profile?.full_name || 'Admin User'}</div>
            <div className={styles.userRole}>Administrator</div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
