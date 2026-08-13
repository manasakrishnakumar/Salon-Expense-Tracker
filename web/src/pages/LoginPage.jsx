import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, register, logout } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [loginRole, setLoginRole] = useState('admin'); // 'admin' | 'worker'
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    let result;
    if (mode === 'login') {
      result = await login(form.email, form.password);
      if (result.success) {
        const userRole = result.user?.role;
        if (loginRole === 'admin' && userRole === 'worker') {
          await logout();
          setError('This account is registered as a Worker. Please use the Worker Login tab.');
          setLoading(false);
          return;
        }
        if (loginRole === 'worker' && userRole !== 'worker') {
          await logout();
          setError('This account is registered as an Admin. Please use the Admin Login tab.');
          setLoading(false);
          return;
        }
      }
    } else {
      if (!form.name) { setError('Name is required.'); setLoading(false); return; }
      result = await register(form.email, form.password, form.name);
    }

    setLoading(false);
    if (!result.success) {
      setError(result.error || 'Something went wrong. Please try again.');
    }
  };

  return (
    <div className="login-page">
      {/* Decorative blobs */}
      <div className="login-blob" style={{ width: 400, height: 400, background: 'var(--primary)', top: -150, left: -100 }} />
      <div className="login-blob" style={{ width: 300, height: 300, background: 'var(--secondary)', bottom: -80, right: -60 }} />

      <div className="login-card animate-slideUp">
        <div className="login-logo">
          <div className="login-logo-icon">💇</div>
          <h1 className="login-title">Salon Pro</h1>
          <p className="login-subtitle">
            {mode === 'login'
              ? (loginRole === 'admin' ? 'Admin Sign In' : 'Worker Sign In')
              : 'Create your account'
            }
          </p>
        </div>

        {mode === 'login' && (
          <div className="login-tabs" style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.05)',
            padding: 4,
            borderRadius: 8,
            marginBottom: 20,
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            <button
              type="button"
              onClick={() => { setLoginRole('admin'); setError(''); }}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 6,
                border: 'none',
                background: loginRole === 'admin' ? 'linear-gradient(135deg, #8B5CF6, #EC4899)' : 'transparent',
                color: loginRole === 'admin' ? 'white' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              💼 Admin
            </button>
            <button
              type="button"
              onClick={() => { setLoginRole('worker'); setError(''); }}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 6,
                border: 'none',
                background: loginRole === 'worker' ? 'linear-gradient(135deg, #8B5CF6, #EC4899)' : 'transparent',
                color: loginRole === 'worker' ? 'white' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              💇 Worker
            </button>
          </div>
        )}

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <div className="form-input-icon">
                <span className="form-input-icon-inner">👤</span>
                <input
                  className="form-input"
                  placeholder="Your name"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div className="form-input-icon">
              <span className="form-input-icon-inner">✉️</span>
              <input
                className="form-input"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="form-input-icon">
              <span className="form-input-icon-inner">🔒</span>
              <input
                className="form-input"
                type="password"
                placeholder="Your password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
                minLength={8}
              />
            </div>
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading
              ? (mode === 'login' ? 'Signing in…' : 'Creating account…')
              : (mode === 'login' ? '→ Sign In' : '→ Create Account')
            }
          </button>
        </form>

        <div className="login-toggle">
          {mode === 'login' ? (
            loginRole === 'admin' ? (
              <>Don't have an account? <a onClick={() => { setMode('register'); setError(''); }}>Register</a></>
            ) : (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Workers must be invited by the salon administrator to get login credentials.
              </span>
            )
          ) : (
            <>Already have an account? <a onClick={() => { setMode('login'); setError(''); }}>Sign In</a></>
          )}
        </div>
      </div>
    </div>
  );
}
