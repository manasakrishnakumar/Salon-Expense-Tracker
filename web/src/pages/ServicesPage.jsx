import React, { useState, useMemo } from 'react';
import { useServices } from '../context/ServicesContext';
import { useAuth } from '../context/AuthContext';
import { SERVICE_CATEGORIES, CATEGORY_LABELS } from '../data/services';
import { apiPut, apiDownload } from '../lib/api';
import ServiceModal from '../components/ServiceModal';

const SCAT_COLORS = {
  facials: 'var(--scat-facials)',
  cleanups: 'var(--scat-cleanups)',
  pedicure_manicure: 'var(--scat-pedicure_manicure)',
  hair_services: 'var(--scat-hair_services)',
  other: 'var(--scat-other)',
};

const SCAT_ICONS = {
  facials: '✨',
  cleanups: '🧴',
  pedicure_manicure: '💅',
  hair_services: '💇',
  other: '⚡',
};

const ALL_CATS = 'all';

function PricingTab({ services, onSaved }) {
  const [drafts, setDrafts] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [savingAll, setSavingAll] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const valueFor = (s) => (drafts[s.id] !== undefined ? drafts[s.id] : (s.price ?? ''));
  const isDirty = (s) => drafts[s.id] !== undefined && Number(drafts[s.id]) !== s.price;

  const filtered = services.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
  const unpricedCount = services.filter(s => s.price == null).length;

  const saveOne = async (service) => {
    const price = Number(drafts[service.id]);
    if (!Number.isFinite(price) || price < 0) return;
    setSavingId(service.id);
    setError('');
    try {
      await apiPut(`/api/services/${service.id}/price`, { price });
      await onSaved();
      setDrafts(prev => { const next = { ...prev }; delete next[service.id]; return next; });
    } catch (err) {
      setError(err.message || 'Failed to save price.');
    } finally {
      setSavingId(null);
    }
  };

  const saveAllDirty = async () => {
    const dirty = services.filter(isDirty);
    if (dirty.length === 0) return;
    setSavingAll(true);
    setError('');
    try {
      await apiPut('/api/services/prices', {
        prices: dirty.map(s => ({ serviceId: s.id, price: Number(drafts[s.id]) })),
      });
      await onSaved();
      setDrafts({});
    } catch (err) {
      setError(err.message || 'Failed to save prices.');
    } finally {
      setSavingAll(false);
    }
  };

  const dirtyCount = services.filter(isDirty).length;

  return (
    <div>
      <div className="chart-card" style={{ marginBottom: 20 }}>
        <div className="chart-title">💵 Set Customer Prices</div>
        <div className="text-sm text-muted" style={{ marginTop: -4 }}>
          What you charge for each service — separate from its internal product cost.
          {unpricedCount > 0 && (
            <span style={{ color: 'var(--warning-light, #F59E0B)', fontWeight: 700 }}> {unpricedCount} services have no price set yet.</span>
          )}
        </div>
        {error && <div className="login-error" style={{ marginTop: 12 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 12, marginTop: 12, alignItems: 'center' }}>
          <input
            className="form-input"
            placeholder="Search services…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1 }}
          />
          <button
            className="btn btn-primary btn-sm"
            disabled={dirtyCount === 0 || savingAll}
            onClick={saveAllDirty}
          >
            {savingAll ? 'Saving…' : `💾 Save All (${dirtyCount})`}
          </button>
        </div>
      </div>

      <div className="report-table-wrap">
        <table className="report-table">
          <thead>
            <tr>
              <th>Service</th>
              <th>Cost (internal)</th>
              <th>Price to Charge</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id}>
                <td style={{ fontWeight: 700 }}>{s.name}</td>
                <td style={{ color: 'var(--text-muted)' }}>{s.cost != null ? `₹${s.cost.toFixed(2)}` : '—'}</td>
                <td>
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    step="0.01"
                    style={{ maxWidth: 120 }}
                    value={valueFor(s)}
                    onChange={e => setDrafts(prev => ({ ...prev, [s.id]: e.target.value }))}
                    placeholder="Not set"
                  />
                </td>
                <td>
                  <button
                    className="btn btn-ghost btn-sm"
                    disabled={!isDirty(s) || savingId === s.id}
                    onClick={() => saveOne(s)}
                  >
                    {savingId === s.id ? '…' : 'Save'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ServicesPage() {
  const { services, serviceRecords, deleteServiceRecord, refreshServiceRecords } = useServices();
  const { user } = useAuth();
  const isOwner = user?.role === 'owner';
  const [activeCategory, setActiveCategory] = useState(ALL_CATS);
  const [search, setSearch] = useState('');
  const [selectedService, setSelectedService] = useState(null);
  const [activeTab, setActiveTab] = useState('browse'); // 'browse' | 'history' | 'pricing'
  const [downloadingId, setDownloadingId] = useState(null);

  const filteredServices = useMemo(() => {
    return services.filter(s => {
      const matchCat = activeCategory === ALL_CATS || s.category === activeCategory;
      const matchSearch = s.name.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [services, activeCategory, search]);

  const categories = [
    { id: ALL_CATS, label: 'All Services', count: services.length },
    ...Object.values(SERVICE_CATEGORIES).map(cat => ({
      id: cat,
      label: CATEGORY_LABELS[cat],
      count: services.filter(s => s.category === cat).length,
    })),
  ];

  const handleDeleteRecord = async (id) => {
    if (window.confirm('Delete this service record?')) {
      await deleteServiceRecord(id);
    }
  };

  const handleDownloadReceipt = async (record) => {
    setDownloadingId(record.$id);
    try {
      await apiDownload(`/api/service-records/${record.$id}/invoice`, `receipt-${record.$id}.pdf`);
    } catch (err) {
      window.alert(err.message || 'Failed to download receipt.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Services</h1>
            <p className="page-subtitle">Browse and record salon services</p>
          </div>
          <div className="flex gap-8">
            <button
              className={`btn ${activeTab === 'browse' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab('browse')}
            >✂️ Browse</button>
            <button
              className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab('history')}
            >📋 History</button>
            {isOwner && (
              <button
                className={`btn ${activeTab === 'pricing' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setActiveTab('pricing')}
              >💵 Pricing</button>
            )}
          </div>
        </div>
      </div>

      {activeTab === 'browse' ? (
        <>
          {/* Category Tabs */}
          <div className="category-tabs">
            {categories.map(cat => (
              <button
                key={cat.id}
                className={`category-tab ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.id !== ALL_CATS && SCAT_ICONS[cat.id]} {cat.label}
                <span style={{
                  marginLeft: 6,
                  opacity: 0.7,
                  fontSize: 11,
                  background: 'rgba(255,255,255,0.15)',
                  borderRadius: 99,
                  padding: '1px 6px',
                }}>
                  {cat.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="search-bar">
            <span className="search-bar-icon">🔍</span>
            <input
              className="form-input"
              placeholder="Search services…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Services Grid */}
          {filteredServices.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🔍</div>
              <div className="empty-state-title">No services found</div>
              <div className="empty-state-text">Try a different category or search term</div>
            </div>
          ) : (
            <div className="services-grid">
              {filteredServices.map(service => {
                const color = SCAT_COLORS[service.category] || 'var(--primary)';
                return (
                  <div
                    key={service.id}
                    className="service-card"
                    onClick={() => setSelectedService(service)}
                  >
                    <div className="service-card-indicator" style={{ background: color }} />
                    <div className="service-card-content">
                      <div className="service-card-name">{service.name}</div>
                      <div className="service-card-footer" style={{ marginTop: 10 }}>
                        {service.price ? (
                          <div className="service-card-cost" style={{ color }}>
                            ₹{service.price.toFixed(2)}
                          </div>
                        ) : (
                          <span className="tbd-badge">Price not set</span>
                        )}
                        {service.products && service.products.length > 0 && (
                          <span className="product-badge">
                            📦 {service.products.length} products
                          </span>
                        )}
                      </div>
                      {isOwner && service.cost != null && (
                        <div className="text-sm text-muted" style={{ marginTop: 4 }}>
                          Cost: ₹{service.cost.toFixed(2)}
                        </div>
                      )}
                    </div>
                    <div style={{
                      position: 'absolute', right: 16, top: 16,
                      width: 32, height: 32,
                      border: `2px solid ${color}`,
                      borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color,
                      fontSize: 18,
                    }}>
                      +
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : activeTab === 'history' ? (
        <>
          {/* Service Records History */}
          <div className="section-label">
            Service History
            <span className="badge badge-primary">{serviceRecords.length} records</span>
          </div>

          {serviceRecords.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">✂️</div>
              <div className="empty-state-title">No service records yet</div>
              <div className="empty-state-text">Switch to Browse tab and record a service</div>
            </div>
          ) : (
            <div className="transaction-list">
              {serviceRecords.map(record => {
                const color = SCAT_COLORS[record.category] || 'var(--primary)';
                const icon = SCAT_ICONS[record.category] || '✂️';
                const date = new Date(record.Date);
                return (
                  <div key={record.$id} className="transaction-item">
                    <div className="transaction-icon" style={{ background: `${color}18` }}>
                      {icon}
                    </div>
                    <div className="transaction-info">
                      <div className="transaction-name">{record.serviceName}</div>
                      <div className="transaction-meta">
                        {record.WorkerName && <><strong>{record.WorkerName}</strong> · </>}
                        {date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {' · '}Qty: {record.quantity}
                      </div>
                    </div>
                    <div className="transaction-right">
                      <div className="transaction-amount" style={{ color: 'var(--success-light)' }}>
                        +₹{(record.totalPrice || record.totalCost || 0).toLocaleString('en-IN')}
                      </div>
                      <button
                        className="btn btn-icon"
                        onClick={() => handleDownloadReceipt(record)}
                        disabled={downloadingId === record.$id}
                        title="Download receipt"
                      >{downloadingId === record.$id ? '…' : '🧾'}</button>
                      {isOwner && (
                        <button
                          className="btn btn-icon"
                          style={{ color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.08)' }}
                          onClick={() => handleDeleteRecord(record.$id)}
                          title="Delete record"
                        >🗑️</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        isOwner && <PricingTab services={services} onSaved={refreshServiceRecords} />
      )}

      {selectedService && (
        <ServiceModal service={selectedService} onClose={() => setSelectedService(null)} />
      )}
    </div>
  );
}
