import React, { useState, useMemo } from 'react';
import { useStock } from '../context/StockContext';
import RestockModal from '../components/RestockModal';

const STATUS_COLORS = { ok: '#10B981', low: '#F59E0B', empty: '#EF4444', never: '#6B7280' };

function getStatus(p) {
  if (p.neverRestocked) return 'never';
  if (p.remaining === 0) return 'empty';
  if (p.isLowStock) return 'low';
  return 'ok';
}

function StatusBadge({ status }) {
  const labels = { ok: 'In Stock', low: 'Low Stock', empty: 'Out of Stock', never: 'Not Set Up' };
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 99,
      background: STATUS_COLORS[status] + '22', color: STATUS_COLORS[status],
      border: '1px solid ' + STATUS_COLORS[status] + '44',
    }}>
      {labels[status]}
    </span>
  );
}

function UrgencyBadge({ urgency }) {
  const MAP = { critical: ['#EF4444', '🚨 Critical'], high: ['#F59E0B', '⚠️ High'], medium: ['#6366F1', '📌 Medium'], ok: ['#10B981', '✅ OK'] };
  const [color, label] = MAP[urgency] || MAP.ok;
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 99, background: color + '22', color, border: `1px solid ${color}44` }}>{label}</span>
  );
}

function WriteOffModal({ product, onClose, onSave }) {
  const [form, setForm] = useState({ quantityRemoved: '', reason: 'wastage', notes: '', date: new Date().toISOString().split('T')[0] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.quantityRemoved || Number(form.quantityRemoved) <= 0) { setError('Enter a valid quantity'); return; }
    setLoading(true);
    const result = await onSave({ productName: product, ...form, quantityRemoved: Number(form.quantityRemoved) });
    setLoading(false);
    if (result.success) onClose();
    else setError(result.error || 'Failed to record write-off');
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal animate-slideUp" style={{ maxWidth: 400 }}>
        <h2 className="modal-title">📝 Write Off Stock</h2>
        <p className="text-sm text-muted" style={{ marginBottom: 16 }}>Record stock that was lost, expired, or wasted for <strong>{product}</strong>.</p>
        {error && <div className="login-error">{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
          <div>
            <label className="form-label">Reason</label>
            <select className="form-input" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}>
              <option value="wastage">♻️ Wastage / Spill</option>
              <option value="expiry">⏰ Expired</option>
              <option value="theft">🚨 Theft / Loss</option>
              <option value="other">📋 Other</option>
            </select>
          </div>
          <div>
            <label className="form-label">Quantity Removed</label>
            <input className="form-input" type="number" min="0.1" step="0.1" placeholder="e.g. 50 (ml/g/pcs)" value={form.quantityRemoved} onChange={e => setForm({ ...form, quantityRemoved: e.target.value })} required />
          </div>
          <div>
            <label className="form-label">Date</label>
            <input className="form-input" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
          </div>
          <div>
            <label className="form-label">Notes (optional)</label>
            <input className="form-input" placeholder="e.g. Bottle fell and broke..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-danger" disabled={loading}>{loading ? 'Saving…' : '📝 Record Write-Off'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function StockPage() {
  const { productStockMap, restockHistory, adjustments, reorderSuggestions, loading, addRestock, addAdjustment, getTotalInventoryValue } = useStock();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showRestock, setShowRestock] = useState(false);
  const [prefillProduct, setPrefillProduct] = useState('');
  const [writeOffProduct, setWriteOffProduct] = useState(null);
  const [activeTab, setActiveTab] = useState('inventory');

  const allProducts = Object.values(productStockMap);
  const lowStockCount = allProducts.filter(p => p.isLowStock).length;
  const neverCount = allProducts.filter(p => p.neverRestocked).length;
  const totalValue = getTotalInventoryValue();

  const filteredProducts = useMemo(() => {
    return allProducts.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
      if (filter === 'low') return matchSearch && (p.isLowStock || p.remaining === 0);
      if (filter === 'never') return matchSearch && p.neverRestocked;
      return matchSearch;
    });
  }, [allProducts, filter, search]);

  const TABS = [
    { id: 'inventory', label: '📦 Inventory' },
    { id: 'reorder', label: `💡 Reorder Suggestions${reorderSuggestions.filter(s => s.urgency !== 'ok').length > 0 ? ` (${reorderSuggestions.filter(s => s.urgency !== 'ok').length})` : ''}` },
    { id: 'adjustments', label: `📝 Write-Offs${adjustments.length > 0 ? ` (${adjustments.length})` : ''}` },
  ];

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Inventory</h1>
            <p className="page-subtitle">Track product stock levels, write-offs, and reorder suggestions</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowRestock(true)}>+ Restock</button>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg,#A855F7,#7C3AED)' }}>
          <div className="stat-card-header"><div><div className="stat-card-label">Total Products</div><div className="stat-card-sub">In catalog</div></div><div className="stat-card-icon">📦</div></div>
          <div className="stat-card-value">{allProducts.length}</div>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)' }}>
          <div className="stat-card-header"><div><div className="stat-card-label">Low Stock</div><div className="stat-card-sub">Needs restocking</div></div><div className="stat-card-icon">⚠️</div></div>
          <div className="stat-card-value">{lowStockCount}</div>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg,#10B981,#059669)' }}>
          <div className="stat-card-header"><div><div className="stat-card-label">Inventory Value</div><div className="stat-card-sub">Total spend</div></div><div className="stat-card-icon">💰</div></div>
          <div className="stat-card-value" style={{ fontSize: 22 }}>Rs.{totalValue.toLocaleString('en-IN')}</div>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg,#EF4444,#DC2626)' }}>
          <div className="stat-card-header"><div><div className="stat-card-label">Write-Offs</div><div className="stat-card-sub">Total recorded</div></div><div className="stat-card-icon">📝</div></div>
          <div className="stat-card-value">{adjustments.length}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid var(--border)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600,
            color: activeTab === t.id ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: activeTab === t.id ? '2px solid var(--primary)' : '2px solid transparent',
            marginBottom: -1, transition: 'all 0.2s',
          }}>{t.label}</button>
        ))}
      </div>

      {activeTab === 'reorder' && (
        <div>
          {reorderSuggestions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">💡</div>
              <div className="empty-state-title">No suggestions yet</div>
              <div className="empty-state-text">Record some services to generate usage-based reorder suggestions</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {reorderSuggestions.map(s => (
                <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{s.name}</div>
                    <div className="text-sm text-muted">
                      Remaining: <strong>{s.remaining.toFixed(0)} {s.unit}</strong> · Daily use: <strong>{s.dailyUsage} {s.unit}/day</strong> · {s.daysUntilEmpty > 0 ? `Runs out in ~${s.daysUntilEmpty} days` : 'Already out'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--primary)' }}>Order {s.suggestedReorderQty} {s.unit}</div>
                    <div style={{ marginTop: 4 }}><UrgencyBadge urgency={s.urgency} /></div>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={() => { setPrefillProduct(s.name); setShowRestock(true); }}>Restock</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'adjustments' && (
        <div>
          {adjustments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📝</div>
              <div className="empty-state-title">No write-offs recorded</div>
              <div className="empty-state-text">Use the "Write Off" button on a product to record wastage</div>
            </div>
          ) : (
            <div className="transaction-list">
              {[...adjustments].sort((a, b) => b.date?.localeCompare(a.date || '')).map(a => (
                <div key={a.$id} className="transaction-item">
                  <div className="transaction-icon" style={{ background: '#EF444415' }}>📝</div>
                  <div className="transaction-info">
                    <div className="transaction-name">{a.productName}</div>
                    <div className="transaction-meta">{a.reason} · {a.date} {a.notes ? `· ${a.notes}` : ''}</div>
                  </div>
                  <div className="transaction-right">
                    <div className="transaction-amount" style={{ color: 'var(--danger)' }}>−{a.quantityRemoved}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'inventory' && (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
              <span className="search-bar-icon">🔍</span>
              <input className="form-input" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {['all', 'low', 'never'].map(f => (
              <button key={f} className={`btn ${filter === f ? 'btn-primary' : 'btn-ghost'} btn-sm`} onClick={() => setFilter(f)}>
                {f === 'all' ? 'All' : f === 'low' ? '⚠️ Low Stock' : '🆕 Not Set Up'}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="empty-state"><div className="spinner" /></div>
          ) : filteredProducts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📦</div>
              <div className="empty-state-title">No products found</div>
            </div>
          ) : (
            <div className="product-list">
              {filteredProducts.map(p => {
                const status = getStatus(p);
                const pctUsed = p.usedPercent || 0;
                return (
                  <div key={p.name} style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: 15 }}>{p.name}</span>
                          <StatusBadge status={status} />
                          <span className="text-sm text-muted">({p.unit})</span>
                        </div>
                        <div className="text-sm text-muted" style={{ marginTop: 4 }}>
                          Remaining: <strong style={{ color: STATUS_COLORS[status] }}>{p.remaining.toFixed(0)}</strong> / {p.totalRestocked.toFixed(0)} restocked
                          {p.totalAdjusted > 0 && <> · <span style={{ color: '#EF4444' }}>−{p.totalAdjusted.toFixed(0)} written off</span></>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setPrefillProduct(p.name); setShowRestock(true); }}>+ Restock</button>
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => setWriteOffProduct(p.name)}>📝 Write Off</button>
                      </div>
                    </div>
                    <div style={{ height: 6, background: 'var(--bg-input)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pctUsed}%`, background: pctUsed > 85 ? '#EF4444' : pctUsed > 60 ? '#F59E0B' : '#10B981', borderRadius: 99, transition: 'width 0.4s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {showRestock && <RestockModal prefillProduct={prefillProduct} onClose={() => { setShowRestock(false); setPrefillProduct(''); }} onSave={addRestock} />}
      {writeOffProduct && <WriteOffModal product={writeOffProduct} onClose={() => setWriteOffProduct(null)} onSave={addAdjustment} />}
    </div>
  );
}
