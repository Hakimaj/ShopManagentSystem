import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ShopProvider, useShop } from './context/ShopContext';
import { Navbar } from './components/Navbar';
import { POSCatalog } from './components/POSCatalog';
import { CartPanel } from './components/CartPanel';
import { InventoryManager } from './components/InventoryManager';
import { SalesDashboard } from './components/SalesDashboard';
import { TransactionModal } from './components/TransactionModal';
import { LoginModal } from './components/LoginModal';
import { ShoppingCart, Sparkles } from 'lucide-react';

const AppContent = () => {
  const { activeTab, cart } = useShop();
  const { isAuthenticated, authLoading } = useAuth();
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce(
    (sum, item) => sum + item.product.sellingPrice * item.quantity,
    0
  );

  // Show a minimal splash while checking stored JWT
  if (authLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          background: 'var(--bg-main)'
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Sparkles size={24} color="#fff" />
        </div>
        <span
          style={{
            width: 28,
            height: 28,
            border: '3px solid var(--border-color)',
            borderTopColor: 'var(--accent-primary)',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
            display: 'inline-block'
          }}
        />
      </div>
    );
  }

  return (
    <div className="app-container">
      <Navbar />

      {/* Login modal — shown as an overlay when not authenticated. 
          POS catalog is still rendered behind it (blurred) per design decision. */}
      {!isAuthenticated && <LoginModal />}

      <main className="main-content">
        {activeTab === 'pos' && (
          <div className="pos-layout">
            <POSCatalog />

            {/* Desktop Cart Side Drawer */}
            <div className="desktop-cart-wrapper">
              <CartPanel />
            </div>

            {/* Floating Mobile View Cart Button Bar */}
            <div className="mobile-cart-bar">
              <button
                className="mobile-cart-btn"
                onClick={() => setIsMobileCartOpen(true)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <ShoppingCart size={20} />
                  <span>View Cart ({totalItemsCount} items)</span>
                </div>
                <span style={{ fontWeight: 800 }}>{subtotal} ETB</span>
              </button>
            </div>

            {/* Mobile Slide-Up Bottom Sheet Modal */}
            {isMobileCartOpen && (
              <div
                className="bottom-sheet-overlay"
                onClick={() => setIsMobileCartOpen(false)}
              >
                <div
                  className="bottom-sheet-card"
                  onClick={(e) => e.stopPropagation()}
                >
                  <CartPanel onCloseMobile={() => setIsMobileCartOpen(false)} />
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'inventory' && (
          isAuthenticated ? <InventoryManager /> : null
        )}

        {activeTab === 'dashboard' && (
          isAuthenticated ? <SalesDashboard /> : null
        )}
      </main>

      <TransactionModal />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ShopProvider>
        <AppContent />
      </ShopProvider>
    </AuthProvider>
  );
}
