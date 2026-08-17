import React, { useState, useMemo, useEffect } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line,
} from 'recharts';
import { useExpenses } from '../context/ExpenseContext';
import { useServices } from '../context/ServicesContext';
import { useWorkers } from '../context/WorkersContext';
import { apiGet, apiPost, apiDownload } from '../lib/api';

/* ─── Colour palettes ──────────────────────────────────── */
const CHART_COLORS = [
  '#A855F7','#EC4899','#10B981','#F59E0B','#6366F1',
  '#F472B6','#34D399','#FBBF24','#8B5CF6','#DB2777',
  '#059669','#D97706','#7C3AED','#BE185D',
];
const CAT_COLORS = {
  products:'#A855F7', equipment:'#EC4899', utilities:'#10B981',
  rent:'#F59E0B', salaries:'#F472B6', marketing:'#6366F1', other:'#8B5CF6',
};
const SCAT_COLORS = {
  facials:'#EC4899', cleanups:'#A855F7', pedicure_manicure:'#10B981',
  hair_services:'#F59E0B', other:'#6366F1',
};
const RANK_COLORS = ['#F59E0B','#9CA3AF','#CD7F32'];

/* ─── Helpers ──────────────────────────────────────────── */
function fmtINR(v) { return 'Rs.' + Number(v).toLocaleString('en-IN'); }

function getDateBounds(preset, customFrom, customTo) {
  const today = new Date();
  const iso = d => d.toISOString().split('T')[0];
  const startOf = d => { const x = new Date(d); x.setDate(1); return x; };
  switch (preset) {
    case 'today':
      return { from: iso(today), to: iso(today) };
    case '7d': {
      const d = new Date(today); d.setDate(d.getDate() - 6);
      return { from: iso(d), to: iso(today) };
    }
    case '30d': {
      const d = new Date(today); d.setDate(d.getDate() - 29);
      return { from: iso(d), to: iso(today) };
    }
    case 'thisMonth': {
      const s = startOf(today);
      return { from: iso(s), to: iso(today) };
    }
    case 'lastMonth': {
      const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const last  = new Date(today.getFullYear(), today.getMonth(), 0);
      return { from: iso(first), to: iso(last) };
    }
    case 'custom':
      return { from: customFrom, to: customTo };
    default:
      return { from: iso(startOf(today)), to: iso(today) };
  }
}

function inRange(dateStr, from, to) {
  if (!dateStr) return false;
  const d = dateStr.split('T')[0];
  return d >= from && d <= to;
}

/* ─── Custom tooltip ───────────────────────────────────── */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{
      background:'var(--bg-card)', border:'1px solid var(--border)',
      borderRadius:12, padding:'10px 16px', fontSize:13,
    }}>
      {label && <div style={{ color:'var(--text-muted)', marginBottom:4 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color:p.color || 'var(--text)', fontWeight:600 }}>
          {p.name}: {fmtINR(p.value)}
        </div>
      ))}
    </div>
  );
}

/* ─── Date-range selector ──────────────────────────────── */
const PRESETS = [
  { key:'today',     label:'Today'      },
  { key:'7d',        label:'Last 7 days'},
  { key:'30d',       label:'Last 30 days'},
  { key:'thisMonth', label:'This Month' },
  { key:'lastMonth', label:'Last Month' },
  { key:'custom',    label:'Custom'     },
];

function DateRangeSelector({ preset, setPreset, customFrom, setCustomFrom, customTo, setCustomTo }) {
  return (
    <div className="date-range-bar">
      <div className="date-range-presets">
        {PRESETS.map(p => (
          <button
            key={p.key}
            className={'date-preset-btn' + (preset === p.key ? ' active' : '')}
            onClick={() => setPreset(p.key)}
          >{p.label}</button>
        ))}
      </div>
      {preset === 'custom' && (
        <div className="date-range-custom">
          <input
            type="date" className="form-input"
            style={{ width:150 }}
            value={customFrom}
            onChange={e => setCustomFrom(e.target.value)}
          />
          <span style={{ color:'var(--text-muted)', padding:'0 8px' }}>to</span>
          <input
            type="date" className="form-input"
            style={{ width:150 }}
            value={customTo}
            onChange={e => setCustomTo(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════ */
/*  MAIN PAGE                                             */
/* ═══════════════════════════════════════════════════════ */
export default function AnalysisPage() {
  const { expenses }       = useExpenses();
  const { serviceRecords } = useServices();
  const { workers }        = useWorkers();

  /* tabs: overview | revenue | expenses | workers | services | monthly | forecast | pl */
  const [activeTab, setActiveTab]   = useState('overview');
  const [preset, setPreset]         = useState('thisMonth');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo]     = useState('');

  /* sort state for services table */
  const [sortBy, setSortBy]         = useState('revenue');
  const [catFilter, setCatFilter]   = useState('all');

  /* P&L data (A4) */
  const [plData, setPlData]         = useState(null);
  const [plLoading, setPlLoading]   = useState(false);
  const [plError, setPlError]       = useState('');

  /* Daily summary sending (A2) */
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryMsg, setSummaryMsg]         = useState('');

  /* ── Forecast (server-side: backend/src/logic/forecast.js) ──── */
  const [forecastData, setForecastData]       = useState(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError, setForecastError]     = useState('');

  useEffect(() => {
    if (activeTab !== 'forecast' || forecastData || forecastLoading) return;
    setForecastLoading(true);
    setForecastError('');
    apiGet('/api/reports/forecast')
      .then(setForecastData)
      .catch(err => setForecastError(err.message || 'Failed to load forecast.'))
      .finally(() => setForecastLoading(false));
  }, [activeTab, forecastData, forecastLoading]);

  /* ── Date bounds ─────────────────────────────── */
  const { from, to } = useMemo(
    () => getDateBounds(preset, customFrom, customTo),
    [preset, customFrom, customTo]
  );

  /* Load P&L when tab is opened — must be AFTER from/to are defined */
  useEffect(() => {
    if (activeTab !== 'pl') return;
    setPlLoading(true);
    setPlError('');
    apiGet(`/api/reports/profit-loss?from=${from}&to=${to}`)
      .then(setPlData)
      .catch(err => setPlError(err.message || 'Failed to load P&L'))
      .finally(() => setPlLoading(false));
  }, [activeTab, from, to]);

  /* ── Filtered records ────────────────────────── */
  const filteredServices = useMemo(
    () => serviceRecords.filter(r => inRange(r.Date, from, to)),
    [serviceRecords, from, to]
  );
  const filteredExpenses = useMemo(
    () => expenses.filter(e => inRange(e.date, from, to)),
    [expenses, from, to]
  );

  /* ── KPI summary ─────────────────────────────── */
  // Revenue = what was actually charged (totalPrice, server-computed from
  // the owner's price list). Product Cost = what the products used cost
  // the salon (totalCost). These are different numbers on purpose — see
  // logic/pricing.js on the backend for why they used to be conflated.
  const totalRevenue     = filteredServices.reduce((s, r) => s + (r.totalPrice || 0), 0);
  const totalProductCost = filteredServices.reduce((s, r) => s + (r.totalCost || 0), 0);
  const totalExpense     = filteredExpenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
  const netProfit        = totalRevenue - totalProductCost - totalExpense;
  const profitMargin     = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0;

  /* ── Revenue by service category (pie) ─────── */
  const revenueByCategory = useMemo(() => {
    const data = {};
    filteredServices.forEach(r => {
      const cat = r.category || 'other';
      data[cat] = (data[cat] || 0) + (r.totalPrice || 0);
    });
    return Object.entries(data)
      .map(([name, value], i) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1).replace('_',' '),
        value: Math.round(value),
        fill: CHART_COLORS[i % CHART_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredServices]);

  /* ── Expenses by category (bar) ─────────────── */
  const expensesByCategory = useMemo(() => {
    const data = {};
    filteredExpenses.forEach(e => {
      const cat = e.category || 'other';
      data[cat] = (data[cat] || 0) + parseFloat(e.amount);
    });
    return Object.entries(data)
      .map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value: Math.round(value),
        fill: CAT_COLORS[name] || '#8B5CF6',
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredExpenses]);

  /* ── Trend: daily within range ───────────────── */
  const trendData = useMemo(() => {
    const days = [];
    const start = new Date(from);
    const end   = new Date(to);
    const diffMs = end - start;
    const diffDays = Math.round(diffMs / 86400000) + 1;
    const maxPoints = 30;
    const step = diffDays <= maxPoints ? 1 : Math.ceil(diffDays / maxPoints);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + step)) {
      const dayStr = d.toISOString().split('T')[0];
      const endDay = new Date(d);
      endDay.setDate(endDay.getDate() + step - 1);
      const endStr = endDay > end ? to : endDay.toISOString().split('T')[0];

      const dayRecords = serviceRecords
        .filter(r => r.Date && r.Date.split('T')[0] >= dayStr && r.Date.split('T')[0] <= endStr);
      const rev = dayRecords.reduce((s, r) => s + (r.totalPrice || 0), 0);
      const cost = dayRecords.reduce((s, r) => s + (r.totalCost || 0), 0);
      const exp = expenses
        .filter(e => e.date >= dayStr && e.date <= endStr)
        .reduce((s, e) => s + parseFloat(e.amount || 0), 0);

      const label = step === 1
        ? d.getDate() + '/' + (d.getMonth() + 1)
        : d.getDate() + '/' + (d.getMonth() + 1) + '-' + endDay.getDate() + '/' + (endDay.getMonth() + 1);

      days.push({ date: label, Revenue: Math.round(rev), Cost: Math.round(cost), Expense: Math.round(exp) });
    }
    return days;
  }, [serviceRecords, expenses, from, to]);

  /* ── Workers data ────────────────────────────── */
  const workersData = useMemo(() => {
    const map = {};
    filteredServices.forEach(r => {
      const name = r.WorkerName || '(Unassigned)';
      if (!map[name]) map[name] = { name, revenue: 0, count: 0 };
      map[name].revenue += r.totalPrice || 0;
      map[name].count   += 1;
    });
    return Object.values(map)
      .map(w => ({ ...w, avg: w.count ? Math.round(w.revenue / w.count) : 0 }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [filteredServices]);

  /* ── Services data ───────────────────────────── */
  const servicesData = useMemo(() => {
    const map = {};
    filteredServices.forEach(r => {
      const k = r.serviceName || 'Unknown';
      if (!map[k]) map[k] = { name: k, category: r.category || 'other', revenue: 0, count: 0 };
      map[k].revenue += r.totalPrice || 0;
      map[k].count   += 1;
    });
    const arr = Object.values(map).map(s => ({ ...s, avg: s.count ? Math.round(s.revenue / s.count) : 0 }));
    const filtered = catFilter === 'all' ? arr : arr.filter(s => s.category === catFilter);
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'revenue') return b.revenue - a.revenue;
      if (sortBy === 'count')   return b.count - a.count;
      return b.avg - a.avg;
    });
    return sorted;
  }, [filteredServices, sortBy, catFilter]);

  /* ── Monthly data (last 6 months, no range filter) ── */
  const monthlyData = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d     = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year  = d.getFullYear();
      const month = d.getMonth();
      const label = d.toLocaleString('en-IN', { month:'short', year:'2-digit' });

      const monthRecords = serviceRecords.filter(r => {
        const x = new Date(r.Date); return x.getFullYear() === year && x.getMonth() === month;
      });
      const rev = monthRecords.reduce((s, r) => s + (r.totalPrice || 0), 0);
      const cost = monthRecords.reduce((s, r) => s + (r.totalCost || 0), 0);
      const exp = expenses
        .filter(e => { const x = new Date(e.date); return x.getFullYear() === year && x.getMonth() === month; })
        .reduce((s, e) => s + parseFloat(e.amount || 0), 0);

      months.push({
        label, revenue: Math.round(rev), cost: Math.round(cost), expense: Math.round(exp),
        profit: Math.round(rev - cost - exp), services: monthRecords.length,
      });
    }
    return months;
  }, [serviceRecords, expenses]);

  /* ── CSV Export (A1) — now via backend endpoint ─ */
  const handleExportCSV = async () => {
    try {
      await apiDownload(
        `/api/reports/export?from=${from}&to=${to}`,
        `salon-report-${from}-to-${to}.csv`
      );
    } catch (err) {
      alert('Export failed: ' + err.message);
    }
  };

  /* ── Daily Summary Email (A2) ────────────────── */
  const handleSendSummary = async () => {
    setSummaryLoading(true);
    setSummaryMsg('');
    try {
      const res = await apiPost('/api/reports/send-daily-summary', {});
      setSummaryMsg(`✅ Summary sent to ${res.sentTo}`);
    } catch (err) {
      setSummaryMsg('❌ Failed: ' + err.message);
    } finally {
      setSummaryLoading(false);
      setTimeout(() => setSummaryMsg(''), 5000);
    }
  };

  /* ── Shared axis style ───────────────────────── */
  const axisStyle = { fill:'var(--text-muted)', fontSize:11 };

  /* ════════════════════════════════════════════════ */
  /*  RENDER BLOCKS                                  */
  /* ════════════════════════════════════════════════ */

  const renderKPIs = () => (
    <div className="stat-grid" style={{ marginBottom:24 }}>
      <div className="stat-card" style={{ background:'linear-gradient(135deg,#10B981,#059669)' }}>
        <div className="stat-card-header">
          <div><div className="stat-card-label">Revenue</div><div className="stat-card-sub">{filteredServices.length} services</div></div>
          <div className="stat-card-icon">💰</div>
        </div>
        <div className="stat-card-value">{fmtINR(totalRevenue)}</div>
      </div>
      <div className="stat-card" style={{ background:'linear-gradient(135deg,#EF4444,#DC2626)' }}>
        <div className="stat-card-header">
          <div><div className="stat-card-label">Expenses</div><div className="stat-card-sub">{filteredExpenses.length} entries</div></div>
          <div className="stat-card-icon">📉</div>
        </div>
        <div className="stat-card-value">{fmtINR(totalExpense)}</div>
      </div>
      <div className="stat-card" style={{ background: netProfit >= 0 ? 'linear-gradient(135deg,#A855F7,#7C3AED)' : 'linear-gradient(135deg,#F59E0B,#D97706)' }}>
        <div className="stat-card-header">
          <div>
            <div className="stat-card-label">Net Profit</div>
            <div className="stat-card-sub">Margin: {profitMargin}%</div>
          </div>
          <div className="stat-card-icon">{netProfit >= 0 ? '🚀' : '⚠️'}</div>
        </div>
        <div className="stat-card-value">{netProfit >= 0 ? '+' : ''}{fmtINR(netProfit)}</div>
      </div>
      <div className="stat-card" style={{ background:'linear-gradient(135deg,#EC4899,#DB2777)' }}>
        <div className="stat-card-header">
          <div><div className="stat-card-label">Product Cost</div><div className="stat-card-sub">COGS this period</div></div>
          <div className="stat-card-icon">🧴</div>
        </div>
        <div className="stat-card-value">{fmtINR(totalProductCost)}</div>
      </div>
    </div>
  );

  const renderTrend = () => (
    <div className="chart-card">
      <div className="chart-title">📅 Revenue vs Cost vs Expense — {from === to ? from : from + ' → ' + to}</div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={trendData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(168,85,247,0.1)" />
          <XAxis dataKey="date" tick={axisStyle} />
          <YAxis tick={axisStyle} tickFormatter={v => 'Rs.' + v} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize:13, color:'var(--text-secondary)' }} />
          <Line type="monotone" dataKey="Revenue" stroke="#10B981" strokeWidth={2.5} dot={{ r:3 }} />
          <Line type="monotone" dataKey="Cost" stroke="#F59E0B" strokeWidth={2} dot={{ r:2 }} />
          <Line type="monotone" dataKey="Expense" stroke="#EF4444" strokeWidth={2.5} dot={{ r:3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );

  const renderRevenuePie = () => (
    <div className="chart-card">
      <div className="chart-title">🍩 Revenue by Category</div>
      {revenueByCategory.length === 0 ? (
        <div className="empty-state" style={{ padding:'40px 0' }}>
          <div className="empty-state-icon">📊</div>
          <div className="empty-state-title">No revenue data</div>
          <div className="empty-state-text">Record services to see revenue breakdown</div>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={revenueByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%"
                outerRadius={90} innerRadius={45} paddingAngle={3}>
                {revenueByCategory.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="breakdown-list">
            {revenueByCategory.map((item, i) => (
              <div key={i} className="breakdown-row">
                <div className="flex items-center gap-8">
                  <div className="legend-dot" style={{ background:item.fill }} />
                  <span>{item.name}</span>
                </div>
                <span style={{ fontWeight:700, color:item.fill }}>{fmtINR(item.value)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );

  const renderExpenseBar = () => (
    <div className="chart-card">
      <div className="chart-title">📊 Expense Breakdown</div>
      {expensesByCategory.length === 0 ? (
        <div className="empty-state" style={{ padding:'40px 0' }}>
          <div className="empty-state-icon">💸</div>
          <div className="empty-state-title">No expense data</div>
          <div className="empty-state-text">Add expenses to see the breakdown</div>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={expensesByCategory}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(168,85,247,0.1)" />
              <XAxis dataKey="name" tick={axisStyle} />
              <YAxis tick={axisStyle} tickFormatter={v => 'Rs.' + v} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[6,6,0,0]}>
                {expensesByCategory.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="breakdown-list">
            {expensesByCategory.map((item, i) => (
              <div key={i} className="breakdown-row">
                <div className="flex items-center gap-8">
                  <div className="legend-dot" style={{ background:item.fill }} />
                  <span>{item.name}</span>
                </div>
                <span style={{ fontWeight:700, color:'var(--danger-light)' }}>-{fmtINR(item.value)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );

  /* ── Workers tab ─────────────────────────────── */
  const renderWorkers = () => (
    <div>
      {workersData.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👥</div>
          <div className="empty-state-title">No worker data for this period</div>
          <div className="empty-state-text">Record services with worker names to see performance</div>
        </div>
      ) : (
        <>
          <div className="chart-card">
            <div className="chart-title">👥 Revenue per Worker</div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={workersData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(168,85,247,0.1)" />
                <XAxis type="number" tick={axisStyle} tickFormatter={v => 'Rs.' + v} />
                <YAxis type="category" dataKey="name" tick={axisStyle} width={90} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" name="Revenue" radius={[0,6,6,0]}>
                  {workersData.map((_, i) => (
                    <Cell key={i} fill={i < 3 ? RANK_COLORS[i] : '#8B5CF6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <div className="chart-title">🏆 Worker Leaderboard</div>
            <div className="report-table-wrap">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Worker</th>
                    <th>Services</th>
                    <th>Total Revenue</th>
                    <th>Avg / Service</th>
                  </tr>
                </thead>
                <tbody>
                  {workersData.map((w, i) => (
                    <tr key={w.name} className={i < 3 ? 'rank-row' : ''}>
                      <td>
                        <span className="rank-badge" style={{ background: i < 3 ? RANK_COLORS[i] : 'var(--bg-glass)' }}>
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                        </span>
                      </td>
                      <td style={{ fontWeight:700 }}>{w.name}</td>
                      <td>{w.count}</td>
                      <td style={{ color:'#10B981', fontWeight:700 }}>{fmtINR(w.revenue)}</td>
                      <td style={{ color:'var(--text-muted)' }}>{fmtINR(w.avg)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );

  /* ── Services tab ────────────────────────────── */
  const serviceCats = useMemo(() => {
    const cats = new Set(filteredServices.map(r => r.category || 'other'));
    return ['all', ...Array.from(cats)];
  }, [filteredServices]);

  const renderServices = () => (
    <div>
      {/* Sort controls */}
      <div style={{ display:'flex', gap:12, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
        <span style={{ fontSize:13, color:'var(--text-muted)', fontWeight:600 }}>Sort by:</span>
        {[
          { key:'revenue', label:'Revenue' },
          { key:'count',   label:'Times Done' },
          { key:'avg',     label:'Avg Cost' },
        ].map(s => (
          <button
            key={s.key}
            className={'date-preset-btn' + (sortBy === s.key ? ' active' : '')}
            onClick={() => setSortBy(s.key)}
          >{s.label}</button>
        ))}
        <span style={{ fontSize:13, color:'var(--text-muted)', fontWeight:600, marginLeft:12 }}>Category:</span>
        {serviceCats.map(cat => (
          <button
            key={cat}
            className={'date-preset-btn' + (catFilter === cat ? ' active' : '')}
            onClick={() => setCatFilter(cat)}
          >
            {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1).replace('_',' ')}
          </button>
        ))}
      </div>

      {servicesData.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">✂️</div>
          <div className="empty-state-title">No services recorded for this period</div>
        </div>
      ) : (
        <div className="chart-card">
          <div className="chart-title">💅 Most Profitable Services</div>
          <div className="report-table-wrap">
            <table className="report-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Service</th>
                  <th>Category</th>
                  <th>Times Done</th>
                  <th>Total Revenue</th>
                  <th>Avg / Service</th>
                </tr>
              </thead>
              <tbody>
                {servicesData.map((s, i) => (
                  <tr key={s.name} className={i < 3 ? 'rank-row' : ''}>
                    <td>
                      <span className="rank-badge" style={{ background: i < 3 ? RANK_COLORS[i] : 'var(--bg-glass)' }}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                      </span>
                    </td>
                    <td style={{ fontWeight:700, fontSize:13 }}>{s.name}</td>
                    <td>
                      <span style={{
                        fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99,
                        background:(SCAT_COLORS[s.category] || '#8B5CF6') + '22',
                        color: SCAT_COLORS[s.category] || '#8B5CF6',
                      }}>
                        {s.category.replace('_',' ')}
                      </span>
                    </td>
                    <td style={{ color:'#A855F7', fontWeight:700 }}>{s.count}x</td>
                    <td style={{ color:'#10B981', fontWeight:700 }}>{fmtINR(s.revenue)}</td>
                    <td style={{ color:'var(--text-muted)' }}>{fmtINR(s.avg)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  /* ── Monthly tab ─────────────────────────────── */
  const bestMonth = useMemo(() =>
    monthlyData.reduce((best, m) => m.revenue > best.revenue ? m : best, { revenue:-1, label:'' }),
    [monthlyData]
  );

  const latestGrowth = useMemo(() => {
    if (monthlyData.length < 2) return null;
    const cur = monthlyData[monthlyData.length - 1];
    const prev = monthlyData[monthlyData.length - 2];
    if (!prev.revenue) return null;
    return (((cur.revenue - prev.revenue) / prev.revenue) * 100).toFixed(1);
  }, [monthlyData]);

  const renderMonthly = () => (
    <div>
      {/* Highlights */}
      <div style={{ display:'flex', gap:12, marginBottom:24, flexWrap:'wrap' }}>
        {bestMonth.label && (
          <div style={{
            flex:1, minWidth:160, padding:'16px 20px', borderRadius:'var(--radius-lg)',
            background:'linear-gradient(135deg,#F59E0B,#D97706)', color:'#fff',
          }}>
            <div style={{ fontSize:11, fontWeight:700, opacity:0.8, textTransform:'uppercase', letterSpacing:1 }}>Best Month</div>
            <div style={{ fontSize:20, fontWeight:800, marginTop:4 }}>{bestMonth.label}</div>
            <div style={{ fontSize:13, opacity:0.9 }}>{fmtINR(bestMonth.revenue)}</div>
          </div>
        )}
        {latestGrowth !== null && (
          <div style={{
            flex:1, minWidth:160, padding:'16px 20px', borderRadius:'var(--radius-lg)',
            background: parseFloat(latestGrowth) >= 0 ? 'linear-gradient(135deg,#10B981,#059669)' : 'linear-gradient(135deg,#EF4444,#DC2626)',
            color:'#fff',
          }}>
            <div style={{ fontSize:11, fontWeight:700, opacity:0.8, textTransform:'uppercase', letterSpacing:1 }}>MoM Growth</div>
            <div style={{ fontSize:28, fontWeight:800, marginTop:4 }}>
              {parseFloat(latestGrowth) >= 0 ? '+' : ''}{latestGrowth}%
            </div>
            <div style={{ fontSize:12, opacity:0.8 }}>vs previous month</div>
          </div>
        )}
        <div style={{ flex:1, minWidth:160, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <button className="btn btn-primary" onClick={handleExportCSV} style={{ gap:8 }}>
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="chart-card">
        <div className="chart-title">📅 6-Month Revenue vs Cost vs Expense</div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(168,85,247,0.1)" />
            <XAxis dataKey="label" tick={axisStyle} />
            <YAxis tick={axisStyle} tickFormatter={v => 'Rs.' + v} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize:13, color:'var(--text-secondary)' }} />
            <Bar dataKey="revenue" name="Revenue" fill="#10B981" radius={[4,4,0,0]} />
            <Bar dataKey="cost" name="Product Cost" fill="#F59E0B" radius={[4,4,0,0]} />
            <Bar dataKey="expense" name="Expense" fill="#EF4444" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary table */}
      <div className="chart-card">
        <div className="chart-title">📋 Monthly Summary</div>
        <div className="report-table-wrap">
          <table className="report-table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Revenue</th>
                <th>Product Cost</th>
                <th>Expense</th>
                <th>Net Profit</th>
                <th>Services</th>
              </tr>
            </thead>
            <tbody>
              {[...monthlyData].reverse().map(m => (
                <tr key={m.label} className={m.label === bestMonth.label ? 'rank-row' : ''}>
                  <td style={{ fontWeight:700 }}>
                    {m.label}
                    {m.label === bestMonth.label && (
                      <span style={{ marginLeft:8, fontSize:10, color:'#F59E0B', fontWeight:700 }}>★ BEST</span>
                    )}
                  </td>
                  <td style={{ color:'#10B981', fontWeight:700 }}>{fmtINR(m.revenue)}</td>
                  <td style={{ color:'#F59E0B' }}>{fmtINR(m.cost)}</td>
                  <td style={{ color:'#EF4444' }}>{fmtINR(m.expense)}</td>
                  <td style={{ color: m.profit >= 0 ? '#10B981' : '#EF4444', fontWeight:700 }}>
                    {m.profit >= 0 ? '+' : ''}{fmtINR(m.profit)}
                  </td>
                  <td style={{ color:'var(--text-muted)' }}>{m.services}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  /* ── Forecast tab ────────────────────────────────── */
  const renderForecast = () => {
    if (forecastLoading) {
      return <div className="empty-state"><div className="spinner" /></div>;
    }
    if (forecastError) {
      return <div className="login-error">{forecastError}</div>;
    }
    if (!forecastData) return null;

    const { expenseForecast, serviceCostForecast, stockRunout } = forecastData;

    const expenseChartData = [
      ...expenseForecast.history.map(h => ({ label: h.month, actual: h.total })),
      { label: 'Next month', predicted: expenseForecast.predictedNextMonth },
    ];

    const urgencyColor = (days) => (days <= 7 ? '#EF4444' : days <= 30 ? '#F59E0B' : '#10B981');

    return (
      <div>
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <div style={{
            flex: 1, minWidth: 200, padding: '16px 20px', borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(135deg,#EF4444,#DC2626)', color: '#fff',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.8, textTransform: 'uppercase', letterSpacing: 1 }}>
              Predicted Next Month Expense
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{fmtINR(expenseForecast.predictedNextMonth)}</div>
            <div style={{ fontSize: 11, opacity: 0.85 }}>method: {expenseForecast.method}</div>
          </div>
          <div style={{
            flex: 1, minWidth: 200, padding: '16px 20px', borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(135deg,#A855F7,#7C3AED)', color: '#fff',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.8, textTransform: 'uppercase', letterSpacing: 1 }}>
              Predicted Next Month Product Cost
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{fmtINR(serviceCostForecast.predictedNextMonth)}</div>
            <div style={{ fontSize: 11, opacity: 0.85 }}>method: {serviceCostForecast.method}</div>
          </div>
        </div>

        <div className="chart-card" style={{ marginBottom: 24 }}>
          <div className="chart-title">📈 Expense Trend + Next Month Projection</div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={expenseChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(168,85,247,0.1)" />
              <XAxis dataKey="label" tick={axisStyle} />
              <YAxis tick={axisStyle} tickFormatter={v => 'Rs.' + v} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 13, color: 'var(--text-secondary)' }} />
              <Line type="monotone" dataKey="actual" name="Actual" stroke="#A855F7" strokeWidth={2} dot />
              <Line type="monotone" dataKey="predicted" name="Predicted" stroke="#EF4444" strokeWidth={2} strokeDasharray="6 4" dot />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-title">⏳ Stock Runout Forecast (by recent usage rate)</div>
          {stockRunout.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📦</div>
              <div className="empty-state-title">Not enough recent usage data yet</div>
              <div className="empty-state-text">Record a few more services to see runout predictions</div>
            </div>
          ) : (
            <div className="report-table-wrap">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Remaining</th>
                    <th>Daily Usage</th>
                    <th>Trend</th>
                    <th>Days Until Empty</th>
                  </tr>
                </thead>
                <tbody>
                  {stockRunout.map(p => (
                    <tr key={p.name}>
                      <td style={{ fontWeight: 700 }}>{p.name}</td>
                      <td>{p.remaining}{p.unit}</td>
                      <td>{p.dailyConsumptionRate}{p.unit}/day</td>
                      <td>
                        {p.trendPercent ? (
                          <span style={{ color: p.trendPercent > 0 ? '#F59E0B' : '#10B981', fontWeight: 700, fontSize: 13 }}>
                            {p.trendPercent > 0 ? '↑' : '↓'} {Math.abs(p.trendPercent)}%
                          </span>
                        ) : <span className="text-muted">—</span>}
                      </td>
                      <td>
                        <span style={{ color: urgencyColor(p.daysUntilEmpty), fontWeight: 800 }}>
                          {p.daysUntilEmpty} days
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  /* ════════════════════════════════════════════════ */
  /* P&L Render (A4) */
  const renderProfitLoss = () => {
    if (plLoading) return <div className="empty-state"><div className="spinner" /></div>;
    if (plError) return <div className="empty-state"><div className="empty-state-icon">⚠️</div><div className="empty-state-title">Failed to load P&L</div><div className="empty-state-text">{plError}</div></div>;
    if (!plData) return <div className="empty-state"><div className="empty-state-text">No P&L data</div></div>;
    const { revenue, stockCost, otherExpenses, tips, grossProfit, netProfit, monthlyBreakdown = [], workerPerformance = [] } = plData;
    const profitColor = netProfit >= 0 ? '#10B981' : '#EF4444';
    return (
      <>
        <div className="stat-grid" style={{ marginBottom: 24 }}>
          {[
            { label: 'Revenue', value: fmtINR(revenue), icon: '💰', bg: 'linear-gradient(135deg,#10B981,#059669)' },
            { label: 'Tips', value: fmtINR(tips), icon: '🎁', bg: 'linear-gradient(135deg,#EC4899,#BE185D)' },
            { label: 'Stock Cost', value: fmtINR(stockCost), icon: '🧴', bg: 'linear-gradient(135deg,#F59E0B,#D97706)' },
            { label: 'Other Expenses', value: fmtINR(otherExpenses), icon: '📋', bg: 'linear-gradient(135deg,#EF4444,#DC2626)' },
            { label: 'Gross Profit', value: fmtINR(grossProfit), icon: '📈', bg: 'linear-gradient(135deg,#6366F1,#4F46E5)' },
            { label: 'Net Profit', value: (netProfit >= 0 ? '+' : '') + fmtINR(netProfit), icon: netProfit >= 0 ? '🚀' : '⚠️', bg: `linear-gradient(135deg,${profitColor},${profitColor}99)` },
          ].map(s => (
            <div key={s.label} className="stat-card" style={{ background: s.bg }}>
              <div className="stat-card-header"><div><div className="stat-card-label">{s.label}</div></div><div className="stat-card-icon">{s.icon}</div></div>
              <div className="stat-card-value" style={{ fontSize: 22 }}>{s.value}</div>
            </div>
          ))}
        </div>
        {monthlyBreakdown.length > 0 && (
          <div className="chart-card" style={{ marginBottom: 24 }}>
            <div className="chart-title">📅 Monthly Profit & Loss</div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyBreakdown.map(m => ({ month: m.month, Revenue: Math.round(m.revenue), 'Stock Cost': Math.round(m.stockCost), 'Other Exp': Math.round(m.otherExpenses), 'Net Profit': Math.round(m.netProfit) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(168,85,247,0.1)" />
                <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={v => 'Rs.' + v} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 13 }} />
                <Bar dataKey="Revenue" fill="#10B981" radius={[4,4,0,0]} />
                <Bar dataKey="Stock Cost" fill="#F59E0B" radius={[4,4,0,0]} />
                <Bar dataKey="Other Exp" fill="#EF4444" radius={[4,4,0,0]} />
                <Bar dataKey="Net Profit" fill="#A855F7" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {workerPerformance.length > 0 && (
          <div className="chart-card">
            <div className="chart-title">👥 Worker Revenue Contribution</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {workerPerformance.map((w, i) => (
                <div key={w.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ width: 28, fontWeight: 800, color: i < 3 ? ['#F59E0B','#9CA3AF','#CD7F32'][i] : 'var(--text-muted)', fontSize: 13 }}>#{i+1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700 }}>{w.name}</div>
                    <div className="text-sm text-muted">{w.services} services · Tips: {fmtINR(w.tips)}</div>
                  </div>
                  <div style={{ fontWeight: 800, color: '#10B981', fontSize: 16 }}>{fmtINR(w.revenue)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    );
  };

  /* ════════════════════════════════════════════════ */
  const TABS = [
    { key:'overview',  label:'Overview' },
    { key:'revenue',   label:'Revenue'  },
    { key:'expenses',  label:'Expenses' },
    { key:'workers',   label:'Workers'  },
    { key:'services',  label:'Services' },
    { key:'monthly',   label:'Monthly'  },
    { key:'forecast',  label:'Forecast' },
    { key:'pl',        label:'📈 P&L'   },
  ];

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Analysis</h1>
            <p className="page-subtitle">Financial insights, P&L, and trends for your salon</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {summaryMsg && <span style={{ fontSize: 12, color: summaryMsg.startsWith('✅') ? '#10B981' : '#EF4444' }}>{summaryMsg}</span>}
            <button className="btn btn-ghost btn-sm" onClick={handleSendSummary} disabled={summaryLoading}>
              {summaryLoading ? '...' : '📧 Email Summary'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={handleExportCSV}>
              📥 Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Date Range Selector */}
      <DateRangeSelector
        preset={preset} setPreset={setPreset}
        customFrom={customFrom} setCustomFrom={setCustomFrom}
        customTo={customTo} setCustomTo={setCustomTo}
      />

      {/* Tabs */}
      <div className="analysis-tabs">
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={'analysis-tab' + (activeTab === tab.key ? ' active' : '')}
            onClick={() => setActiveTab(tab.key)}
          >{tab.label}</button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <>
          {renderKPIs()}
          {renderTrend()}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
            {renderRevenuePie()}
            {renderExpenseBar()}
          </div>
        </>
      )}
      {activeTab === 'revenue'  && <>{renderKPIs()}{renderRevenuePie()}{renderTrend()}</>}
      {activeTab === 'expenses' && <>{renderKPIs()}{renderExpenseBar()}{renderTrend()}</>}
      {activeTab === 'workers'  && <>{renderKPIs()}{renderWorkers()}</>}
      {activeTab === 'services' && <>{renderKPIs()}{renderServices()}</>}
      {activeTab === 'monthly'  && renderMonthly()}
      {activeTab === 'forecast' && renderForecast()}
      {activeTab === 'pl'       && renderProfitLoss()}
    </div>
  );
}
