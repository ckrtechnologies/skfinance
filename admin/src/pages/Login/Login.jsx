import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { loginSuccess } from '../../store/slices/authSlice';
import styles from './Login.module.css';

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const authUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/v1';
      const res = await apiClient.post('/auth/login', { identifier, password }, { baseURL: authUrl });
      const { profile: user, token } = res.data;

      if (user.role !== 'admin') {
        throw new Error('Access denied. Admin role required.');
      }

      dispatch(loginSuccess({ profile: user, token }));
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.leftPanel}>
        <div className={styles.leftContent}>
          <h2>Welcome back.</h2>
          <p>Access the Shreeja Finance admin portal to manage loans, policies, and payouts.</p>
          
          <div className={styles.graphicBox}>
            <div className={styles.circle1}></div>
            <div className={styles.circle2}></div>
            <div className={styles.glassCard}>
              <div className={styles.line}></div>
              <div className={styles.line}></div>
              <div className={styles.lineShort}></div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.rightPanel}>
        <div className={styles.card}>
          <div className={styles.logo}>
            SK <span>Finance</span>
          </div>
          <div className={styles.subtitle}>Admin Portal Access</div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Email Address</label>
              <input 
                type="text" 
                className={styles.input} 
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Password</label>
              <input 
                type="password" 
                className={styles.input} 
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <button type="submit" className={styles.button} disabled={loading}>
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>

            {error && <div className={styles.error}>{error}</div>}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
