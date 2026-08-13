import React, { useState } from 'react';
import { useCustomers } from '../context/CustomersContext';
import { apiGet } from '../lib/api';

const CATEGORY_LABELS = {
  facials: 'Facials', cleanups: 'Cleanups', pedicure_manicure: 'Pedicure / Manicure',
  hair_services: 'Hair Services', other: 'Other',
};

function fmtINR(v) { return 'Rs.' + Number(v || 0).toLocaleString('en-IN'); }

function LoyaltyBadge({ points }) {
  let tier = 'Bronze';
  let color = '#CD7F32';
  if (points >= 500) { tier = 'Gold'; color = '#F59E0B'; }
  else if (points >= 200) { tier = 'Silver'; color = '#9CA3AF'; }
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: color + '22', color, border: `1px solid ${color}44` }}>
      {tier} • {points} pts
    </span>
  );
}

function CustomerModal({ customer, onClose, onSave }) {
  const [form, setForm] = useState(customer
    ? { name: customer.name, phone: customer.phone || '', email: customer.email || '', notes: customer.notes || '' }
    : { name: '', phone: '', email: '', notes: '' }
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required'); return; }
    setLoading(true);
    const result = await onSave(form);
    setLoading(false);
    if (result.success) onClose();
    else setError(result.error || 'Failed to save');
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal animate-slideUp">
        <h2 className="modal-title">{customer ? '✏️ Edit Customer' : '👤 Add Customer'}</h2>
        {error && <div className="login-error" style={{ marginBottom: 12 }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
          <input className="form-input" placeholder="Full name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          <input className="form-input" placeholder="Phone number" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          <input className="form-input" type="email" placeholder="Email (optional)" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          <textarea className="form-input" placeholder="Notes (e.g. allergies, preferences)..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} style={{ resize: 'vertical' }} />
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : '💾 Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CustomerProfile({ customerId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    apiGet(`/api/customers/${customerId}`)
      .then(res => setData(res))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [customerId]);

  if (loading) return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal animate-slideUp" style={{ textAlign: 'center', padding: 40 }}>
        <div className="spinner" />
      </div>
    </div>
  );

  const { customer, serviceHistory = [] } = data || {};
  if (!customer) return null;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal animate-slideUp" style={{ maxWidth: 560 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h2 className="modal-title" style={{ margin: 0 }}>👤 {customer.name}</h2>
            {customer.phone && <div className="text-sm text-muted">📞 {customer.phone}</div>}
            {customer.email && <div className="text-sm text-muted">✉️ {customer.email}</div>}
          </div>
          <LoyaltyBadge points={customer.loyaltyPoints || 0} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total Visits', value: customer.visitCount || 0, icon: '✂️', color: '#A855F7' },
            { label: 'Total Spent', value: fmtINR(customer.totalSpend), icon: '💰', color: '#10B981' },
            { label: 'Loyalty Pts', value: customer.loyaltyPoints || 0, icon: '⭐', color: '#F59E0B' },
          ].map(s => (
            <div key={s.label} style={{ background: s.color + '15', border: `1px solid ${s.color}33`, borderRadius: 10, padding: '14px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 22 }}>{s.icon}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {customer.notes && (
          <div style={{ background: 'var(--bg-input)', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 13, color: 'var(--text-muted)' }}>
            📝 {customer.notes}
          </div>
        )}

        <div className="section-label">Service History <span className="badge badge-primary">{serviceHistory.length}</span></div>
        {serviceHistory.length === 0 ? (
          <div className="empty-state" style={{ padding: 24 }}>
            <div className="empty-state-icon">✂️</div>
            <div className="empty-state-title">No services yet</div>
          </div>
        ) : (
          <div className="transaction-list" style={{ maxHeight: 280, overflowY: 'auto' }}>
            {serviceHistory.map(r => (
              <div key={r.$id} className="transaction-item">
                <div className="transaction-icon" style={{ background: '#A855F715' }}>✂️</div>
                <div className="transaction-info">
                  <div className="transaction-name">{r.serviceName}</div>
                  <div className="transaction-meta">
                    {r.WorkerName && <><strong>{r.WorkerName}</strong> · </>}
                    {new Date(r.Date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
                <div className="transaction-right">
                  <div className="transaction-amount" style={{ color: 'var(--success-light)' }}>+{fmtINR(r.totalPrice)}</div>
                  {r.tip > 0 && <div style={{ fontSize: 11, color: '#EC4899' }}>🎁 Tip: {fmtINR(r.tip)}</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="modal-actions" style={{ marginTop: 20 }}>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default function CustomersPage() {
  const { customers, loading, addCustomer, updateCustomer, deleteCustomer } = useCustomers();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [viewingId, setViewingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || '').includes(search) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = customers.reduce((s, c) => s + (c.totalSpend || 0), 0);
  const totalVisits = customers.reduce((s, c) => s + (c.visitCount || 0), 0);
  const topCustomer = [...customers].sort((a, b) => (b.totalSpend || 0) - (a.totalSpend || 0))[0];

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Customers</h1>
            <p className="page-subtitle">Manage customer profiles, history, and loyalty points</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Customer</button>
        </div>
      </div>

      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg,#A855F7,#7C3AED)' }}>
          <div className="stat-card-header"><div><div className="stat-card-label">Total Customers</div><div className="stat-card-sub">Registered</div></div><div className="stat-card-icon">👥</div></div>
          <div className="stat-card-value">{customers.length}</div>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg,#10B981,#059669)' }}>
          <div className="stat-card-header"><div><div className="stat-card-label">Total Revenue</div><div className="stat-card-sub">From customers</div></div><div className="stat-card-icon">💰</div></div>
          <div className="stat-card-value">{fmtINR(totalRevenue)}</div>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)' }}>
          <div className="stat-card-header"><div><div className="stat-card-label">Total Visits</div><div className="stat-card-sub">All customers</div></div><div className="stat-card-icon">✂️</div></div>
          <div className="stat-card-value">{totalVisits}</div>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg,#EC4899,#BE185D)' }}>
          <div className="stat-card-header"><div><div className="stat-card-label">Top Customer</div><div className="stat-card-sub">By spend</div></div><div className="stat-card-icon">🏆</div></div>
          <div className="stat-card-value" style={{ fontSize: 20 }}>{topCustomer?.name || '—'}</div>
        </div>
      </div>

      <div className="search-bar" style={{ marginBottom: 20 }}>
        <span className="search-bar-icon">🔍</span>
        <input className="form-input" placeholder="Search by name, phone, or email..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? <div className="empty-state"><div className="spinner" /></div> : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👥</div>
          <div className="empty-state-title">{search ? 'No customers found' : 'No customers yet'}</div>
          <div className="empty-state-text">{search ? 'Try a different search' : 'Click "+ Add Customer" to register your first customer'}</div>
        </div>
      ) : (
        <div className="product-list">
          {filtered.map(c => (
            <div key={c.$id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => setViewingId(c.$id)}>
              <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg,#A855F7,#EC4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 18, flexShrink: 0 }}>
                {c.name[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{c.name}</div>
                <div className="text-sm text-muted">{c.phone || c.email || 'No contact info'} · {c.visitCount || 0} visits · {fmtINR(c.totalSpend)}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <LoyaltyBadge points={c.loyaltyPoints || 0} />
                <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); setEditingCustomer(c); }}>✏️</button>
                <button className="btn btn-icon" style={{ color: 'var(--danger)' }} onClick={e => { e.stopPropagation(); setConfirmDelete(c); }}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && <CustomerModal onClose={() => setShowAdd(false)} onSave={addCustomer} />}
      {editingCustomer && <CustomerModal customer={editingCustomer} onClose={() => setEditingCustomer(null)} onSave={(data) => updateCustomer(editingCustomer.$id, data)} />}
      {viewingId && <CustomerProfile customerId={viewingId} onClose={() => setViewingId(null)} />}

      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal animate-slideUp" style={{ maxWidth: 360 }}>
            <h2 className="modal-title">🗑️ Delete Customer?</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>This will permanently remove <strong>{confirmDelete.name}</strong> and all their profile data. Their service records will remain.</p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={async () => { await deleteCustomer(confirmDelete.$id); setConfirmDelete(null); }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
