import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import styles from './AdminLayout.module.css';

const AdminLayout = () => {
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [pageMeta, setPageMeta] = useState({ title: '', subtitle: '' });

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className={styles.layout}>
      <Sidebar />
      <div className={styles.mainContent}>
        <Header title={pageMeta.title} subtitle={pageMeta.subtitle} />
        <main className={styles.pageContainer}>
          <Outlet context={{ setPageMeta }} />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
