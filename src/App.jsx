import React, { useState } from 'react';
import { ShopProvider, useShop } from './context/ShopContext';
import { Navbar } from './components/Navbar';
import { POSCatalog } from './components/POSCatalog';
import { CartPanel } from './components/CartPanel';
import { InventoryManager } from './components/InventoryManager';
import { SalesDashboard } from './components/SalesDashboard';
import { TransactionModal } from './components/TransactionModal';
import { ShoppingCart } from 'lucide-react';

const AppContent = () => {
  const { activeTab, cart } = useShop();
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce(
    (sum, item) => sum + item.product.sellingPrice * item.quantity,
    0
  );

  return (
    <div className="app-container">
      <Navbar />

      <main className="main-content">
        {activeTab === 'pos' && (
          <div className="pos-layout">
            <POSCatalog />
            
            {/* Desktop Cart Side Drawer (Hidden on Mobile via CSS) */}
            <div className="desktop-cart-wrapper">
              <CartPanel />
            </div>

            {/* Floating Mobile View Cart Button Bar (Visible on Mobile via CSS) */}
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

        {activeTab === 'inventory' && <InventoryManager />}

        {activeTab === 'dashboard' && <SalesDashboard />}
      </main>

      <TransactionModal />
    </div>
  );
};

export default function App() {
  return (
    <ShopProvider>
      <AppContent />
    </ShopProvider>
  );
}
