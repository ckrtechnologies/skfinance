import React, { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import styles from './Settings.module.css';

const Settings = () => {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get('/settings');
        setSettings(res.data?.settings || {});
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (e) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...settings,
        commission_flat_rate: Number(settings.commission_flat_rate),
        blocked_days_limit: Number(settings.blocked_days_limit)
      };
      await apiClient.patch('/settings', payload);
      alert('Settings updated successfully');
    } catch (err) {
      alert(err.message || 'Failed to update settings');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>System Settings</h1>
          <p className={styles.subtitle}>Configure global platform parameters</p>
        </div>
      </div>

      <div className={styles.card}>
        <form onSubmit={handleSave}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Commission Flat Rate (₹)</label>
            <input 
              name="commission_flat_rate" 
              type="number" 
              className={styles.input} 
              value={settings.commission_flat_rate || 0} 
              onChange={handleChange}
            />
            <div className={styles.helpText}>Flat commission earned by dealers on every successfully disbursed loan.</div>
          </div>
          
          <div className={styles.formGroup}>
            <label className={styles.label}>Blocked Days Limit</label>
            <input 
              name="blocked_days_limit" 
              type="number" 
              className={styles.input} 
              value={settings.blocked_days_limit || 90} 
              onChange={handleChange}
            />
            <div className={styles.helpText}>Applications pending beyond these many days are marked as BLOCKED_90D.</div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Allowed Pincodes (JSON)</label>
            <textarea 
              name="allowed_pincodes" 
              className={styles.input} 
              style={{ minHeight: '100px', resize: 'vertical' }}
              value={JSON.stringify(settings.allowed_pincodes || [])}
              readOnly
            />
            <div className={styles.helpText}>Modify this array via backend script to restrict application geography.</div>
          </div>

          <button type="submit" className={styles.btnPrimary}>Save Changes</button>
        </form>
      </div>
    </div>
  );
};

export default Settings;
