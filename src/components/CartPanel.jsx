import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react';

export const CartPanel = ({ onCloseMobile }) => {
  const {
    cart,
    updateCartQuantity,
    updateCartItemPrice,
    removeFromCart,
    clearCart,
    processCheckout
  } = useShop();

  // Strict payment options: "Bank", "Telebirr", "Cash"
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('Cash');
  const [errorMsg, setErrorMsg] = useState('');

  // Cart calculations
  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const subtotal = cart.reduce(
    (sum, item) => sum + (item.soldPrice || 0) * item.quantity,
    0
  );

  const totalCost = cart.reduce(
    (sum, item) => sum + item.product.costPrice * item.quantity,
    0
  );

  const estimatedProfit = subtotal - totalCost;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCheckout = async () => {
    setErrorMsg('');
    if (cart.length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const result = await processCheckout(selectedPaymentMethod);
      if (!result.success) {
        setErrorMsg(result.error || 'Checkout failed');
      } else {
        if (onCloseMobile) onCloseMobile();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <aside className="cart-panel">
      {/* Header */}
      <div className="cart-header">
        <div className="cart-title">
          <ShoppingBag size={20} color="var(--accent-primary)" />
          <span>Current Order ({totalItemsCount})</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {cart.length > 0 && (
            <button className="clear-btn" onClick={clearCart} title="Clear Cart">
              <Trash2 size={14} />
              <span>Clear</span>
            </button>
          )}

          {onCloseMobile && (
            <button
              className="icon-btn"
              onClick={onCloseMobile}
              style={{ width: 32, height: 32, border: 'none', background: 'transparent' }}
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Cart Items List */}
      <div className="cart-items">
        {cart.length === 0 ? (
          <div className="cart-empty">
            <ShoppingBag size={48} strokeWidth={1.5} color="var(--border-light)" />
            <p style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>
              Cart is empty
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Click products to add them to this order.
            </p>
          </div>
        ) : (
          cart.map(({ product, quantity, soldPrice }) => {
            const lineSubtotal = (soldPrice || 0) * quantity;
            return (
              <div key={product.id} className="cart-item" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {/* Product Thumbnail */}
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    flexShrink: 0,
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '4px',
                        objectFit: 'cover'
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: '1.2rem' }}>🧴</span>
                  )}
                </div>

                <div className="item-info" style={{ flex: 1, minWidth: 0 }}>
                  <div className="item-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {product.name}
                  </div>
                  <div className="item-price" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.4rem' }}>
                    <span>ETB</span>
                    <input 
                      type="number" 
                      value={soldPrice}
                      onChange={(e) => updateCartItemPrice(product.id, e.target.value)}
                      style={{ width: '60px', padding: '0.2rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)' }}
                      min="0"
                    />
                    <span>× {quantity}</span>
                  </div>
                </div>

                <div className="item-controls">
                  <button
                    className="qty-btn"
                    onClick={() => updateCartQuantity(product.id, -1)}
                    title="Decrease"
                  >
                    <Minus size={14} />
                  </button>

                  <span className="qty-count">{quantity}</span>

                  <button
                    className="qty-btn"
                    onClick={() => updateCartQuantity(product.id, 1)}
                    disabled={quantity >= product.currentStock}
                    title={
                      quantity >= product.currentStock
                        ? 'Max stock reached'
                        : 'Increase'
                    }
                    style={{
                      opacity: quantity >= product.currentStock ? 0.4 : 1,
                      cursor: quantity >= product.currentStock ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span className="item-subtotal">{lineSubtotal} ETB</span>
                  <button
                    onClick={() => removeFromCart(product.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      padding: '0.2rem'
                    }}
                    title="Remove item"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Cart Footer / Checkout Form */}
      {cart.length > 0 && (
        <div className="cart-footer">
          {errorMsg && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'var(--danger-bg)',
                color: 'var(--danger)',
                padding: '0.6rem 0.8rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 600
              }}
            >
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Subtotal & Profit Summary */}
          <div className="summary-rows">
            <div className="summary-row">
              <span>Selected Items:</span>
              <span>{totalItemsCount} units</span>
            </div>

            <div className="summary-row profit">
              <span>Est. Order Profit:</span>
              <span>+{estimatedProfit} ETB</span>
            </div>

            <div className="summary-row total">
              <span>Total Payable:</span>
              <span>{subtotal} ETB</span>
            </div>
          </div>

          {/* Payment Method Select Dropdown */}
          <div className="payment-section">
            <label className="payment-label">Payment Method</label>
            <select
              className="payment-select"
              value={selectedPaymentMethod}
              onChange={(e) => setSelectedPaymentMethod(e.target.value)}
            >
              <option value="Cash">💵 Cash</option>
              <option value="Telebirr">📱 Telebirr</option>
              <option value="Bank">🏦 Bank Transfer</option>
            </select>
          </div>

          {/* Checkout Button */}
          <button
            className="checkout-btn"
            onClick={handleCheckout}
            disabled={isSubmitting}
            style={{
              opacity: isSubmitting ? 0.75 : 1,
              cursor: isSubmitting ? 'not-allowed' : 'pointer'
            }}
          >
            {isSubmitting ? (
              <>
                <span
                  style={{
                    width: 18,
                    height: 18,
                    border: '2px solid rgba(255,255,255,0.4)',
                    borderTopColor: '#fff',
                    borderRadius: '50%',
                    animation: 'spin 0.65s linear infinite',
                    display: 'inline-block'
                  }}
                />
                <span>Processing Order…</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={20} />
                <span>Complete Order ({subtotal} ETB)</span>
              </>
            )}
          </button>
        </div>
      )}
    </aside>
  );
};
