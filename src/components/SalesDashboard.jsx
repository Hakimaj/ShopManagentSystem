import React, { useState, useEffect } from 'react';
import { useShop } from '../context/ShopContext';
import { dashboardApi } from '../services/dashboardApi';
import { ErrorBanner } from './ErrorBanner';
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
  Clock,
  Inbox
} from 'lucide-react';

export const SalesDashboard = () => {
  const { transactions, isLoading: shopLoading, loadData } = useShop();

  // Revenue Time Period Filters: 'daily' | 'monthly' | 'all' | 'custom' | 'half_year'
  const [timeFilter, setTimeFilter] = useState('all');

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
  const [backendKpi, setBackendKpi] = useState(null);
  const [isLoadingKpi, setIsLoadingKpi] = useState(false);
  const [kpiError, setKpiError] = useState(null);

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

  const fetchStats = React.useCallback(async () => {
    setIsLoadingKpi(true);
    setKpiError(null);
    try {
      const res = await dashboardApi.getSummary({
        period: timeFilter,
        custom_date: timeFilter === 'custom' ? customDate : undefined,
        payment_method: selectedPaymentFilter !== 'All' ? selectedPaymentFilter : undefined
      });
      if (res?.kpi) {
        setBackendKpi(res.kpi);
      }
    } catch (err) {
      console.warn('Backend dashboard summary error:', err.message);
      setKpiError(err.message || 'Failed to fetch summary metrics');
    } finally {
      setIsLoadingKpi(false);
    }
  }, [timeFilter, customDate, selectedPaymentFilter]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Dynamically calculate metrics with backend fallback
  const periodRevenue = backendKpi
    ? Number(backendKpi.filtered_revenue)
    : dateFilteredTransactions.reduce((sum, t) => sum + t.totalRevenue, 0);

  const periodProfit = backendKpi
    ? Number(backendKpi.filtered_profit)
    : dateFilteredTransactions.reduce((sum, t) => sum + t.totalProfit, 0);

  const periodOrdersCount = backendKpi
    ? backendKpi.orders_count
    : dateFilteredTransactions.length;

  const periodItemsSold = backendKpi
    ? backendKpi.items_sold
    : dateFilteredTransactions.reduce(
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
          <h1 className="view-title">Sales Analytics &amp; Revenue</h1>
          <p className="view-subtitle">
            Authoritative breakdown of sales revenue, net profits, and transaction history.
          </p>
        </div>
      </div>

      {kpiError && (
        <ErrorBanner
          message={`Dashboard notice: ${kpiError}`}
          onRetry={() => { fetchStats(); loadData(); }}
          loading={isLoadingKpi || shopLoading}
        />
      )}

      {/* Time Period Filter Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          background: 'var(--bg-card)',
          padding: '0.85rem 1.25rem',
          borderRadius: '16px',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: '1.5rem'
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
          {isLoadingKpi && !backendKpi ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={`kpi-skel-${i}`} className="kpi-card">
                <div className="skeleton" style={{ width: '48px', height: '48px', borderRadius: '12px' }} />
                <div className="kpi-meta" style={{ width: '100%' }}>
                  <div className="skeleton skeleton-text" style={{ width: '60%', marginBottom: '6px' }} />
                  <div className="skeleton skeleton-text" style={{ width: '85%', height: '1.2rem' }} />
                </div>
              </div>
            ))
          ) : (
            <>
              <div className="kpi-card">
                <div className="kpi-icon revenue">
                  <DollarSign size={24} />
                </div>
                <div className="kpi-meta">
                  <span className="kpi-label">Filtered Revenue</span>
                  <span className="kpi-value">{periodRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB</span>
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-icon profit">
                  <TrendingUp size={24} />
                </div>
                <div className="kpi-meta">
                  <span className="kpi-label">Filtered Net Profit</span>
                  <span className="kpi-value">+{periodProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB</span>
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
            </>
          )}
        </div>
      </div>

      {/* Transactions Log Table */}
      <div className="table-card" style={{ marginTop: '1.5rem' }}>
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
              <th>Date &amp; Time</th>
              <th>Payment Method</th>
              <th>Items Sold</th>
              <th>Revenue</th>
              <th>Net Profit</th>
              <th style={{ textAlign: 'right' }}>Details</th>
            </tr>
          </thead>
          <tbody>
            {shopLoading && transactions.length === 0 ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={`txn-skel-${i}`}>
                  <td><div className="skeleton skeleton-text" style={{ width: '90px' }} /></td>
                  <td><div className="skeleton skeleton-text" style={{ width: '130px' }} /></td>
                  <td><div className="skeleton skeleton-text" style={{ width: '80px', height: '22px', borderRadius: '12px' }} /></td>
                  <td><div className="skeleton skeleton-text" style={{ width: '180px' }} /></td>
                  <td><div className="skeleton skeleton-text" style={{ width: '70px' }} /></td>
                  <td><div className="skeleton skeleton-text" style={{ width: '70px' }} /></td>
                  <td style={{ textAlign: 'right' }}><div className="skeleton skeleton-text" style={{ width: '32px', marginLeft: 'auto' }} /></td>
                </tr>
              ))
            ) : finalFilteredTransactions.length === 0 ? (
              <tr>
                <td colSpan="7">
                  <div className="empty-state">
                    <div className="empty-state-icon">
                      <Inbox size={28} />
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>No sales transactions found</div>
                    <div style={{ fontSize: '0.85rem' }}>
                      No orders match {getTimePeriodLabel()} with {selectedPaymentFilter} payment filter.
                    </div>
                  </div>
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
                    <td style={{ fontWeight: 800 }}>{txn.totalRevenue.toFixed(2)} ETB</td>
                    <td style={{ fontWeight: 800, color: 'var(--success)' }}>
                      +{txn.totalProfit.toFixed(2)} ETB
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
                <span style={{ color: 'var(--text-secondary)' }}>Date &amp; Time:</span>
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
                          justifyContent: 'space-between',
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
                            {item.quantity} units @ {item.sellingPrice} ETB (Cost: {item.costPrice} ETB/unit)
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 800 }}>{rev.toFixed(2)} ETB</div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--success)' }}>
                            +{profit.toFixed(2)} ETB profit
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div
                style={{
                  borderTop: '2px solid var(--border-color)',
                  paddingTop: '0.75rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: 800,
                  fontSize: '1rem'
                }}
              >
                <span>Total Order Profit:</span>
                <span style={{ color: 'var(--success)' }}>
                  +{selectedTxnDetail.totalProfit.toFixed(2)} ETB
                </span>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-primary"
                onClick={() => setSelectedTxnDetail(null)}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
