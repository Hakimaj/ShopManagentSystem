import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import {
  DollarSign,
  TrendingUp,
  Receipt,
  Package,
  Filter,
  Calendar,
  Building2,
  Smartphone,
  Banknote,
  Eye,
  Clock
} from 'lucide-react';

export const SalesDashboard = () => {
  const { transactions } = useShop();

  // Revenue Time Period Filters: 'daily' | 'monthly' | 'all' | 'custom'
  const [timeFilter, setTimeFilter] = useState('all');
  
  // Custom Date Picker value (Format: YYYY-MM-DD). Default to today's date
  const getTodayFormatted = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [customDate, setCustomDate] = useState(getTodayFormatted());
  const [selectedPaymentFilter, setSelectedPaymentFilter] = useState('All');
  const [selectedTxnDetail, setSelectedTxnDetail] = useState(null);

  // Helper date matching functions
  const isSameDay = (isoDateString, targetYmd) => {
    const d = new Date(isoDateString);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}` === targetYmd;
  };

  const isCurrentMonth = (isoDateString) => {
    const d = new Date(isoDateString);
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth()
    );
  };

  const isLastSixMonths = (isoDateString) => {
    const d = new Date(isoDateString);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return d >= sixMonthsAgo;
  };

  // 1. First filter transactions by Time Period
  const dateFilteredTransactions = transactions.filter((txn) => {
    if (timeFilter === 'daily') {
      return isSameDay(txn.timestamp, getTodayFormatted());
    }
    if (timeFilter === 'monthly') {
      return isCurrentMonth(txn.timestamp);
    }
    if (timeFilter === 'half_year') {
      return isLastSixMonths(txn.timestamp);
    }
    if (timeFilter === 'custom') {
      return isSameDay(txn.timestamp, customDate);
    }
    return true; // 'all'
  });

  // 2. Second filter by Payment Method for the table
  const finalFilteredTransactions = dateFilteredTransactions.filter((txn) => {
    if (selectedPaymentFilter === 'All') return true;
    return txn.paymentMethod === selectedPaymentFilter;
  });

  // Dynamically calculate metrics for the active Time Period filter
  const periodRevenue = dateFilteredTransactions.reduce((sum, t) => sum + t.totalRevenue, 0);
  const periodProfit = dateFilteredTransactions.reduce((sum, t) => sum + t.totalProfit, 0);
  const periodOrdersCount = dateFilteredTransactions.length;
  const periodItemsSold = dateFilteredTransactions.reduce(
    (sum, t) => sum + t.items.reduce((iSum, item) => iSum + item.quantity, 0),
    0
  );

  const getPaymentIcon = (method) => {
    switch (method) {
      case 'Bank':
        return <Building2 size={14} />;
      case 'Telebirr':
        return <Smartphone size={14} />;
      case 'Cash':
        return <Banknote size={14} />;
      default:
        return null;
    }
  };

  const formatDate = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimePeriodLabel = () => {
    switch (timeFilter) {
      case 'daily':
        return "Today's Summary";
      case 'monthly':
        return "This Month's Summary";
      case 'half_year':
        return "Last 6 Months Summary";
      case 'custom':
        return `Summary for ${customDate}`;
      default:
        return "All-Time Summary";
    }
  };

  return (
    <div className="view-container">
      {/* Header */}
      <div className="view-header">
        <div>
          <h1 className="view-title">Sales & Revenue Dashboard</h1>
          <p className="view-subtitle">
            Track daily, monthly, and custom date revenue with net profit calculations.
          </p>
        </div>
      </div>

      {/* ENHANCED REVENUE FILTERS CONTROL BAR */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '14px',
          padding: '1rem 1.25rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justify: 'space-between',
          gap: '1rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Calendar size={20} color="var(--accent-primary)" />
          <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>Revenue Time Period:</span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.6rem' }}>
          <button
            className={`pill-btn ${timeFilter === 'daily' ? 'active' : ''}`}
            onClick={() => setTimeFilter('daily')}
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            Daily (Today)
          </button>

          <button
            className={`pill-btn ${timeFilter === 'monthly' ? 'active' : ''}`}
            onClick={() => setTimeFilter('monthly')}
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            This Month
          </button>

          <button
            className={`pill-btn ${timeFilter === 'half_year' ? 'active' : ''}`}
            onClick={() => setTimeFilter('half_year')}
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            Last 6 Months
          </button>

          <button
            className={`pill-btn ${timeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setTimeFilter('all')}
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            All Time
          </button>

          {/* CUSTOM DATE PICKER */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: timeFilter === 'custom' ? 'var(--accent-glow)' : 'var(--bg-main)',
              border: `1px solid ${timeFilter === 'custom' ? 'var(--accent-primary)' : 'var(--border-color)'}`,
              padding: '0.35rem 0.75rem',
              borderRadius: '9999px',
              transition: 'all 0.2s ease'
            }}
          >
            <Clock size={16} color={timeFilter === 'custom' ? 'var(--accent-primary)' : 'var(--text-muted)'} />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Custom Date:
            </span>
            <input
              type="date"
              value={customDate}
              onChange={(e) => {
                setCustomDate(e.target.value);
                setTimeFilter('custom');
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
                fontSize: '0.82rem',
                fontWeight: 700,
                outline: 'none',
                cursor: 'pointer'
              }}
            />
          </div>
        </div>
      </div>

      {/* KPI Cards Grid reflecting current Revenue Time Period */}
      <div>
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {getTimePeriodLabel()}
        </div>

        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-icon revenue">
              <DollarSign size={24} />
            </div>
            <div className="kpi-meta">
              <span className="kpi-label">Filtered Revenue</span>
              <span className="kpi-value">{periodRevenue.toLocaleString()} ETB</span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon profit">
              <TrendingUp size={24} />
            </div>
            <div className="kpi-meta">
              <span className="kpi-label">Filtered Net Profit</span>
              <span className="kpi-value">+{periodProfit.toLocaleString()} ETB</span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon txns">
              <Receipt size={24} />
            </div>
            <div className="kpi-meta">
              <span className="kpi-label">Orders Count</span>
              <span className="kpi-value">{periodOrdersCount}</span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon items">
              <Package size={24} />
            </div>
            <div className="kpi-meta">
              <span className="kpi-label">Items Sold</span>
              <span className="kpi-value">{periodItemsSold} units</span>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Log Table */}
      <div className="table-card">
        <div className="table-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Receipt size={20} color="var(--accent-primary)" />
            <h3 style={{ fontWeight: 700, fontSize: '1.05rem' }}>Sales Transactions Log</h3>
          </div>

          {/* Payment Method Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Filter size={14} color="var(--text-muted)" />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginRight: '0.3rem' }}>
              Payment:
            </span>
            {['All', 'Bank', 'Telebirr', 'Cash'].map((method) => (
              <button
                key={method}
                className={`pill-btn ${selectedPaymentFilter === method ? 'active' : ''}`}
                onClick={() => setSelectedPaymentFilter(method)}
                style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}
              >
                {method}
              </button>
            ))}
          </div>
        </div>

        <table className="custom-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Date & Time</th>
              <th>Payment Method</th>
              <th>Items Sold</th>
              <th>Revenue</th>
              <th>Net Profit</th>
              <th style={{ textAlign: 'right' }}>Details</th>
            </tr>
          </thead>
          <tbody>
            {finalFilteredTransactions.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2.5rem' }}>
                  No sales transactions logged for {getTimePeriodLabel()} ({selectedPaymentFilter} Payment).
                </td>
              </tr>
            ) : (
              finalFilteredTransactions.map((txn) => {
                const totalUnits = txn.items.reduce((s, i) => s + i.quantity, 0);

                return (
                  <tr key={txn.id}>
                    <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>
                      {txn.id}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {formatDate(txn.timestamp)}
                    </td>
                    <td>
                      <span className={`pm-badge ${txn.paymentMethod}`}>
                        {getPaymentIcon(txn.paymentMethod)}
                        <span>{txn.paymentMethod}</span>
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {totalUnits} items ({txn.items.map((i) => `${i.name} (${i.quantity})`).join(', ')})
                    </td>
                    <td style={{ fontWeight: 800 }}>{txn.totalRevenue} ETB</td>
                    <td style={{ fontWeight: 800, color: 'var(--success)' }}>
                      +{txn.totalProfit} ETB
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="icon-btn"
                        style={{ display: 'inline-flex', width: 32, height: 32 }}
                        onClick={() => setSelectedTxnDetail(txn)}
                        title="View Line Item Breakdown"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Transaction Detail Breakdown Modal */}
      {selectedTxnDetail && (
        <div className="modal-overlay" onClick={() => setSelectedTxnDetail(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Order Details - {selectedTxnDetail.id}</div>
              <button
                className="icon-btn"
                onClick={() => setSelectedTxnDetail(null)}
                style={{ border: 'none', background: 'transparent' }}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Date & Time:</span>
                <span style={{ fontWeight: 600 }}>{formatDate(selectedTxnDetail.timestamp)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Payment Method:</span>
                <span className={`pm-badge ${selectedTxnDetail.paymentMethod}`}>
                  {getPaymentIcon(selectedTxnDetail.paymentMethod)}
                  <span>{selectedTxnDetail.paymentMethod}</span>
                </span>
              </div>

              <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '0.75rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  Purchased Household Items
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {selectedTxnDetail.items.map((item, idx) => {
                    const rev = item.sellingPrice * item.quantity;
                    const cost = item.costPrice * item.quantity;
                    const profit = rev - cost;
                    return (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justify: 'space-between',
                          alignItems: 'center',
                          background: 'var(--bg-card)',
                          padding: '0.6rem 0.8rem',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          fontSize: '0.85rem'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700 }}>{item.name}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                            Cost: {item.costPrice} ETB | Sell: {item.sellingPrice} ETB × {item.quantity}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 800 }}>{rev} ETB</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 700 }}>
                            Profit: +{profit} ETB
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justify: 'space-between',
                  background: 'var(--bg-card)',
                  padding: '0.85rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  marginTop: '0.5rem'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Total Revenue</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{selectedTxnDetail.totalRevenue} ETB</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Total Net Profit</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--success)' }}>
                    +{selectedTxnDetail.totalProfit} ETB
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-primary" onClick={() => setSelectedTxnDetail(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
