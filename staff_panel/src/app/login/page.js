'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${BASE_URL}/staff-panel/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Invalid login credentials');
      }

      // Store token
      localStorage.setItem('token', data.data.token);
      router.push('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100dvh', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
      <div className="card" style={{ width: 400, maxWidth: '90%', padding: '40px 32px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))', color: '#fff', fontSize: 22, fontWeight: 800, marginBottom: 16 }}>S</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text)' }}>Staff Login</h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-3)', marginTop: 4 }}>Sign in to SK Finance staff portal</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {error && <div style={{ background: 'var(--color-rose-bg)', color: 'var(--color-rose)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>{error}</div>}
          
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Email Address</label>
            <input 
              type="email" 
              className="input" 
              placeholder="admin@skfinance.local"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Password</label>
            <input 
              type="password" 
              className="input" 
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px 0', marginTop: 8 }} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
