import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
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
            {mode === 'login' ? 'Sign in to your workspace' : 'Create your account'}
          </p>
        </div>

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
            <>Don't have an account? <a onClick={() => { setMode('register'); setError(''); }}>Register</a></>
          ) : (
            <>Already have an account? <a onClick={() => { setMode('login'); setError(''); }}>Sign In</a></>
          )}
        </div>
      </div>
    </div>
  );
}
