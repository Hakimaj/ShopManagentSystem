import React, { useState, useEffect } from 'react';
import { useShop } from '../context/ShopContext';
import { useAuth } from '../context/AuthContext';
import { inventoryApi } from '../services/inventoryApi';
import {
  Plus,
  Search,
  Edit2,
  AlertTriangle,
  CheckCircle,
  Trash2,
  PackageX,
  Package,
  TrendingUp,
  TrendingDown,
  Clock
} from 'lucide-react';
import { ProductModal } from './ProductModal';
import { ErrorBanner } from './ErrorBanner';

export const InventoryManager = () => {
  const {
    products,
    productsMeta,
    globalStats,
    customCategories,
    removeProduct,
    adjustStock,
    searchProducts,
    isLoading,
    isLoadingMoreProducts,
    loadMoreProducts,
    apiError,
    loadData
  } = useShop();

  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'ADMIN';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [customDate, setCustomDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [quickStockEditingId, setQuickStockEditingId] = useState(null);
  const [quickStockValue, setQuickStockValue] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [searchTimeout, setSearchTimeout] = useState(null);
  
  // New state for inventory stats and stock movements
  const [inventoryStats, setInventoryStats] = useState(null);
  const [viewMode, setViewMode] = useState('inventory'); // 'inventory', 'stock-in', 'stock-out'
  const [timeFilter, setTimeFilter] = useState('all');
  const [stockMovements, setStockMovements] = useState([]);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [movementsError, setMovementsError] = useState(null);
  const [movementStats, setMovementStats] = useState(null); // For stock in/out totals

  // Fetch inventory stats on component mount
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const stats = await inventoryApi.getStats();
        setInventoryStats(stats);
      } catch (err) {
        console.warn('Failed to fetch inventory stats:', err.message);
        // If API fails, try to use global stats from context as fallback
        if (globalStats) {
          setInventoryStats(globalStats);
        }
      }
    };
    fetchStats();
  }, [globalStats]);

  // Fetch stock movements when view mode or time filter changes
  useEffect(() => {
    if (viewMode === 'stock-in' || viewMode === 'stock-out') {
      fetchStockMovements();
    }
  }, [viewMode, timeFilter]);

  const fetchStockMovements = async () => {
    setMovementsLoading(true);
    setMovementsError(null);
    try {
      const params = {
        type: viewMode === 'stock-in' ? 'IN' : 'OUT',
        period: timeFilter,
        page: 1,
        size: 100
      };
      const response = await inventoryApi.getStockMovements(params);
      setStockMovements(response.items || []);
      
      // Calculate totals for the filtered movements
      const totalQuantity = (response.items || []).reduce((sum, movement) => sum + movement.quantity, 0);
      const totalMovements = (response.items || []).length;
      
      setMovementStats({
        total_movements: totalMovements,
        total_quantity: totalQuantity,
        movement_type: viewMode === 'stock-in' ? 'IN' : 'OUT',
        time_period: timeFilter
      });
    } catch (err) {
      setMovementsError(err.message || 'Failed to fetch stock movements');
      setMovementStats(null);
    } finally {
      setMovementsLoading(false);
    }
  };

  // Handle server-side search with debouncing
  const handleSearch = (query) => {
    setSearchQuery(query);
    
    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Set new timeout for search
    const timeout = setTimeout(() => {
      searchProducts(query.trim(), selectedCategory);
    }, 500); // 500ms debounce
    
    setSearchTimeout(timeout);
  };

  // Handle category filter change
  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    searchProducts(searchQuery.trim(), category);
  };

  // Use inventory stats from API or fallback to global stats from context
  const totalDistinctProducts = inventoryStats?.total_distinct_products || globalStats?.total_distinct_products || 0;
  const totalStockVolume = inventoryStats?.total_stock_units || globalStats?.total_stock_units || 0;
  const totalInventoryValue = inventoryStats?.total_inventory_value || globalStats?.total_inventory_value || 0;

  // Since we're using server-side search, products array already contains filtered results
  const filteredProducts = products;

  // All distinct categories from custom categories list
  const populatedCategories = ['All', ...customCategories];

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setIsProductModalOpen(true);
  };

  const handleOpenEditModal = (product) => {
    setEditingProduct(product);
    setIsProductModalOpen(true);
  };

  const handleSaveQuickStock = async (productId) => {
    const stockNum = parseInt(quickStockValue, 10);
    if (!isNaN(stockNum) && stockNum >= 0) {
      try {
        await adjustStock(productId, stockNum);
      } catch (err) {
        alert(err.message || 'Failed to update stock');
      }
    }
    setQuickStockEditingId(null);
  };

  const handleDeleteProduct = async (product) => {
    if (window.confirm(`Deactivate product "${product.name}"? This will remove it from active catalog while preserving sales history.`)) {
      setDeletingId(product.id);
      try {
        await removeProduct(product.id);
      } catch (err) {
        alert(err.message || 'Failed to delete product');
      } finally {
        setDeletingId(null);
      }
    }
  };

  return (
    <div className="view-container">
      {/* Header */}
      <div className="view-header">
        <div>
          <h1 className="view-title">Inventory Stock Management</h1>
          <p className="view-subtitle">
            Manage cost prices, selling prices, and real-time inventory stock levels.
          </p>
        </div>

        {/* Add New Product button — Admin only */}
        {isAdmin && (
          <button className="btn-primary" onClick={handleOpenAddModal} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Plus size={18} />
            <span>Add New Product</span>
          </button>
        )}
      </div>

      {apiError && <ErrorBanner message={apiError} onRetry={loadData} loading={isLoading} />}
      {movementsError && (
        <ErrorBanner 
          message={`Stock movements error: ${movementsError}`} 
          onRetry={fetchStockMovements} 
          loading={movementsLoading} 
        />
      )}

      {/* View Mode Filter Bar */}
      <div className="period-filter-bar" style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
        background: 'var(--bg-card)',
        padding: '0.85rem 1.25rem',
        borderRadius: '16px',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-sm)',
        marginBottom: '1.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
          <Package size={20} color="var(--accent-primary)" />
          <span style={{ fontWeight: 700, fontSize: '0.92rem', whiteSpace: 'nowrap' }}>View:</span>
        </div>

        <div className="category-pills" style={{ flex: '1 1 auto' }}>
          <button
            className={`pill-btn ${viewMode === 'inventory' ? 'active' : ''}`}
            onClick={() => setViewMode('inventory')}
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            <Package size={16} />
            Inventory
          </button>

          <button
            className={`pill-btn ${viewMode === 'stock-in' ? 'active' : ''}`}
            onClick={() => setViewMode('stock-in')}
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            <TrendingUp size={16} />
            Stock In
          </button>

          <button
            className={`pill-btn ${viewMode === 'stock-out' ? 'active' : ''}`}
            onClick={() => setViewMode('stock-out')}
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            <TrendingDown size={16} />
            Stock Out
          </button>

          {/* Time Filter - only shown for stock movement views */}
          {(viewMode === 'stock-in' || viewMode === 'stock-out') && (
            <>
              <div style={{ height: '1.5rem', width: '1px', background: 'var(--border-color)', margin: '0 0.5rem' }} />
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Clock size={16} color="var(--text-muted)" />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                  Period:
                </span>
              </div>

              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="form-input"
                style={{ 
                  padding: '0.35rem 0.75rem', 
                  fontSize: '0.82rem',
                  minWidth: '120px',
                  background: timeFilter !== 'all' ? 'var(--accent-glow)' : 'var(--bg-main)',
                  borderColor: timeFilter !== 'all' ? 'var(--accent-primary)' : 'var(--border-color)'
                }}
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="month">This Month</option>
                <option value="half_year">Last 6 Months</option>
                <option value="year">Last Year</option>
              </select>
            </>
          )}
        </div>
      </div>

      {/* Step 3: Summary Cards - Different for each view mode */}
      {viewMode === 'inventory' ? (
        /* Inventory Summary Cards */
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <div className="kpi-card">
            <div className="kpi-icon" style={{ background: 'var(--pm-telebirr-bg)', color: 'var(--pm-telebirr)' }}>
              <Package size={24} />
            </div>
            <div className="kpi-meta">
              <span className="kpi-label">Distinct Products</span>
              <span className="kpi-value">{totalDistinctProducts}</span>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon" style={{ background: 'var(--pm-bank-bg)', color: 'var(--pm-bank)' }}>
              <Package size={24} />
            </div>
            <div className="kpi-meta">
              <span className="kpi-label">Total Stock Units</span>
              <span className="kpi-value">{totalStockVolume.toLocaleString()}</span>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
              <Package size={24} />
            </div>
            <div className="kpi-meta">
              <span className="kpi-label">Total Stock Value</span>
              <span className="kpi-value">
                {totalInventoryValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Stock Movement Summary Cards */
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <div className="kpi-card">
            <div className="kpi-icon" style={{ 
              background: viewMode === 'stock-in' ? 'var(--success-bg)' : 'var(--warning-bg)', 
              color: viewMode === 'stock-in' ? 'var(--success)' : 'var(--warning)' 
            }}>
              {viewMode === 'stock-in' ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
            </div>
            <div className="kpi-meta">
              <span className="kpi-label">
                Total {viewMode === 'stock-in' ? 'Stock In' : 'Stock Out'} Movements
              </span>
              <span className="kpi-value">
                {movementStats?.total_movements || 0}
              </span>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon" style={{ 
              background: viewMode === 'stock-in' ? 'var(--success-bg)' : 'var(--danger-bg)', 
              color: viewMode === 'stock-in' ? 'var(--success)' : 'var(--danger)' 
            }}>
              <Package size={24} />
            </div>
            <div className="kpi-meta">
              <span className="kpi-label">
                Total Units {viewMode === 'stock-in' ? 'Added' : 'Removed'}
              </span>
              <span className="kpi-value">
                {(movementStats?.total_quantity || 0).toLocaleString()} units
              </span>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon" style={{ background: 'var(--pm-cash-bg)', color: 'var(--pm-cash)' }}>
              <Clock size={24} />
            </div>
            <div className="kpi-meta">
              <span className="kpi-label">Time Period</span>
              <span className="kpi-value" style={{ fontSize: '0.9rem', textTransform: 'capitalize' }}>
                {timeFilter === 'all' ? 'All Time' : 
                 timeFilter === 'today' ? 'Today' :
                 timeFilter === 'month' ? 'This Month' :
                 timeFilter === 'half_year' ? 'Last 6 Months' :
                 timeFilter === 'year' ? 'Last Year' : timeFilter}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Conditional Content Based on View Mode */}
      {viewMode === 'inventory' ? (
        <>
          {/* Standard Inventory Table */}
          <div className="table-card">
        <div className="table-header">
          <div className="search-box" style={{ maxWidth: '350px' }}>
            <Search size={18} />
            <input
              type="text"
              className="search-input"
              placeholder="Search inventory items..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>

          <div className="category-pills">
            {populatedCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`pill-btn ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => handleCategoryChange(cat)}
                style={{ fontSize: '0.78rem', padding: '0.35rem 0.8rem' }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Horizontal scroll wrapper — reveals all columns on mobile */}
        <div className="table-scroll-wrapper">
        <table className="custom-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Product Name</th>
              <th>Category</th>
              <th>Cost Price</th>
              <th>Selling Price</th>
              <th>Profit / Unit</th>
              <th>Stock Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && products.length === 0 ? (
              // Loading skeleton state
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`skeleton-${i}`}>
                  <td><div className="skeleton skeleton-text" style={{ width: '80px' }} /></td>
                  <td>
                    <div className="skeleton skeleton-text" style={{ width: '150px', marginBottom: '4px' }} />
                    <div className="skeleton skeleton-text" style={{ width: '100px', height: '0.65rem' }} />
                  </td>
                  <td><div className="skeleton skeleton-text" style={{ width: '90px' }} /></td>
                  <td><div className="skeleton skeleton-text" style={{ width: '60px' }} /></td>
                  <td><div className="skeleton skeleton-text" style={{ width: '60px' }} /></td>
                  <td><div className="skeleton skeleton-text" style={{ width: '60px' }} /></td>
                  <td><div className="skeleton skeleton-text" style={{ width: '80px', height: '22px', borderRadius: '12px' }} /></td>
                  <td style={{ textAlign: 'right' }}><div className="skeleton skeleton-text" style={{ width: '64px', marginLeft: 'auto' }} /></td>
                </tr>
              ))
            ) : filteredProducts.length === 0 ? (
              <tr>
                <td colSpan="8">
                  <div className="empty-state">
                    <div className="empty-state-icon">
                      <PackageX size={28} />
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>No inventory products found</div>
                    <div style={{ fontSize: '0.85rem' }}>
                      {searchQuery || selectedCategory !== 'All'
                        ? 'Try changing your search keywords or category filters.'
                        : 'No products are currently in the catalog. Click "Add New Product" to create one.'}
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              filteredProducts.map((product) => {
                const profitPerUnit = product.sellingPrice - product.costPrice;
                const isOutOfStock = product.currentStock <= 0;
                const isLowStock = product.currentStock > 0 && product.currentStock <= 5;
                const isEditingStock = quickStockEditingId === product.id;
                const isDeleting = deletingId === product.id;

                return (
                  <tr key={product.id} style={{ opacity: isDeleting ? 0.4 : 1 }}>
                    <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>
                      {product.sku}
                    </td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{product.name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {product.description}
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          background: 'var(--bg-main)',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          fontSize: '0.78rem',
                          fontWeight: 600
                        }}
                      >
                        {product.category}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {product.costPrice} ETB
                    </td>
                    <td style={{ fontWeight: 800 }}>
                      {product.sellingPrice} ETB
                    </td>
                    <td style={{ fontWeight: 800, color: 'var(--success)' }}>
                      +{profitPerUnit.toFixed(2)} ETB
                    </td>
                    <td>
                      {isEditingStock ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <input
                            type="number"
                            className="form-input"
                            style={{ width: '70px', padding: '0.2rem 0.4rem' }}
                            value={quickStockValue}
                            onChange={(e) => setQuickStockValue(e.target.value)}
                            autoFocus
                          />
                          <button
                            className="icon-btn"
                            style={{ width: 28, height: 28 }}
                            onClick={() => handleSaveQuickStock(product.id)}
                          >
                            <CheckCircle size={14} color="var(--success)" />
                          </button>
                        </div>
                      ) : (
                        <div
                          style={{ cursor: isAdmin ? 'pointer' : 'default' }}
                          onClick={() => {
                            if (!isAdmin) return;
                            setQuickStockEditingId(product.id);
                            setQuickStockValue(product.currentStock.toString());
                          }}
                          title={isAdmin ? 'Click to edit stock level' : undefined}
                        >
                          <span
                            className={`stock-badge ${
                              isOutOfStock
                                ? 'no-stock'
                                : isLowStock
                                ? 'low-stock'
                                : 'in-stock'
                            }`}
                          >
                            {isOutOfStock ? (
                              'Out of Stock (0)'
                            ) : (
                              <>
                                {isLowStock && <AlertTriangle size={12} style={{ marginRight: 4 }} />}
                                {product.currentStock} units
                              </>
                            )}
                          </span>
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {/* Edit and Delete buttons — Admin only */}
                      {isAdmin && (
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                          <button
                            className="icon-btn"
                            style={{ display: 'inline-flex', width: 32, height: 32 }}
                            onClick={() => handleOpenEditModal(product)}
                            title="Edit Product Details"
                            disabled={isDeleting}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            className="icon-btn"
                            style={{ display: 'inline-flex', width: 32, height: 32, background: 'var(--danger)', color: '#fff' }}
                            onClick={() => handleDeleteProduct(product)}
                            title="Deactivate Product"
                            disabled={isDeleting}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>{/* end table-scroll-wrapper */}
      </div>

      {/* Load More Products */}
      {productsMeta && productsMeta.page < productsMeta.pages && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
          <button
            className="btn-secondary"
            onClick={loadMoreProducts}
            disabled={isLoadingMoreProducts}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 2rem' }}
          >
            {isLoadingMoreProducts ? (
              <>
                <span style={{ width: 16, height: 16, border: '2px solid var(--border-color)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                Loading…
              </>
            ) : (
              `Load More (${products.length} / ${productsMeta.total} shown)`
            )}
          </button>
        </div>
      )}
        </>
      ) : (
        /* Stock Movements View */
        <div className="table-card">
          <div className="table-header">
            <h3 style={{ fontWeight: 700, fontSize: '1.05rem' }}>
              {viewMode === 'stock-in' ? 'Stock In History' : 'Stock Out History'}
            </h3>
          </div>

          <div className="table-scroll-wrapper">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Quantity</th>
                  <th>Movement Type</th>
                  <th>Reference</th>
                  <th>Date & Time</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {movementsLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={`movement-skel-${i}`}>
                      <td><div className="skeleton skeleton-text" style={{ width: '150px' }} /></td>
                      <td><div className="skeleton skeleton-text" style={{ width: '60px' }} /></td>
                      <td><div className="skeleton skeleton-text" style={{ width: '80px', height: '22px', borderRadius: '12px' }} /></td>
                      <td><div className="skeleton skeleton-text" style={{ width: '100px' }} /></td>
                      <td><div className="skeleton skeleton-text" style={{ width: '130px' }} /></td>
                      <td><div className="skeleton skeleton-text" style={{ width: '120px' }} /></td>
                    </tr>
                  ))
                ) : stockMovements.length === 0 ? (
                  <tr>
                    <td colSpan="6">
                      <div className="empty-state">
                        <div className="empty-state-icon">
                          {viewMode === 'stock-in' ? <TrendingUp size={28} /> : <TrendingDown size={28} />}
                        </div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          No {viewMode === 'stock-in' ? 'stock in' : 'stock out'} movements found
                        </div>
                        <div style={{ fontSize: '0.85rem' }}>
                          No movements match the selected time period.
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  stockMovements.map((movement) => (
                    <tr key={movement.id}>
                      <td style={{ fontWeight: 700 }}>
                        {movement.product_name || `Product ID ${movement.product_id}`}
                      </td>
                      <td style={{ fontWeight: 800 }}>
                        {movement.quantity} units
                      </td>
                      <td>
                        <span
                          className={`stock-badge ${movement.type === 'IN' ? 'in-stock' : 'low-stock'}`}
                          style={{
                            background: movement.type === 'IN' ? 'var(--success-bg)' : 'var(--warning-bg)',
                            color: movement.type === 'IN' ? 'var(--success)' : 'var(--warning)'
                          }}
                        >
                          {movement.type === 'IN' ? <TrendingUp size={12} style={{ marginRight: 4 }} /> : <TrendingDown size={12} style={{ marginRight: 4 }} />}
                          {movement.type}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {movement.reference_type || 'Manual'}
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {new Date(movement.timestamp).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        {movement.notes || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Product Modal */}
      {isProductModalOpen && isAdmin && (
        <ProductModal
          isOpen={isProductModalOpen}
          onClose={() => setIsProductModalOpen(false)}
          product={editingProduct}
        />
      )}
    </div>
  );
};
