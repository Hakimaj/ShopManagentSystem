import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import {
  Package,
  Plus,
  Search,
  Edit2,
  AlertTriangle,
  TrendingUp,
  CheckCircle,
  RefreshCw,
  Trash2
} from 'lucide-react';
import { ProductModal } from './ProductModal';

export const InventoryManager = () => {
  const { products, updateProduct, customCategories, removeProduct } = useShop();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [quickStockEditingId, setQuickStockEditingId] = useState(null);
  const [quickStockValue, setQuickStockValue] = useState('');

  const categories = ['All', ...new Set([...products.map((p) => p.category), ...(customCategories || [])])];

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category.toLowerCase().includes(searchQuery.toLowerCase());

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

  const handleSaveQuickStock = (productId) => {
    const stockNum = parseInt(quickStockValue, 10);
    if (!isNaN(stockNum) && stockNum >= 0) {
      updateProduct(productId, { currentStock: stockNum });
    }
    setQuickStockEditingId(null);
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

        <button className="btn-primary" onClick={handleOpenAddModal} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Plus size={18} />
          <span>Add New Product</span>
        </button>
      </div>

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
            {categories.map((cat) => (
              <button
                key={cat}
                className={`pill-btn ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
                style={{ fontSize: '0.78rem', padding: '0.35rem 0.8rem' }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

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
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                  No inventory products match criteria.
                </td>
              </tr>
            ) : (
              filteredProducts.map((product) => {
                const profitPerUnit = product.sellingPrice - product.costPrice;
                const isOutOfStock = product.currentStock <= 0;
                const isLowStock = product.currentStock > 0 && product.currentStock <= 5;
                const isEditingStock = quickStockEditingId === product.id;

                return (
                  <tr key={product.id}>
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
                      +{profitPerUnit} ETB
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
                          style={{ cursor: 'pointer' }}
                          onClick={() => {
                            setQuickStockEditingId(product.id);
                            setQuickStockValue(product.currentStock.toString());
                          }}
                          title="Click to edit stock level"
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
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                        <button
                          className="icon-btn"
                          style={{ display: 'inline-flex', width: 32, height: 32 }}
                          onClick={() => handleOpenEditModal(product)}
                          title="Edit Product Details"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          className="icon-btn"
                          style={{ display: 'inline-flex', width: 32, height: 32, background: 'var(--danger)', color: '#fff' }}
                          onClick={() => {
                            if (window.confirm(`Delete product "${product.name}"? This action cannot be undone.`)) {
                              removeProduct(product.id);
                            }
                          }}
                          title="Delete Product"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {isProductModalOpen && (
        <ProductModal
          isOpen={isProductModalOpen}
          onClose={() => setIsProductModalOpen(false)}
          product={editingProduct}
        />
      )}
    </div>
  );
};
