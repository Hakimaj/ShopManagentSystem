import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import { Search, AlertTriangle, Layers } from 'lucide-react';

export const POSCatalog = () => {
  const { products, addToCart, cart, customCategories } = useShop();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [addedItemEffect, setAddedItemEffect] = useState(null);

  // Dynamic unique categories
  const categories = ['All', ...new Set([...products.map((p) => p.category), ...(customCategories || [])])];

  // Filter products
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'All' || product.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const handleCardClick = (product) => {
    if (product.currentStock <= 0) return;

    const added = addToCart(product);
    if (added) {
      setAddedItemEffect(product.id);
      setTimeout(() => setAddedItemEffect(null), 600);
    }
  };

  const getItemCartQty = (productId) => {
    const found = cart.find((item) => item.product.id === productId);
    return found ? found.quantity : 0;
  };

  return (
    <div className="catalog-section">
      {/* Category Filter Buttons at Top & Search Input */}
      <div className="catalog-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Layers size={18} color="var(--accent-primary)" />
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Categories
          </span>
        </div>

        <div className="category-pills">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`pill-btn ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            className="search-input"
            placeholder="Search products by name, SKU, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Product Cards Grid */}
      <div className="product-grid">
        {filteredProducts.length === 0 ? (
          <div
            style={{
              gridColumn: '1 / -1',
              padding: '3rem',
              textAlign: 'center',
              color: 'var(--text-muted)'
            }}
          >
            No household items match your criteria.
          </div>
        ) : (
          filteredProducts.map((product) => {
            const inCartQty = getItemCartQty(product.id);
            const isOutOfStock = product.currentStock <= 0;
            const isLowStock = product.currentStock > 0 && product.currentStock <= 5; // Red warning threshold
            const isRecentlyAdded = addedItemEffect === product.id;

            return (
              <div
                key={product.id}
                className={`product-card ${isOutOfStock ? 'out-of-stock' : ''}`}
                onClick={() => handleCardClick(product)}
                style={{
                  borderColor: isRecentlyAdded
                    ? 'var(--accent-primary)'
                    : isLowStock
                    ? 'var(--danger)'
                    : undefined,
                  boxShadow: isRecentlyAdded ? '0 0 16px var(--accent-glow)' : undefined,
                  padding: 0,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                {/* Hero Image Section */}
                <div style={{ position: 'relative', width: '100%', height: '140px', flexShrink: 0, background: `${product.color || 'var(--accent-primary)'}15` }}>
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      loading="lazy"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3.5rem' }}>
                      {product.icon || '🧴'}
                    </div>
                  )}

                  {/* Cart qty badge overlay */}
                  {inCartQty > 0 && (
                    <span style={{ position: 'absolute', top: '8px', right: '8px', background: 'var(--accent-primary)', color: '#fff', fontSize: '0.72rem', padding: '0.15rem 0.55rem', borderRadius: '999px', fontWeight: 700 }}>
                      {inCartQty} in cart
                    </span>
                  )}

                  {/* Stock badge overlay */}
                  <div
                    className={`stock-badge ${isOutOfStock ? 'no-stock' : isLowStock ? 'low-stock red-alert' : 'in-stock'}`}
                    style={{ position: 'absolute', bottom: '8px', left: '8px' }}
                  >
                    {isOutOfStock ? (
                      'Out of Stock'
                    ) : (
                      <>
                        {isLowStock && <AlertTriangle size={12} style={{ marginRight: 4 }} />}
                        {product.currentStock} in stock
                      </>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.2rem', flex: 1 }}>
                  <h3 className="product-name" style={{ margin: 0 }}>{product.name}</h3>
                  <div className="product-sku">{product.sku}</div>
                  <div className="price-tag" style={{ marginTop: 'auto', paddingTop: '0.4rem' }}>
                    <span className="cost-hint">Cost: {product.costPrice} ETB</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
