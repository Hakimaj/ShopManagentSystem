import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import { Search, AlertTriangle, Layers, ShoppingBag, PackageX } from 'lucide-react';
import { ErrorBanner } from './ErrorBanner';

export const POSCatalog = () => {
  const { products, addToCart, cart, customCategories, isLoading, apiError, loadData } = useShop();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [addedItemEffect, setAddedItemEffect] = useState(null);

  // Dynamic populated categories filter: only show categories that have products in them
  const populatedCategories = [
    'All',
    ...new Set(
      (customCategories || [])
        .concat(products.map((p) => p.category))
        .filter((cat) => cat && products.some((product) => product.category === cat))
    )
  ];

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

    const alreadyInCart = cart.some((item) => item.product.id === product.id);
    addToCart(product); // toggles: adds if not in cart, removes if already in cart

    if (!alreadyInCart) {
      // Only flash the "added" animation on the first click (adding)
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
          {populatedCategories.map((cat) => (
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

      {apiError && <ErrorBanner message={apiError} onRetry={loadData} loading={isLoading} />}

      {/* Product Cards Grid */}
      <div className="product-grid">
        {isLoading && products.length === 0 ? (
          // Loading skeleton product cards
          Array.from({ length: 6 }).map((_, i) => (
            <div key={`prod-skel-${i}`} className="product-card" style={{ pointerEvents: 'none' }}>
              <div className="skeleton" style={{ width: '100%', height: '140px', borderRadius: '12px 12px 0 0' }} />
              <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div className="skeleton skeleton-text" style={{ width: '80%', height: '1rem' }} />
              </div>
            </div>
          ))
        ) : filteredProducts.length === 0 ? (
          <div
            style={{
              gridColumn: '1 / -1',
              padding: '4rem 1rem'
            }}
          >
            <div className="empty-state">
              <div className="empty-state-icon">
                <PackageX size={28} />
              </div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>No products found</div>
              <div style={{ fontSize: '0.85rem' }}>
                {searchQuery || selectedCategory !== 'All'
                  ? 'No products match your search or category filter.'
                  : 'Your product catalog is empty.'}
              </div>
            </div>
          </div>
        ) : (
          filteredProducts.map((product) => {
            const inCartQty = getItemCartQty(product.id);
            const isInCart = inCartQty > 0;
            const isOutOfStock = product.currentStock <= 0;
            const isLowStock = product.currentStock > 0 && product.currentStock <= 5;
            const isRecentlyAdded = addedItemEffect === product.id;

            return (
              <div
                key={product.id}
                className={`product-card ${isOutOfStock ? 'out-of-stock' : ''}`}
                onClick={() => handleCardClick(product)}
                title={isInCart ? 'Click again to remove from cart' : isOutOfStock ? 'Out of stock' : 'Click to add to cart'}
                style={{
                  transform: isRecentlyAdded ? 'scale(0.97)' : undefined,
                  transition: 'all 0.15s ease',
                  borderColor: isInCart ? 'var(--accent-primary)' : undefined,
                  boxShadow: isInCart ? '0 0 0 2px var(--accent-primary), var(--shadow-md)' : undefined,
                  background: isInCart ? 'var(--bg-card-hover)' : undefined,
                }}
              >
                {/* Badge if in cart — click to remove */}
                {isInCart && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 10,
                      left: 10,
                      background: 'var(--accent-primary)',
                      color: '#fff',
                      padding: '0.2rem 0.55rem',
                      borderRadius: '999px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      zIndex: 3,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                    }}
                  >
                    <ShoppingBag size={11} />
                    <span>Tap to remove</span>
                  </div>
                )}

                {/* Stock Status Badge */}
                <div
                  style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    zIndex: 3
                  }}
                >
                  <span
                    className={`stock-badge ${
                      isOutOfStock
                        ? 'no-stock'
                        : isLowStock
                        ? 'low-stock red-alert'
                        : 'in-stock'
                    }`}
                  >
                    {isOutOfStock ? (
                      'Out of Stock'
                    ) : (
                      <>
                        {isLowStock && <AlertTriangle size={12} style={{ marginRight: 4 }} />}
                        {product.currentStock} left
                      </>
                    )}
                  </span>
                </div>

                {/* Product Image */}
                <div className="product-image-container">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="product-image"
                      loading="lazy"
                    />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '140px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '2.5rem',
                        background: 'var(--bg-main)'
                      }}
                    >
                      🧴
                    </div>
                  )}
                </div>

                {/* Product Details */}
                <div className="product-info" style={{ padding: '0.75rem 0.25rem 0.25rem', textAlign: 'center' }}>
                  <h3 className="product-name" style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>
                    {product.name}
                  </h3>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
