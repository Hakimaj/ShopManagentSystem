import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import { useAuth } from '../context/AuthContext';
import {
  Plus,
  Search,
  Edit2,
  AlertTriangle,
  CheckCircle,
  Trash2,
  PackageX
} from 'lucide-react';
import { ProductModal } from './ProductModal';
import { ErrorBanner } from './ErrorBanner';

export const InventoryManager = () => {
  const {
    products,
    productsMeta,
    customCategories,
    removeProduct,
    adjustStock,
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
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [quickStockEditingId, setQuickStockEditingId] = useState(null);
  const [quickStockValue, setQuickStockValue] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  // All distinct categories drawn directly from loaded products — no
  // cross-filtering against customCategories to avoid silent mismatches
  // with Amharic / mixed-language category names.
  const populatedCategories = [
    'All',
    ...new Set(products.map((p) => p.category).filter(Boolean))
  ];

  // Filter products — search works on raw string contents, no locale
  // transform that could break Amharic text comparison.
  const filteredProducts = products.filter((product) => {
    const q = searchQuery.trim();
    const matchesSearch = q === '' || (
      product.name.toLowerCase().includes(q.toLowerCase()) ||
      product.sku.toLowerCase().includes(q.toLowerCase()) ||
      (product.category || '').toLowerCase().includes(q.toLowerCase()) ||
      (product.description || '').toLowerCase().includes(q.toLowerCase())
    );

    const matchesCategory =
      selectedCategory === 'All' || product.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

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

      {/* Table Card */}
      <div className="table-card">
        <div className="table-header">
          <div className="search-box" style={{ maxWidth: '350px' }}>
            <Search size={18} />
            <input
              type="text"
              className="search-input"
              placeholder="Search inventory items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="category-pills">
            {populatedCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`pill-btn ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
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

      {isProductModalOpen && isAdmin && (
        <ProductModal
          isOpen={isProductModalOpen}
          onClose={() => setIsProductModalOpen(false)}
          product={editingProduct}
        />
      )}

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
    </div>
  );
};
