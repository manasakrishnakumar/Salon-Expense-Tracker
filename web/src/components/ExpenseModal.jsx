import React, { useState } from 'react';
import { useExpenses } from '../context/ExpenseContext';

const CATEGORIES = [
  { value: 'products', label: 'Products', icon: '🛍️' },
  { value: 'equipment', label: 'Equipment', icon: '🔧' },
  { value: 'utilities', label: 'Utilities', icon: '⚡' },
  { value: 'rent', label: 'Rent', icon: '🏠' },
  { value: 'salaries', label: 'Salaries', icon: '👥' },
  { value: 'marketing', label: 'Marketing', icon: '📢' },
  { value: 'other', label: 'Other', icon: '…' },
];

const CAT_COLORS = {
  products: 'var(--cat-products)',
  equipment: 'var(--cat-equipment)',
  utilities: 'var(--cat-utilities)',
  rent: 'var(--cat-rent)',
  salaries: 'var(--cat-salaries)',
  marketing: 'var(--cat-marketing)',
  other: 'var(--cat-other)',
};

export default function ExpenseModal({ onClose }) {
  const { addExpense } = useExpenses();
  const [form, setForm] = useState({
    name: '',
    category: 'products',
    amount: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.amount) { setError('Please fill all required fields.'); return; }
    setError('');
    setLoading(true);
    const result = await addExpense(form);
    setLoading(false);
    if (result.success) onClose();
    else setError(result.error || 'Failed to add expense.');
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal animate-slideUp">
        <h2 className="modal-title">💸 Add Expense</h2>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Expense Name *</label>
            <input
              className="form-input"
              placeholder="e.g., Hair Products Restock"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Amount (₹) *</label>
            <input
              className="form-input"
              type="number"
              placeholder="0.00"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={e => setForm({ ...form, amount: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Date</label>
            <input
              className="form-input"
              type="date"
              value={form.date}
              onChange={e => setForm({ ...form, date: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Category</label>
            <div className="category-grid">
              {CATEGORIES.map(cat => {
                const isActive = form.category === cat.value;
                const color = CAT_COLORS[cat.value];
                return (
                  <button
                    type="button"
                    key={cat.value}
                    className={`category-chip ${isActive ? 'active' : ''}`}
                    style={isActive ? {
                      backgroundColor: `${color}18`,
                      borderColor: color,
                      color: color,
                    } : {}}
                    onClick={() => setForm({ ...form, category: cat.value })}
                  >
                    {cat.icon} {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Adding…' : '✓ Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
