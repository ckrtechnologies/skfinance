import React from 'react';
import { useSelector } from 'react-redux';
import GlobalDatePicker from './GlobalDatePicker';
import styles from './Header.module.css';

const Header = () => {
  const { profile } = useSelector((state) => state.auth);

  return (
    <header className={styles.header}>
      <div className={styles.leftSection}>
        {/* Placeholder for future left-side items like breadcrumbs or page title */}
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
