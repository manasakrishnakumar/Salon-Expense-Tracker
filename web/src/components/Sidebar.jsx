import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';

const NAV_ITEMS = [
  { id: 'dashboard',    label: 'Dashboard',   icon: '🏠', ownerOnly: true },
  { id: 'my-dashboard', label: 'My Dashboard', icon: '🏠', workerOnly: true },
  { id: 'services',    label: 'Services',     icon: '✂️' },
  { id: 'stock',       label: 'Inventory',    icon: '📦', ownerOnly: true },
  { id: 'workers',     label: 'Workers',      icon: '👥', ownerOnly: true },
  { id: 'customers',   label: 'Customers',    icon: '👤', ownerOnly: true },
  { id: 'analysis',    label: 'Analysis',     icon: '📊', ownerOnly: true },
];

export default function Sidebar({ activePage, onNavigate }) {
  const { user, logout, changePassword } = useAuth();
  const [showCP, setShowCP] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [cpError, setCpError] = useState('');
  const [cpSuccess, setCpSuccess] = useState(false);
  const [cpLoading, setCpLoading] = useState(false);

  const isOwner = user?.role === 'owner';
  const initial = user?.name ? user.name[0].toUpperCase() : 'U';
  const navItems = NAV_ITEMS.filter(item => {
    if (item.ownerOnly) return isOwner;
    if (item.workerOnly) return !isOwner;
    return true;
  });

  const handleCP = async (e) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) {
      setCpError('All fields are required.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setCpError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setCpError('Password must be at least 8 characters.');
      return;
    }
    setCpLoading(true);
    setCpError('');
    const res = await changePassword(newPassword, oldPassword);
    setCpLoading(false);
    if (res.success) {
      setCpSuccess(true);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setCpSuccess(false);
        setShowCP(false);
      }, 1500);
    } else {
      setCpError(res.error || 'Failed to update password.');
    }
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">💇</div>
          <span className="sidebar-logo-text">Salon Pro</span>
        </div>

        <div className="nav-section-label">Navigation</div>

        {navItems.map(item => (
          <button
            key={item.id}
            className={`nav-item ${activePage === item.id ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            <span className="nav-icon" style={{ fontSize: 18 }}>{item.icon}</span>
            {item.label}
          </button>
        ))}

        <div className="sidebar-footer">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Theme</span>
            <ThemeToggle />
          </div>

          <div className="user-chip">
            <div className="user-avatar">{initial}</div>
            <div className="user-info">
              <div className="user-name">{user?.name || 'User'}</div>
              <div className="user-email">{user?.email || ''}</div>
            </div>
          </div>

          <button
            className="btn btn-ghost btn-sm"
            style={{ width: '100%', justifyContent: 'center', marginBottom: 8, gap: 6 }}
            onClick={() => setShowCP(true)}
          >
            🔑 Change Password
          </button>

          <button
            className="btn btn-danger btn-sm"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={logout}
          >
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="mobile-nav">
        <div className="mobile-nav-inner">
          {navItems.map(item => (
            <button
              key={item.id}
              className={`mobile-nav-item ${activePage === item.id ? 'active' : ''}`}
              onClick={() => onNavigate(item.id)}
            >
              <div className="mobile-nav-icon">{item.icon}</div>
              <span>{item.label}</span>
            </button>
          ))}
          <button
            className="mobile-nav-item"
            onClick={() => setShowCP(true)}
            style={{ border: 'none', background: 'none' }}
          >
            <div className="mobile-nav-icon">🔑</div>
            <span>Password</span>
          </button>
        </div>
      </nav>

      {/* Change Password Modal */}
      {showCP && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !cpLoading && setShowCP(false)}>
          <div className="modal animate-slideUp" style={{ maxWidth: 400 }}>
            {cpSuccess ? (
              <div className="empty-state" style={{ padding: '24px' }}>
                <div style={{ fontSize: 56 }}>✅</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--success-light)' }}>Password Changed!</div>
                <div className="text-sm text-muted">Your new password is now active.</div>
              </div>
            ) : (
              <>
                <h2 className="modal-title">🔑 Change Password</h2>
                {cpError && <div className="login-error" style={{ marginBottom: 12 }}>{cpError}</div>}
                <form onSubmit={handleCP}>
                  <div className="form-group">
                    <label className="form-label">Current Password</label>
                    <input
                      type="password"
                      className="form-input"
                      value={oldPassword}
                      onChange={e => setOldPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">New Password (min 8 chars)</label>
                    <input
                      type="password"
                      className="form-input"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Confirm New Password</label>
                    <input
                      type="password"
                      className="form-input"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="modal-actions">
                    <button type="button" className="btn btn-ghost" onClick={() => setShowCP(false)} disabled={cpLoading}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={cpLoading}>
                      {cpLoading ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
