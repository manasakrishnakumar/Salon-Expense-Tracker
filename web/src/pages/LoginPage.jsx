import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { account } from '../lib/appwrite';

export default function LoginPage() {
  const { login, register, logout, sendRecovery, confirmRecovery } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot' | 'reset'
  const [loginRole, setLoginRole] = useState('admin');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [resetForm, setResetForm] = useState({ newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [recoveryParams, setRecoveryParams] = useState(null);

  const [magicLoading, setMagicLoading] = useState(false);

  // Check URL for recovery redirect from Appwrite email link
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // Handle worker magic URL invite link (?magic=1&userId=xxx&secret=xxx)
    if (params.get('magic') === '1') {
      const userId = params.get('userId');
      const secret = params.get('secret');
      if (userId && secret) {
        setMagicLoading(true);
        account.updateMagicURLSession(userId, secret)
          .then(() => {
            // Clean up URL and reload so AuthContext picks up the session
            window.history.replaceState({}, '', window.location.pathname);
            window.location.reload();
          })
          .catch(err => {
            setMagicLoading(false);
            setError('The invite link has expired or is invalid. Please ask your admin to send a new invite.');
            console.error('[magic-login]', err.message);
          });
      }
      return;
    }

    // Handle password recovery redirect
    if (params.get('recovery') === 'true') {
      const userId = params.get('userId');
      const secret = params.get('secret');
      if (userId && secret) {
        setRecoveryParams({ userId, secret });
        setMode('reset');
      }
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (mode === 'forgot') {
      const result = await sendRecovery(form.email);
      setLoading(false);
      if (result.success) {
        setSuccess('✅ Recovery email sent! Check your inbox and click the link to reset your password.');
      } else {
        setError(result.error || 'Failed to send recovery email.');
      }
      return;
    }

    if (mode === 'reset') {
      if (resetForm.newPassword !== resetForm.confirmPassword) {
        setError('Passwords do not match.');
        setLoading(false);
        return;
      }
      if (resetForm.newPassword.length < 8) {
        setError('Password must be at least 8 characters.');
        setLoading(false);
        return;
      }
      const result = await confirmRecovery(recoveryParams.userId, recoveryParams.secret, resetForm.newPassword);
      setLoading(false);
      if (result.success) {
        // Clear URL params and go to login
        window.history.replaceState({}, '', window.location.pathname);
        setMode('login');
        setSuccess('✅ Password reset successfully! Please sign in with your new password.');
      } else {
        setError(result.error || 'Failed to reset password. The link may have expired.');
      }
      return;
    }

    let result;
    if (mode === 'login') {
      result = await login(form.email, form.password);
      if (result.success) {
        const userRole = result.user?.role;
        if (loginRole === 'admin' && userRole === 'worker') {
          await logout();
          setError('This account is a Worker. Please use the Worker Login tab.');
          setLoading(false);
          return;
        }
        if (loginRole === 'worker' && userRole !== 'worker') {
          await logout();
          setError('This account is an Admin. Please use the Admin Login tab.');
          setLoading(false);
          return;
        }
      }
    } else {
      if (!form.name) { setError('Name is required.'); setLoading(false); return; }
      result = await register(form.email, form.password, form.name);
    }

    setLoading(false);
    if (!result.success) setError(result.error || 'Something went wrong.');
  };

  const tabStyle = (active) => ({
    flex: 1, padding: '8px 12px', borderRadius: 6, border: 'none',
    background: active ? 'linear-gradient(135deg, #8B5CF6, #EC4899)' : 'transparent',
    color: active ? 'white' : 'var(--text-muted)',
    fontWeight: 600, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s ease',
  });

  return (
    <div className="login-page">
      <div className="login-blob" style={{ width: 400, height: 400, background: 'var(--primary)', top: -150, left: -100 }} />
      <div className="login-blob" style={{ width: 300, height: 300, background: 'var(--secondary)', bottom: -80, right: -60 }} />

      {/* Magic link loading screen — shown when worker clicks invite link */}
      {magicLoading && (
        <div className="login-card animate-slideUp" style={{ textAlign: 'center', padding: '48px 32px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
          <h2 style={{ color: 'var(--text)', marginBottom: 8 }}>Logging you in...</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Verifying your invite link, please wait.</p>
          <div className="spinner" style={{ margin: '0 auto' }} />
          {error && <div className="login-error" style={{ marginTop: 24 }}>{error}</div>}
        </div>
      )}

      {!magicLoading && <div className="login-card animate-slideUp">
        <div className="login-logo">
          <div className="login-logo-icon">💇</div>
          <h1 className="login-title">Salon Pro</h1>
          <p className="login-subtitle">
            {mode === 'login' ? (loginRole === 'admin' ? 'Admin Sign In' : 'Worker Sign In')
              : mode === 'register' ? 'Create your account'
              : mode === 'forgot' ? 'Reset your password'
              : 'Set new password'}
          </p>
        </div>

        {mode === 'login' && (
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', padding: 4, borderRadius: 8, marginBottom: 20, border: '1px solid rgba(255,255,255,0.08)' }}>
            <button type="button" onClick={() => { setLoginRole('admin'); setError(''); }} style={tabStyle(loginRole === 'admin')}>💼 Admin</button>
            <button type="button" onClick={() => { setLoginRole('worker'); setError(''); }} style={tabStyle(loginRole === 'worker')}>💇 Worker</button>
          </div>
        )}

        {success && <div className="login-error" style={{ background: 'rgba(16,185,129,0.12)', borderColor: '#10B981', color: '#10B981', marginBottom: 16 }}>{success}</div>}
        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <div className="form-input-icon">
                <span className="form-input-icon-inner">👤</span>
                <input className="form-input" placeholder="Your name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
            </div>
          )}

          {(mode === 'login' || mode === 'register' || mode === 'forgot') && (
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="form-input-icon">
                <span className="form-input-icon-inner">✉️</span>
                <input className="form-input" type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
              </div>
            </div>
          )}

          {(mode === 'login' || mode === 'register') && (
            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="form-input-icon">
                <span className="form-input-icon-inner">🔒</span>
                <input className="form-input" type="password" placeholder="Your password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={8} />
              </div>
            </div>
          )}

          {mode === 'reset' && (
            <>
              <div className="form-group">
                <label className="form-label">New Password (min 8 chars)</label>
                <input className="form-input" type="password" value={resetForm.newPassword} onChange={e => setResetForm({ ...resetForm, newPassword: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input className="form-input" type="password" value={resetForm.confirmPassword} onChange={e => setResetForm({ ...resetForm, confirmPassword: e.target.value })} required />
              </div>
            </>
          )}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Please wait...'
              : mode === 'login' ? '→ Sign In'
              : mode === 'register' ? '→ Create Account'
              : mode === 'forgot' ? '📧 Send Recovery Email'
              : '🔑 Set New Password'}
          </button>
        </form>

        <div className="login-toggle">
          {mode === 'login' ? (
            <>
              {loginRole === 'admin' ? (
                <>Don't have an account? <a onClick={() => { setMode('register'); setError(''); setSuccess(''); }}>Register</a><br /></>
              ) : (
                <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
                  Workers are invited by the salon admin.
                </span>
              )}
              <a onClick={() => { setMode('forgot'); setError(''); setSuccess(''); }} style={{ fontSize: 13 }}>Forgot password?</a>
            </>
          ) : mode === 'forgot' ? (
            <a onClick={() => { setMode('login'); setError(''); setSuccess(''); }}>← Back to Sign In</a>
          ) : mode === 'reset' ? null : (
            <>Already have an account? <a onClick={() => { setMode('login'); setError(''); setSuccess(''); }}>Sign In</a></>
          )}
        </div>
      </div>}
    </div>
  );
}
