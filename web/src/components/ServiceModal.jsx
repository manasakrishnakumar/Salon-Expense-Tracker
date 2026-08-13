import React, { useState, useMemo } from 'react';
import { useServices } from '../context/ServicesContext';
import { useWorkers } from '../context/WorkersContext';
import { useAuth } from '../context/AuthContext';
import { useCustomers } from '../context/CustomersContext';

export default function ServiceModal({ service, onClose }) {
  const { recordService } = useServices();
  const { workers, addWorker } = useWorkers();
  const { user } = useAuth();
  const { customers } = useCustomers();
  const isOwner = user?.role === 'owner';

  const [workerName, setWorkerName] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newWorkerName, setNewWorkerName] = useState('');
  const [addingWorkerLoading, setAddingWorkerLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [tip, setTip] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null); // { id, name } or null for walk-in
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const totalPrice = service.price ? (service.price * quantity).toFixed(2) : null;
  const totalCost = isOwner && service.cost ? (service.cost * quantity).toFixed(2) : null;
  const margin = isOwner && service.price && service.cost
    ? (service.price * quantity - service.cost * quantity).toFixed(2)
    : null;

  const filteredCustomers = useMemo(() =>
    customers.filter(c =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      (c.phone || '').includes(customerSearch)
    ).slice(0, 6),
    [customers, customerSearch]
  );

  const handleAddNewWorker = async () => {
    if (!newWorkerName.trim()) return;
    setAddingWorkerLoading(true);
    const result = await addWorker(newWorkerName.trim());
    setAddingWorkerLoading(false);
    if (result.success) {
      setWorkerName(newWorkerName.trim());
      setNewWorkerName('');
      setIsAddingNew(false);
    } else {
      setError(result.error || 'Could not add worker.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await recordService(service.id, workerName, quantity, {
      tip: parseFloat(tip) || 0,
      customerId: selectedCustomer?.id || '',
      customerName: selectedCustomer?.name || '',
    });
    setLoading(false);
    if (result.success) {
      setSuccess(true);
      setTimeout(onClose, 1200);
    } else {
      setError(result.error || 'Failed to record service.');
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal animate-slideUp">
        {success ? (
          <div className="empty-state" style={{ padding: '24px' }}>
            <div style={{ fontSize: 56 }}>✅</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--success-light)' }}>Service Recorded!</div>
            <div className="text-sm text-muted">{service.name}</div>
          </div>
        ) : (
          <>
            <h2 className="modal-title">✂️ Record Service</h2>

            {/* Service Info */}
            <div className="product-list" style={{ marginBottom: 20 }}>
              <div className="breakdown-row" style={{ borderBottom: 'none', paddingBottom: 0 }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>{service.name}</span>
                {service.price ? (
                  <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--success-light)' }}>
                    ₹{service.price.toFixed(2)}
                  </span>
                ) : (
                  <span className="tbd-badge">Price not set</span>
                )}
              </div>
              {isOwner && service.cost != null && (
                <div className="text-sm text-muted" style={{ marginTop: 4 }}>
                  Cost: ₹{service.cost.toFixed(2)}
                  {service.price ? ` · Margin: ₹${(service.price - service.cost).toFixed(2)}` : ''}
                </div>
              )}
            </div>

            {service.products && service.products.length > 0 && (
              <div className="form-group">
                <label className="form-label">Products Used</label>
                <div className="product-list">
                  {service.products.map((p, i) => (
                    <div key={i} className="product-item">
                      <span className="product-item-name">{p.name} ({p.quantity})</span>
                      {isOwner && p.cost != null && (
                        <span className="product-item-cost">₹{p.cost.toFixed(2)}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && <div className="login-error">{error}</div>}

            <form onSubmit={handleSubmit}>
              {/* Worker Dropdown */}
              <div className="form-group">
                <label className="form-label">Worker</label>
                {isAddingNew ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input className="form-input" placeholder="Worker name" value={newWorkerName} onChange={e => setNewWorkerName(e.target.value)} autoFocus onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddNewWorker())} />
                    <button type="button" className="btn btn-primary btn-sm" onClick={handleAddNewWorker} disabled={addingWorkerLoading} style={{ whiteSpace: 'nowrap' }}>{addingWorkerLoading ? '…' : '+ Add'}</button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setIsAddingNew(false); setNewWorkerName(''); }} style={{ whiteSpace: 'nowrap' }}>Cancel</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select className="form-input" value={workerName} onChange={e => setWorkerName(e.target.value)} style={{ flex: 1 }}>
                      <option value="">— None / Walk-in —</option>
                      {workers.map(w => (<option key={w.$id} value={w.name}>{w.name}</option>))}
                    </select>
                    {isOwner && (
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setIsAddingNew(true)} title="Add new worker" style={{ whiteSpace: 'nowrap' }}>+ New</button>
                    )}
                  </div>
                )}
              </div>

              {/* Customer Selector (P5 + C1/C2) — owner only */}
              {isOwner && customers.length > 0 && (
                <div className="form-group" style={{ position: 'relative' }}>
                  <label className="form-label">Customer <span className="text-muted" style={{ fontWeight: 400, fontSize: 12 }}>(optional — links to loyalty profile)</span></label>
                  {selectedCustomer ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#A855F715', border: '1px solid #A855F744', borderRadius: 8 }}>
                      <span style={{ fontSize: 18 }}>👤</span>
                      <span style={{ flex: 1, fontWeight: 600 }}>{selectedCustomer.name}</span>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setSelectedCustomer(null); setCustomerSearch(''); }}>✕</button>
                    </div>
                  ) : (
                    <>
                      <input
                        className="form-input"
                        placeholder="Search customer or leave blank for walk-in..."
                        value={customerSearch}
                        onChange={e => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true); }}
                        onFocus={() => setShowCustomerDropdown(true)}
                        onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 150)}
                      />
                      {showCustomerDropdown && customerSearch && filteredCustomers.length > 0 && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
                          {filteredCustomers.map(c => (
                            <div key={c.$id} style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border)' }}
                              onMouseDown={() => { setSelectedCustomer({ id: c.$id, name: c.name }); setCustomerSearch(''); setShowCustomerDropdown(false); }}>
                              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#A855F7,#EC4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14 }}>{c.name[0]}</div>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.visitCount || 0} visits · {c.loyaltyPoints || 0} pts</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Quantity */}
              <div className="form-group">
                <label className="form-label">Quantity</label>
                <div className="flex items-center gap-12">
                  <button type="button" className="btn btn-ghost btn-icon" onClick={() => setQuantity(q => Math.max(1, q - 1))}>−</button>
                  <span style={{ fontSize: 20, fontWeight: 700, minWidth: 32, textAlign: 'center' }}>{quantity}</span>
                  <button type="button" className="btn btn-ghost btn-icon" onClick={() => setQuantity(q => q + 1)}>+</button>
                  {totalPrice && (
                    <span style={{ marginLeft: 'auto', fontSize: 16, fontWeight: 700, color: 'var(--success-light)' }}>
                      Total: ₹{totalPrice}
                    </span>
                  )}
                </div>
                {isOwner && totalCost && (
                  <div className="text-sm text-muted" style={{ marginTop: 6, textAlign: 'right' }}>
                    Cost: ₹{totalCost}{margin ? ` · Margin: ₹${margin}` : ''}
                  </div>
                )}
              </div>

              {/* Tip (P5) */}
              <div className="form-group">
                <label className="form-label">Tip Amount <span className="text-muted" style={{ fontWeight: 400, fontSize: 12 }}>(₹ — optional)</span></label>
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={tip}
                  onChange={e => setTip(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Recording…' : '✓ Confirm Service'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
