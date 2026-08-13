import React, { useState } from 'react';
import { useWorkers } from '../context/WorkersContext';
import { useServices } from '../context/ServicesContext';
import { apiPost } from '../lib/api';

function randomTempPassword() {
  // Not meant to be memorable — the owner hands it over once and the
  // worker is expected to change it after their first login.
  return Math.random().toString(36).slice(-6) + Math.floor(Math.random() * 90 + 10);
}

export default function WorkersPage() {
  const { workers, addWorker, deleteWorker, loading } = useWorkers();
  const { serviceRecords } = useServices();
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  const [invite, setInvite] = useState({ name: '', email: '', password: randomTempPassword() });
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteResult, setInviteResult] = useState(null);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    setError('');
    const result = await addWorker(newName.trim());
    setAdding(false);
    if (result.success) setNewName('');
    else setError(result.error || 'Failed to add worker.');
  };

  const handleDelete = async (id) => {
    await deleteWorker(id);
    setConfirmDelete(null);
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!invite.name.trim() || !invite.email.trim() || invite.password.length < 8) return;
    setInviting(true);
    setInviteError('');
    try {
      const result = await apiPost('/api/workers/invite', {
        name: invite.name.trim(),
        email: invite.email.trim(),
        password: invite.password,
      });
      setInviteResult(result);
      setInvite({ name: '', email: '', password: randomTempPassword() });
    } catch (err) {
      setInviteError(err.message || 'Failed to invite worker.');
    } finally {
      setInviting(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  const workerStats = workers.map(w => {
    const records = serviceRecords.filter(r => r.WorkerName === w.name);
    const totalRevenue = records.reduce((sum, r) => sum + (r.totalPrice || 0), 0);
    const totalServices = records.length;
    const todayServices = records.filter(r => r.Date && r.Date.startsWith(today)).length;
    return Object.assign({}, w, { totalRevenue, totalServices, todayServices });
  }).sort((a, b) => b.totalRevenue - a.totalRevenue);

  const topWorker = workerStats[0];

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Workers</h1>
            <p className="page-subtitle">Manage your salon team and track performance</p>
          </div>
        </div>
      </div>

      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #A855F7, #7C3AED)' }}>
          <div className="stat-card-header">
            <div><div className="stat-card-label">Total Workers</div><div className="stat-card-sub">Active team</div></div>
            <div className="stat-card-icon">👥</div>
          </div>
          <div className="stat-card-value">{workers.length}</div>
        </div>
        {topWorker && topWorker.totalServices > 0 && (
          <div className="stat-card" style={{ background: 'linear-gradient(135deg, #EC4899, #DB2777)' }}>
            <div className="stat-card-header">
              <div>
                <div className="stat-card-label">Top Performer</div>
                <div className="stat-card-sub">{topWorker.totalServices} services</div>
              </div>
              <div className="stat-card-icon">🏆</div>
            </div>
            <div className="stat-card-value" style={{ fontSize: 20 }}>{topWorker.name}</div>
          </div>
        )}
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
          <div className="stat-card-header">
            <div><div className="stat-card-label">Team Revenue</div><div className="stat-card-sub">All time</div></div>
            <div className="stat-card-icon">💰</div>
          </div>
          <div className="stat-card-value">
            Rs.{workerStats.reduce((s, w) => s + w.totalRevenue, 0).toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      <div className="chart-card" style={{ marginBottom: 24 }}>
        <div className="chart-title">➕ Add New Worker</div>
        <div className="text-sm text-muted" style={{ marginTop: -4, marginBottom: 4 }}>
          Just a name for attribution when recording a service — no login, no access to this app.
        </div>
        {error && <div className="login-error">{error}</div>}
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: 12, marginTop: 12 }}>
          <input
            className="form-input"
            placeholder="Worker name (e.g. Ravi, Priya)"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn btn-primary" disabled={adding || !newName.trim()}>
            {adding ? 'Adding...' : '+ Add Worker'}
          </button>
        </form>
      </div>

      <div className="chart-card" style={{ marginBottom: 24 }}>
        <div className="chart-title">🔑 Invite Worker (give login access)</div>
        <div className="text-sm text-muted" style={{ marginTop: -4, marginBottom: 4 }}>
          Creates a real login for this person, scoped to your salon. They can record services and
          see their own performance — nothing else (no expenses, stock, reports, or other workers).
        </div>
        {inviteError && <div className="login-error">{inviteError}</div>}
        {inviteResult && (
          <div className="product-list" style={{ marginTop: 12, marginBottom: 12 }}>
            <div style={{ padding: 12 }}>
              <div style={{ fontWeight: 700, color: 'var(--success-light)', marginBottom: 6 }}>
                ✅ {inviteResult.worker.name} can now log in
              </div>
              <div className="text-sm">Email: <strong>{inviteResult.worker.email}</strong></div>
              <div className="text-sm">Temp password: <strong>{inviteResult.tempPassword}</strong></div>
              <div className="text-sm text-muted" style={{ marginTop: 6 }}>{inviteResult.note}</div>
            </div>
          </div>
        )}
        <form onSubmit={handleInvite} style={{ display: 'grid', gap: 12, marginTop: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <input
              className="form-input"
              placeholder="Full name"
              value={invite.name}
              onChange={e => setInvite({ ...invite, name: e.target.value })}
            />
            <input
              className="form-input"
              type="email"
              placeholder="Email address"
              value={invite.email}
              onChange={e => setInvite({ ...invite, email: e.target.value })}
            />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <input
              className="form-input"
              placeholder="Temp password (min 8 chars)"
              value={invite.password}
              onChange={e => setInvite({ ...invite, password: e.target.value })}
              style={{ flex: 1 }}
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={inviting || !invite.name.trim() || !invite.email.trim() || invite.password.length < 8}
            >
              {inviting ? 'Inviting...' : '🔑 Create Login'}
            </button>
          </div>
        </form>
      </div>

      <div className="section-label">
        Team Members
        <span className="badge badge-primary">{workers.length} workers</span>
      </div>

      {loading ? (
        <div className="empty-state"><div className="spinner" /></div>
      ) : workers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👥</div>
          <div className="empty-state-title">No workers yet</div>
          <div className="empty-state-text">Add your first team member above</div>
        </div>
      ) : (
        <div className="worker-grid">
          {workerStats.map((worker, idx) => (
            <div key={worker.$id} className="worker-card">
              <div className="worker-card-top">
                <div className="worker-avatar">{worker.name[0].toUpperCase()}</div>
                {idx === 0 && worker.totalServices > 0 && (
                  <span className="worker-top-badge">🏆 Top</span>
                )}
              </div>
              <div className="worker-name">{worker.name}</div>
              <div className="worker-stats">
                <div className="worker-stat">
                  <div className="worker-stat-value" style={{ color: '#10B981' }}>
                    Rs.{worker.totalRevenue.toLocaleString('en-IN')}
                  </div>
                  <div className="worker-stat-label">Revenue</div>
                </div>
                <div className="worker-stat">
                  <div className="worker-stat-value" style={{ color: '#A855F7' }}>{worker.totalServices}</div>
                  <div className="worker-stat-label">Services</div>
                </div>
                <div className="worker-stat">
                  <div className="worker-stat-value" style={{ color: '#EC4899' }}>{worker.todayServices}</div>
                  <div className="worker-stat-label">Today</div>
                </div>
              </div>
              {confirmDelete === worker.$id ? (
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={() => handleDelete(worker.$id)}>
                    Confirm Remove
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(null)}>Cancel</button>
                </div>
              ) : (
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ marginTop: 12, width: '100%', justifyContent: 'center', color: 'var(--danger)' }}
                  onClick={() => setConfirmDelete(worker.$id)}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
