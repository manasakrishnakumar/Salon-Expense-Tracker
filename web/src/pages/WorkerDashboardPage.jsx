import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useServices } from '../context/ServicesContext';
import { apiGet, apiPost, apiPut } from '../lib/api';

function fmtINR(v) { return '₹' + Number(v || 0).toLocaleString('en-IN'); }
function fmtDuration(mins) {
  if (!mins) return '—';
  const h = Math.floor(mins / 60), m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function WorkerDashboardPage() {
  const { user } = useAuth();
  const { serviceRecords } = useServices();
  const [attendance, setAttendance] = useState([]);
  const [loadingAtt, setLoadingAtt] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const today = new Date().toISOString().split('T')[0];
  const thisMonth = new Date().toISOString().slice(0, 7);

  // Only this worker's records
  const myRecords = serviceRecords.filter(r => r.WorkerName === user?.name);
  const todayRecords = myRecords.filter(r => r.Date?.startsWith(today));
  const monthRecords = myRecords.filter(r => r.Date?.startsWith(thisMonth));

  const totalRevenue = myRecords.reduce((s, r) => s + (r.totalPrice || 0), 0);
  const totalTips = myRecords.reduce((s, r) => s + (r.tip || 0), 0);
  const monthRevenue = monthRecords.reduce((s, r) => s + (r.totalPrice || 0), 0);
  const monthTips = monthRecords.reduce((s, r) => s + (r.tip || 0), 0);

  // Attendance
  useEffect(() => {
    apiGet('/api/attendance')
      .then(res => setAttendance(res.records || []))
      .catch(console.error)
      .finally(() => setLoadingAtt(false));
  }, []);

  const myAttendance = attendance.filter(a => a.workerName === user?.name);
  const todayAtt = myAttendance.find(a => a.date === today);
  const monthAtt = myAttendance.filter(a => a.date.startsWith(thisMonth));
  const monthHours = monthAtt.reduce((s, a) => s + (a.durationMinutes || 0), 0);

  const handleCheckIn = async () => {
    try {
      const res = await apiPost('/api/attendance/checkin', { workerName: user.name, workerId: user.$id });
      setAttendance(prev => [res.record, ...prev]);
    } catch (err) { alert(err.message); }
  };

  const handleCheckOut = async () => {
    if (!todayAtt) return;
    try {
      const res = await apiPut(`/api/attendance/${todayAtt.$id}/checkout`, {});
      setAttendance(prev => prev.map(a => a.$id === todayAtt.$id ? res.record : a));
    } catch (err) { alert(err.message); }
  };

  const TABS = [
    { id: 'overview', label: '📊 My Stats' },
    { id: 'attendance', label: '🗓️ Attendance' },
    { id: 'history', label: '✂️ Service History' },
  ];

  const statCard = (label, value, sub, color, icon) => (
    <div style={{ background: color, borderRadius: 16, padding: '18px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>{sub}</div>
        </div>
        <div style={{ fontSize: 24 }}>{icon}</div>
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: 'white' }}>{value}</div>
    </div>
  );

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">👋 Welcome, {user?.name?.split(' ')[0]}!</h1>
            <p className="page-subtitle">Your personal dashboard — stats, attendance, and history</p>
          </div>
          {/* Today's check-in/out button */}
          <div>
            {loadingAtt ? null : !todayAtt ? (
              <button className="btn btn-primary" onClick={handleCheckIn}>🟢 Check In</button>
            ) : !todayAtt.checkOut ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <span style={{ fontSize: 12, color: '#10B981', fontWeight: 600 }}>🟢 Checked in at {todayAtt.checkIn?.slice(11, 16)}</span>
                <button className="btn btn-ghost btn-sm" onClick={handleCheckOut}>🔴 Check Out</button>
              </div>
            ) : (
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>✅ Done today · {fmtDuration(todayAtt.durationMinutes)}</span>
            )}
          </div>
        </div>
      </div>

      {/* Quick today strip */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 20px', marginBottom: 20, display: 'flex', gap: 32, flexWrap: 'wrap' }}>
        <div><div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Today's Services</div><div style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary)' }}>{todayRecords.length}</div></div>
        <div><div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Today's Revenue</div><div style={{ fontSize: 22, fontWeight: 800, color: '#10B981' }}>{fmtINR(todayRecords.reduce((s, r) => s + (r.totalPrice || 0), 0))}</div></div>
        <div><div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Today's Tips</div><div style={{ fontSize: 22, fontWeight: 800, color: '#EC4899' }}>{fmtINR(todayRecords.reduce((s, r) => s + (r.tip || 0), 0))}</div></div>
        <div><div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Attendance</div><div style={{ fontSize: 22, fontWeight: 800, color: todayAtt ? '#10B981' : '#6B7280' }}>{todayAtt ? (todayAtt.checkOut ? '✅ Done' : '🟢 In') : '⚪ Not yet'}</div></div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid var(--border)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding: '10px 20px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600,
            color: activeTab === t.id ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: activeTab === t.id ? '2px solid var(--primary)' : '2px solid transparent',
            marginBottom: -1, transition: 'all 0.2s',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── Overview Tab ── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14 }}>
            {statCard('Total Services', myRecords.length, 'All time', 'linear-gradient(135deg,#A855F7,#7C3AED)', '✂️')}
            {statCard('Total Revenue', fmtINR(totalRevenue), 'You charged customers', 'linear-gradient(135deg,#10B981,#059669)', '💰')}
            {statCard('Total Tips', fmtINR(totalTips), 'Tips earned all time', 'linear-gradient(135deg,#EC4899,#DB2777)', '🎁')}
            {statCard('This Month', `${monthRecords.length} svcs`, `${fmtINR(monthRevenue)} · ${fmtINR(monthTips)} tips`, 'linear-gradient(135deg,#F59E0B,#D97706)', '📅')}
            {statCard('Days Present', `${monthAtt.length}`, 'This month', 'linear-gradient(135deg,#6366F1,#4F46E5)', '🗓️')}
            {statCard('Hours Worked', fmtDuration(monthHours), 'This month', 'linear-gradient(135deg,#14B8A6,#0D9488)', '⏱️')}
          </div>
        </div>
      )}

      {/* ── Attendance Tab ── */}
      {activeTab === 'attendance' && (
        <div>
          {loadingAtt ? (
            <div className="empty-state"><div className="spinner" /></div>
          ) : myAttendance.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🗓️</div>
              <div className="empty-state-title">No attendance yet</div>
              <div className="empty-state-text">Use the "Check In" button at the top to mark today's attendance</div>
            </div>
          ) : (
            <div className="transaction-list">
              {[...myAttendance].sort((a, b) => b.date.localeCompare(a.date)).map(a => (
                <div key={a.$id} className="transaction-item">
                  <div className="transaction-icon" style={{ background: a.checkOut ? '#10B98115' : '#6366F115' }}>
                    {a.checkOut ? '✅' : '🟢'}
                  </div>
                  <div className="transaction-info">
                    <div className="transaction-name">{a.date}</div>
                    <div className="transaction-meta">
                      In: {a.checkIn?.slice(11, 16) || '—'} · Out: {a.checkOut?.slice(11, 16) || 'Not checked out'}
                    </div>
                  </div>
                  <div className="transaction-right">
                    <div className="transaction-amount" style={{ color: '#10B981' }}>
                      {a.durationMinutes ? fmtDuration(a.durationMinutes) : '—'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Service History Tab ── */}
      {activeTab === 'history' && (
        <div>
          {myRecords.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">✂️</div>
              <div className="empty-state-title">No services recorded yet</div>
            </div>
          ) : (
            <div className="transaction-list">
              {[...myRecords].sort((a, b) => (b.Date || '').localeCompare(a.Date || '')).map(r => (
                <div key={r.$id} className="transaction-item">
                  <div className="transaction-icon" style={{ background: '#A855F715' }}>✂️</div>
                  <div className="transaction-info">
                    <div className="transaction-name">{r.serviceName}</div>
                    <div className="transaction-meta">
                      {r.Date} · Qty: {r.quantity}
                      {r.tip > 0 && <> · <span style={{ color: '#EC4899' }}>Tip: {fmtINR(r.tip)}</span></>}
                    </div>
                  </div>
                  <div className="transaction-right">
                    <div className="transaction-amount" style={{ color: '#10B981' }}>
                      {fmtINR(r.totalPrice || 0)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
