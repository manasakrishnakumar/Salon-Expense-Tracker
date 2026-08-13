import React, { useState } from 'react';
import { useStock } from '../context/StockContext';

export default function RestockModal({ prefillProduct, onClose }) {
  const { addRestock, products } = useStock();
  const [form, setForm] = useState({
    productName: prefillProduct || '',
    quantityAdded: '',
    purchasePrice: '',
    supplier: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const selectedProduct = products.find(p => p.name === form.productName);
  const unit = selectedProduct ? selectedProduct.unit : 'g';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.productName || !form.quantityAdded) {
      setError('Please select a product and enter quantity.');
      return;
    }
    setLoading(true);
    setError('');
    const result = await addRestock(Object.assign({}, form, { unit }));
    setLoading(false);
    if (result.success) {
      setSuccess(true);
      setTimeout(onClose, 1400);
    } else {
      setError(result.error || 'Failed to save restock.');
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal animate-slideUp">
        {success ? (
          <div className="empty-state" style={{ padding: '24px' }}>
            <div style={{ fontSize: 56 }}>📦</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--success-light)' }}>Stock Updated!</div>
            <div className="text-sm text-muted">{form.productName} restocked</div>
          </div>
        ) : (
          <>
            <h2 className="modal-title">📦 Restock Product</h2>
            {error && <div className="login-error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Product *</label>
                <select
                  className="form-input"
                  value={form.productName}
                  onChange={e => setForm(Object.assign({}, form, { productName: e.target.value }))}
                  required
                >
                  <option value="">Select a product...</option>
                  {products.map(p => (
                    <option key={p.name} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Qty Added ({unit}) *</label>
                  <input
                    className="form-input"
                    type="number"
                    min="1"
                    step="0.1"
                    placeholder="e.g. 500"
                    value={form.quantityAdded}
                    onChange={e => setForm(Object.assign({}, form, { quantityAdded: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Price (Rs.)</label>
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={form.purchasePrice}
                    onChange={e => setForm(Object.assign({}, form, { purchasePrice: e.target.value }))}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Supplier (optional)</label>
                <input
                  className="form-input"
                  placeholder="e.g. ABC Distributors"
                  value={form.supplier}
                  onChange={e => setForm(Object.assign({}, form, { supplier: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input
                  className="form-input"
                  type="date"
                  value={form.date}
                  onChange={e => setForm(Object.assign({}, form, { date: e.target.value }))}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Restock'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
