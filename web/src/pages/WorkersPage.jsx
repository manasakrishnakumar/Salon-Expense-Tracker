import React, { useState, useEffect } from 'react';
import { useWorkers } from '../context/WorkersContext';
import { useServices } from '../context/ServicesContext';
import { apiPost, apiGet, apiPut } from '../lib/api';

function fmtINR(v) { return 'Rs.' + Number(v || 0).toLocaleString('en-IN'); }
function fmtDuration(mins) {
  if (!mins) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ── Worker Profile Modal (W2) ────────────────────────────────────────────────
function WorkerProfileModal({ worker, stats, attendance, onClose }) {
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthAttendance = (attendance || []).filter(a => a.workerName === worker.name && a.date.startsWith(thisMonth));
  const daysPresent = monthAttendance.length;
  const totalHours = monthAttendance.reduce((s, a) => s + (a.durationMinutes || 0), 0);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal animate-slideUp" style={{ maxWidth: 500 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg,#A855F7,#EC4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: 32, margin: '0 auto 12px' }}>
            {worker.name[0].toUpperCase()}
          </div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{worker.name}</h2>
          <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 99, background: worker.isActive ? '#10B98122' : '#EF444422', color: worker.isActive ? '#10B981' : '#EF4444', fontWeight: 600, border: `1px solid ${worker.isActive ? '#10B98144' : '#EF444444'}` }}>
            {worker.isActive ? '● Active' : '● Inactive'}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total Services', value: stats.totalServices, icon: '✂️', color: '#A855F7' },
            { label: 'Revenue Generated', value: fmtINR(stats.totalRevenue), icon: '💰', color: '#10B981' },
            { label: 'Tips Earned', value: fmtINR(stats.totalTips), icon: '🎁', color: '#EC4899' },
            { label: "Today's Services", value: stats.todayServices, icon: '📅', color: '#F59E0B' },
            { label: 'Days Present (this month)', value: daysPresent, icon: '🗓️', color: '#6366F1' },
            { label: 'Total Hours (this month)', value: fmtDuration(totalHours), icon: '⏱️', color: '#14B8A6' },
          ].map(s => (
            <div key={s.label} style={{ background: s.color + '12', border: `1px solid ${s.color}33`, borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 20 }}>{s.icon}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {monthAttendance.length > 0 && (
          <>
            <div className="section-label" style={{ marginBottom: 8 }}>Attendance This Month</div>
            <div style={{ maxHeight: 180, overflowY: 'auto', display: 'grid', gap: 6 }}>
              {[...monthAttendance].reverse().slice(0, 10).map(a => (
                <div key={a.$id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-input)', borderRadius: 8, fontSize: 13 }}>
                  <span>{a.date}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{a.checkIn ? a.checkIn.slice(11, 16) : '—'} → {a.checkOut ? a.checkOut.slice(11, 16) : 'ongoing'}</span>
                  <span style={{ color: '#10B981', fontWeight: 600 }}>{fmtDuration(a.durationMinutes)}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="modal-actions" style={{ marginTop: 20 }}>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ── Attendance Panel (W1) ────────────────────────────────────────────────────
function AttendancePanel({ workers, attendance, onCheckIn, onCheckOut, loadingAttendance }) {
  const today = new Date().toISOString().split('T')[0];
  const todayRecords = (attendance || []).filter(a => a.date === today);

  const getStatus = (workerName) => todayRecords.find(a => a.workerName === workerName);

  return (
    <div style={{ marginBottom: 28 }}>
      <div className="section-label" style={{ marginBottom: 12 }}>
        Today's Attendance <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400 }}>({today})</span>
      </div>
      {loadingAttendance ? (
        <div style={{ textAlign: 'center', padding: 20 }}><div className="spinner" /></div>
      ) : workers.length === 0 ? (
        <div className="empty-state" style={{ padding: 24 }}>
          <div className="empty-state-text">No workers added yet</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {workers.map(w => {
            const record = getStatus(w.name);
            const isIn = record && !record.checkOut;
            const isDone = record && record.checkOut;
            return (
              <div key={w.$id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: isIn ? '#10B98133' : isDone ? '#A855F733' : '#6B728033', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, color: isIn ? '#10B981' : isDone ? '#A855F7' : '#6B7280' }}>
                  {w.name[0].toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{w.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {isIn ? `🟢 Checked in at ${record.checkIn.slice(11, 16)}`
                      : isDone ? `✅ Done · ${fmtDuration(record.durationMinutes)} · out at ${record.checkOut.slice(11, 16)}`
                      : '⚪ Not checked in'}
                  </div>
                </div>
                {!record && (
                  <button className="btn btn-primary btn-sm" onClick={() => onCheckIn(w.name, w.$id)}>
                    Check In
                  </button>
                )}
                {isIn && (
                  <button className="btn btn-ghost btn-sm" onClick={() => onCheckOut(record.$id)}>
                    Check Out
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function WorkersPage() {
  const { workers, addWorker, deleteWorker, loading } = useWorkers();
  const { serviceRecords } = useServices();
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [profileWorker, setProfileWorker] = useState(null);
  const [invite, setInvite] = useState({ name: '', email: '' });
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteResult, setInviteResult] = useState(null);

  // Attendance state
  const [attendance, setAttendance] = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [activeTab, setActiveTab] = useState('team'); // 'team' | 'attendance'

  const today = new Date().toISOString().split('T')[0];

  const loadAttendance = async () => {
    setLoadingAttendance(true);
    try {
      const res = await apiGet('/api/attendance');
      setAttendance(res.records || []);
    } catch (e) { console.error(e); }
    finally { setLoadingAttendance(false); }
  };

  useEffect(() => { loadAttendance(); }, []);

  const handleCheckIn = async (workerName, workerId) => {
    try {
      const res = await apiPost('/api/attendance/checkin', { workerName, workerId });
      setAttendance(prev => [res.record, ...prev]);
    } catch (err) { alert(err.message); }
  };

  const handleCheckOut = async (recordId) => {
    try {
      const res = await apiPut(`/api/attendance/${recordId}/checkout`, {});
      setAttendance(prev => prev.map(a => a.$id === recordId ? res.record : a));
    } catch (err) { alert(err.message); }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true); setError('');
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
    if (!invite.name.trim() || !invite.email.trim()) return;
    setInviting(true); setInviteError('');
    try {
      const result = await apiPost('/api/workers/invite', { name: invite.name.trim(), email: invite.email.trim() });
      setInviteResult(result);
      setInvite({ name: '', email: '' });
    } catch (err) {
      setInviteError(err.message || 'Failed to invite worker.');
    } finally { setInviting(false); }
  };

  const workerStats = workers.map(w => {
    const records = serviceRecords.filter(r => r.WorkerName === w.name);
    const totalRevenue = records.reduce((sum, r) => sum + (r.totalPrice || 0), 0);
    const totalTips = records.reduce((sum, r) => sum + (r.tip || 0), 0);
    const totalServices = records.length;
    const todayServices = records.filter(r => r.Date && r.Date.startsWith(today)).length;
    return { worker: w, records, totalRevenue, totalTips, totalServices, todayServices };
  });

  const totalRevenue = workerStats.reduce((s, w) => s + w.totalRevenue, 0);
  const totalServices = workerStats.reduce((s, w) => s + w.totalServices, 0);
  const todayAttendance = attendance.filter(a => a.date === today).length;

  const TABS = [
    { id: 'team', label: '👥 Team' },
    { id: 'attendance', label: '🗓️ Attendance' },
  ];

  const profileStats = profileWorker ? workerStats.find(s => s.worker.$id === profileWorker.$id) : null;

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Workers</h1>
            <p className="page-subtitle">Manage your team, track attendance and performance</p>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg,#A855F7,#7C3AED)' }}>
          <div className="stat-card-header"><div><div className="stat-card-label">Total Workers</div><div className="stat-card-sub">Active team</div></div><div className="stat-card-icon">👥</div></div>
          <div className="stat-card-value">{workers.filter(w => w.isActive !== false).length}</div>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg,#10B981,#059669)' }}>
          <div className="stat-card-header"><div><div className="stat-card-label">Team Revenue</div><div className="stat-card-sub">All time</div></div><div className="stat-card-icon">💰</div></div>
          <div className="stat-card-value">{fmtINR(totalRevenue)}</div>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)' }}>
          <div className="stat-card-header"><div><div className="stat-card-label">Total Services</div><div className="stat-card-sub">All time</div></div><div className="stat-card-icon">✂️</div></div>
          <div className="stat-card-value">{totalServices}</div>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg,#6366F1,#4F46E5)' }}>
          <div className="stat-card-header"><div><div className="stat-card-label">Present Today</div><div className="stat-card-sub">Checked in</div></div><div className="stat-card-icon">🗓️</div></div>
          <div className="stat-card-value">{todayAttendance}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding: '10px 20px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600,
            color: activeTab === t.id ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: activeTab === t.id ? '2px solid var(--primary)' : '2px solid transparent',
            marginBottom: -1, transition: 'all 0.2s',
          }}>{t.label}</button>
        ))}
      </div>

      {activeTab === 'attendance' ? (
        <AttendancePanel workers={workers} attendance={attendance} onCheckIn={handleCheckIn} onCheckOut={handleCheckOut} loadingAttendance={loadingAttendance} />
      ) : (
        <>
          {/* Worker Cards */}
          {loading ? (
            <div className="empty-state"><div className="spinner" /></div>
          ) : workerStats.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">👥</div>
              <div className="empty-state-title">No workers yet</div>
              <div className="empty-state-text">Add workers below or invite them with a login</div>
            </div>
          ) : (
            <div className="stat-grid" style={{ marginBottom: 28 }}>
              {workerStats.map(({ worker: w, totalRevenue, totalTips, totalServices, todayServices }) => {
                const todayChecked = attendance.find(a => a.workerName === w.name && a.date === today);
                return (
                  <div key={w.$id} className="stat-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
                    onClick={() => setProfileWorker(w)}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(168,85,247,0.2)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#A855F7,#EC4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: 20 }}>{w.name[0].toUpperCase()}</div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {todayChecked ? (
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: '#10B98122', color: '#10B981', fontWeight: 600 }}>
                            {todayChecked.checkOut ? '✅ Done' : '🟢 In'}
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: '#6B728022', color: '#6B7280', fontWeight: 600 }}>⚪ Absent</span>
                        )}
                        <button className="btn btn-icon" style={{ color: 'var(--danger)' }} onClick={e => { e.stopPropagation(); setConfirmDelete(w); }}>🗑️</button>
                      </div>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 2 }}>{w.name}</div>
                    <div className="text-sm text-muted" style={{ marginBottom: 12 }}>Today: {todayServices} service{todayServices !== 1 ? 's' : ''}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <div><div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Revenue</div><div style={{ fontWeight: 700, color: '#10B981' }}>{fmtINR(totalRevenue)}</div></div>
                      <div style={{ textAlign: 'center' }}><div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Services</div><div style={{ fontWeight: 700 }}>{totalServices}</div></div>
                      <div style={{ textAlign: 'right' }}><div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Tips</div><div style={{ fontWeight: 700, color: '#EC4899' }}>{fmtINR(totalTips)}</div></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add Worker */}
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 className="section-label">➕ Add Worker (No Login)</h3>
            <form onSubmit={handleAdd} style={{ display: 'flex', gap: 10 }}>
              <input className="form-input" placeholder="Worker name" value={newName} onChange={e => setNewName(e.target.value)} style={{ flex: 1 }} />
              <button type="submit" className="btn btn-primary" disabled={adding}>{adding ? '…' : '+ Add'}</button>
            </form>
            {error && <div className="login-error" style={{ marginTop: 10 }}>{error}</div>}
          </div>

          {/* Invite Worker */}
          <div className="card">
            <h3 className="section-label">🔐 Give Worker a Login</h3>
            <p className="text-sm text-muted" style={{ marginBottom: 12 }}>
              Creates an account with a temporary password. Share the credentials with the worker — they can change their password after logging in.
            </p>
            {inviteResult ? (
              <div style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid var(--primary)', borderRadius: 12, padding: 18 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14, color: 'var(--text)' }}>✅ Account created for <strong>{inviteResult.worker?.name}</strong></div>
                <p className="text-sm text-muted" style={{ marginBottom: 14 }}>Share these credentials with the worker. They must change their password after the first login.</p>
                {[{ label: 'Email', value: inviteResult.worker?.email }, { label: 'Temporary Password', value: inviteResult.tempPassword }].map(({ label, value }) => (
                  <div key={label} style={{ background: 'var(--bg-input)', borderRadius: 8, padding: '10px 14px', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{label}</div>
                      <code style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', letterSpacing: label === 'Temporary Password' ? '0.08em' : 0 }}>{value}</code>
                    </div>
                    <button className="btn btn-ghost btn-sm" style={{ flexShrink: 0 }} onClick={() => navigator.clipboard.writeText(value || '')} title="Copy">📋 Copy</button>
                  </div>
                ))}
                <div style={{ background: '#FEF3C722', border: '1px solid #F59E0B44', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
                  <span style={{ fontSize: 13, color: '#F59E0B' }}>⚠️ Save these now — the password cannot be retrieved again after you close this.</span>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setInviteResult(null)}>+ Create Another Login</button>
              </div>
            ) : (
              <form onSubmit={handleInvite} style={{ display: 'grid', gap: 10 }}>
                <input className="form-input" placeholder="Worker name" value={invite.name} onChange={e => setInvite({ ...invite, name: e.target.value })} required />
                <input className="form-input" type="email" placeholder="Worker email (used to log in)" value={invite.email} onChange={e => setInvite({ ...invite, email: e.target.value })} required />
                {inviteError && <div className="login-error">{inviteError}</div>}
                <button type="submit" className="btn btn-primary" style={{ width: 'fit-content' }} disabled={inviting}>{inviting ? 'Creating account…' : '🔐 Create Login'}</button>
              </form>
            )}
          </div>
        </>
      )}

      {/* Worker Profile Modal (W2) */}
      {profileWorker && profileStats && (
        <WorkerProfileModal worker={profileWorker} stats={profileStats} attendance={attendance} onClose={() => setProfileWorker(null)} />
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal animate-slideUp" style={{ maxWidth: 360 }}>
            <h2 className="modal-title">🗑️ Remove Worker?</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>This will remove <strong>{confirmDelete.name}</strong> from the team. Their service records will remain.</p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(confirmDelete.$id)}>Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
