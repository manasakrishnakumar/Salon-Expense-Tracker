import React from 'react';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: '🏠', ownerOnly: true },
  { id: 'services', label: 'Services', icon: '✂️' },
  { id: 'stock', label: 'Inventory', icon: '📦', ownerOnly: true },
  { id: 'workers', label: 'Workers', icon: '👥', ownerOnly: true },
  { id: 'analysis', label: 'Analysis', icon: '📊', ownerOnly: true },
];

export default function Sidebar({ activePage, onNavigate }) {
  const { user, logout } = useAuth();

  const initial = user?.name ? user.name[0].toUpperCase() : 'U';
  // A worker only ever sees the page they're actually allowed to use
  // (recording their own services) — everything else is owner-only, and
  // hidden here to match what the backend actually enforces.
  const navItems = NAV_ITEMS.filter(item => !item.ownerOnly || user?.role === 'owner');

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
              <div className="user-name">{user?.name || 'Owner'}</div>
              <div className="user-email">{user?.email || ''}</div>
            </div>
          </div>

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
        </div>
      </nav>
    </>
  );
}
