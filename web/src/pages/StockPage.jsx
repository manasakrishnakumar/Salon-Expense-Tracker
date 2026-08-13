import React, { useState, useMemo } from 'react';
import { useStock } from '../context/StockContext';
import RestockModal from '../components/RestockModal';

const STATUS_COLORS = { ok: '#10B981', low: '#F59E0B', empty: '#EF4444', never: '#6B7280' };
const STATUS_ICONS = { ok: 'OK', low: 'LOW', empty: 'OUT', never: 'NEW' };

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

export default function StockPage() {
  const { productStockMap, restockHistory, loading, getTotalInventoryValue } = useStock();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showRestock, setShowRestock] = useState(false);
  const [prefillProduct, setPrefillProduct] = useState('');
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

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Inventory</h1>
            <p className="page-subtitle">Track product stock and manage restocking</p>
          </div>
          <button className="btn btn-primary" onClick={() => { setPrefillProduct(''); setShowRestock(true); }}>
            + Restock
          </button>
        </div>
      </div>

      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
          <div className="stat-card-header">
            <div><div className="stat-card-label">Total Products</div><div className="stat-card-sub">In system</div></div>
            <div className="stat-card-icon">📦</div>
          </div>
          <div className="stat-card-value">{allProducts.length}</div>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}>
          <div className="stat-card-header">
            <div><div className="stat-card-label">Low Stock</div><div className="stat-card-sub">Need attention</div></div>
            <div className="stat-card-icon">⚠️</div>
          </div>
          <div className="stat-card-value">{lowStockCount}</div>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #6B7280, #4B5563)' }}>
          <div className="stat-card-header">
            <div><div className="stat-card-label">Not Set Up</div><div className="stat-card-sub">Never restocked</div></div>
            <div className="stat-card-icon">⚫</div>
          </div>
          <div className="stat-card-value">{neverCount}</div>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #A855F7, #7C3AED)' }}>
          <div className="stat-card-header">
            <div><div className="stat-card-label">Total Invested</div><div className="stat-card-sub">All restocks</div></div>
            <div className="stat-card-icon">💰</div>
          </div>
          <div className="stat-card-value">Rs.{totalValue.toLocaleString('en-IN')}</div>
        </div>
      </div>

      <div className="analysis-tabs" style={{ marginBottom: 20 }}>
        <button
          className={'analysis-tab' + (activeTab === 'inventory' ? ' active' : '')}
          onClick={() => setActiveTab('inventory')}
        >📦 Inventory</button>
        <button
          className={'analysis-tab' + (activeTab === 'history' ? ' active' : '')}
          onClick={() => setActiveTab('history')}
        >🕐 Restock History</button>
      </div>

      {activeTab === 'inventory' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {[
              { key: 'all', label: 'All (' + allProducts.length + ')' },
              { key: 'low', label: 'Low Stock (' + lowStockCount + ')' },
              { key: 'never', label: 'Not Set Up (' + neverCount + ')' },
            ].map(f => (
              <button
                key={f.key}
                className={'category-tab' + (filter === f.key ? ' active' : '')}
                onClick={() => setFilter(f.key)}
              >{f.label}</button>
            ))}
          </div>

          <div className="search-bar" style={{ marginBottom: 20 }}>
            <span className="search-bar-icon">🔍</span>
            <input
              className="form-input"
              placeholder="Search products..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="empty-state"><div className="spinner" /></div>
          ) : filteredProducts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📦</div>
              <div className="empty-state-title">No products found</div>
            </div>
          ) : (
            <div className="stock-grid">
              {filteredProducts.map(product => {
                const status = getStatus(product);
                const color = STATUS_COLORS[status];
                return (
                  <div key={product.name} className="stock-card">
                    <div className="stock-card-header">
                      <div className="stock-card-name">{product.name}</div>
                      <StatusBadge status={status} />
                    </div>
                    {product.neverRestocked ? (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', margin: '8px 0' }}>
                        No stock data - restock to start tracking
                      </div>
                    ) : (
                      <div>
                        <div className="stock-stats">
                          <div className="stock-stat">
                            <div className="stock-stat-label">Restocked</div>
                            <div className="stock-stat-value" style={{ color: '#10B981' }}>
                              {product.totalRestocked}{product.unit}
                            </div>
                          </div>
                          <div className="stock-stat">
                            <div className="stock-stat-label">Used</div>
                            <div className="stock-stat-value" style={{ color: '#EF4444' }}>
                              {product.totalUsed.toFixed(1)}{product.unit}
                            </div>
                          </div>
                          <div className="stock-stat">
                            <div className="stock-stat-label">Remaining</div>
                            <div className="stock-stat-value" style={{ color: color }}>
                              {product.remaining.toFixed(1)}{product.unit}
                            </div>
                          </div>
                        </div>
                        <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginTop: 10 }}>
                          <div style={{
                            height: '100%',
                            width: (100 - product.usedPercent) + '%',
                            borderRadius: 99,
                            background: color,
                            transition: 'width 0.6s ease',
                          }} />
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, textAlign: 'right' }}>
                          {product.usedPercent}% used
                        </div>
                      </div>
                    )}
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ marginTop: 12, width: '100%', justifyContent: 'center', color: color }}
                      onClick={() => { setPrefillProduct(product.name); setShowRestock(true); }}
                    >
                      📦 Restock
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div>
          <div className="section-label">
            Restock History
            <span className="badge badge-primary">{restockHistory.length} entries</span>
          </div>
          {restockHistory.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <div className="empty-state-title">No restock records yet</div>
              <div className="empty-state-text">Click + Restock to log your first product restock</div>
              <button className="btn btn-primary btn-sm" onClick={() => setShowRestock(true)}>+ Restock</button>
            </div>
          ) : (
            <div className="transaction-list">
              {restockHistory.map(entry => (
                <div key={entry.$id} className="transaction-item">
                  <div className="transaction-icon" style={{ background: 'rgba(16,185,129,0.12)' }}>📦</div>
                  <div className="transaction-info">
                    <div className="transaction-name">{entry.productName}</div>
                    <div className="transaction-meta">
                      {entry.supplier ? entry.supplier + ' · ' : ''}
                      {entry.date} · +{entry.quantityAdded}{entry.unit}
                    </div>
                  </div>
                  <div className="transaction-right">
                    <div className="transaction-amount" style={{ color: 'var(--success-light)' }}>
                      {entry.purchasePrice ? 'Rs.' + entry.purchasePrice.toLocaleString('en-IN') : '-'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showRestock && (
        <RestockModal
          prefillProduct={prefillProduct}
          onClose={() => { setShowRestock(false); setPrefillProduct(''); }}
        />
      )}
    </div>
  );
}
