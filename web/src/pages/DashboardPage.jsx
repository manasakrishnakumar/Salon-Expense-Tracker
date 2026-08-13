import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useExpenses } from '../context/ExpenseContext';
import { useServices } from '../context/ServicesContext';
import ExpenseModal from '../components/ExpenseModal';

const CAT_COLORS = {
  products: 'var(--cat-products)',
  equipment: 'var(--cat-equipment)',
  utilities: 'var(--cat-utilities)',
  rent: 'var(--cat-rent)',
  salaries: 'var(--cat-salaries)',
  marketing: 'var(--cat-marketing)',
  other: 'var(--cat-other)',
};

const CAT_ICONS = {
  products: '🛍️', equipment: '🔧', utilities: '⚡',
  rent: '🏠', salaries: '👥', marketing: '📢', other: '…',
};

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

export default function DashboardPage({ onNavigate }) {
  const { user } = useAuth();
  const { expenses, deleteExpense, getMonthlyTotal } = useExpenses();
  const { getTodayRevenue, getMonthlyRevenue, getMonthlyServiceCost, getTodayServiceCount } = useServices();
  const [showModal, setShowModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Revenue = what was actually charged (price), not what the products used
  // cost the salon (cost) — see ServicesContext for why these are separate.
  const todayRevenue = getTodayRevenue();
  const monthRevenue = getMonthlyRevenue();
  const monthProductCost = getMonthlyServiceCost();
  const monthExpense = getMonthlyTotal();
  // True gross profit: what customers paid, minus product cost, minus
  // other expenses — not just revenue minus expenses.
  const netProfit = monthRevenue - monthProductCost - monthExpense;
  const todayServices = getTodayServiceCount();

  const handleDelete = async (id) => {
    await deleteExpense(id);
    setConfirmDelete(null);
  };

  const recentExpenses = expenses.slice(0, 8);

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">
              Welcome back, {user?.name?.split(' ')[0] || 'Owner'} 👋
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + Add Expense
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stat-grid">
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #EC4899, #DB2777)' }}>
          <div className="stat-card-header">
            <div>
              <div className="stat-card-label">Today's Revenue</div>
              <div className="stat-card-sub">From services</div>
            </div>
            <div className="stat-card-icon">📈</div>
          </div>
          <div className="stat-card-value">₹{todayRevenue.toLocaleString('en-IN')}</div>
        </div>

        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #A855F7, #7C3AED)' }}>
          <div className="stat-card-header">
            <div>
              <div className="stat-card-label">Month Expenses</div>
              <div className="stat-card-sub">{expenses.length} transactions</div>
            </div>
            <div className="stat-card-icon">📉</div>
          </div>
          <div className="stat-card-value">₹{monthExpense.toLocaleString('en-IN')}</div>
        </div>

        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)' }}>
          <div className="stat-card-header">
            <div>
              <div className="stat-card-label">Monthly Revenue</div>
              <div className="stat-card-sub">All services</div>
            </div>
            <div className="stat-card-icon">💰</div>
          </div>
          <div className="stat-card-value">₹{monthRevenue.toLocaleString('en-IN')}</div>
        </div>

        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
          <div className="stat-card-header">
            <div>
              <div className="stat-card-label">Today's Services</div>
              <div className="stat-card-sub">Recorded today</div>
            </div>
            <div className="stat-card-icon">✂️</div>
          </div>
          <div className="stat-card-value">{todayServices}</div>
        </div>
      </div>

      {/* Net Profit Banner */}
      <div className="profit-banner">
        <div>
          <div className="text-sm text-muted mb-8">Net Profit (This Month)</div>
          <div className={`profit-value ${netProfit >= 0 ? 'positive' : 'negative'}`}>
            {netProfit >= 0 ? '+' : ''}₹{Math.abs(netProfit).toLocaleString('en-IN')}
          </div>
        </div>
        <div
          className="profit-icon"
          style={{
            background: netProfit >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          }}
        >
          {netProfit >= 0 ? '🚀' : '📉'}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="section-label">Quick Actions</div>
      <div className="quick-actions mb-32">
        <div className="quick-action-card" onClick={() => setShowModal(true)}>
          <div className="quick-action-icon" style={{ background: 'rgba(168, 85, 247, 0.15)' }}>➕</div>
          <span className="quick-action-label">Add Expense</span>
        </div>
        <div className="quick-action-card" onClick={() => onNavigate('services')}>
          <div className="quick-action-icon" style={{ background: 'rgba(236, 72, 153, 0.15)' }}>✂️</div>
          <span className="quick-action-label">Add Revenue</span>
        </div>
        <div className="quick-action-card" onClick={() => onNavigate('analysis')}>
          <div className="quick-action-icon" style={{ background: 'rgba(99, 102, 241, 0.15)' }}>📊</div>
          <span className="quick-action-label">View Reports</span>
        </div>
      </div>

      {/* Recent Expenses */}
      <div className="section-label">
        Recent Expenses
        <span className="badge badge-primary">{expenses.length} total</span>
      </div>

      {recentExpenses.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🧾</div>
          <div className="empty-state-title">No expenses yet</div>
          <div className="empty-state-text">Add your first expense to start tracking your salon costs</div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
            + Add Expense
          </button>
        </div>
      ) : (
        <div className="transaction-list">
          {recentExpenses.map(exp => {
            const color = CAT_COLORS[exp.category] || 'var(--primary)';
            const icon = CAT_ICONS[exp.category] || '…';
            return (
              <div key={exp.$id} className="transaction-item">
                <div
                  className="transaction-icon"
                  style={{ background: `${color}18` }}
                >
                  {icon}
                </div>
                <div className="transaction-info">
                  <div className="transaction-name">{exp.name}</div>
                  <div className="transaction-meta">
                    <span className="badge badge-primary" style={{ fontSize: 10 }}>{exp.category}</span>
                    {' · '}{formatDate(exp.date)}
                  </div>
                </div>
                <div className="transaction-right">
                  <div className="transaction-amount" style={{ color: 'var(--danger-light)' }}>
                    −₹{parseFloat(exp.amount).toLocaleString('en-IN')}
                  </div>
                  {confirmDelete === exp.$id ? (
                    <div className="flex gap-8">
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(exp.$id)}>
                        Delete
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(null)}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      className="btn btn-icon"
                      style={{ color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.08)' }}
                      onClick={() => setConfirmDelete(exp.$id)}
                      title="Delete expense"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && <ExpenseModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
