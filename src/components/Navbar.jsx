import React from 'react';
import { useShop } from '../context/ShopContext';
import {
  Sparkles,
  ShoppingBag,
  Package,
  TrendingUp,
  Sun,
  Moon,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';

export const Navbar = () => {
  const { activeTab, setActiveTab, theme, toggleTheme, resetToDefaults, cart } = useShop();

  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <header className="navbar">
      <div className="brand-section">
        <div className="brand-logo" style={{ background: 'linear-gradient(135deg, #0ea5e9, #6366f1)' }}>
          <Sparkles size={22} />
        </div>
        <div>
          <div className="brand-title">CleanCare POS</div>
        </div>
        <span className="brand-tag">Household & Care</span>
      </div>

      <nav className="nav-tabs">
        <button
          className={`tab-btn ${activeTab === 'pos' ? 'active' : ''}`}
          onClick={() => setActiveTab('pos')}
        >
          <ShoppingBag size={18} />
          <span>POS Terminal</span>
          {cartItemsCount > 0 && (
            <span
              style={{
                background: 'var(--accent-primary)',
                color: '#fff',
                fontSize: '0.7rem',
                padding: '0.1rem 0.4rem',
                borderRadius: '999px',
                fontWeight: 700
              }}
            >
              {cartItemsCount}
            </span>
          )}
        </button>

        <button
          className={`tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          <Package size={18} />
          <span>Inventory Stock</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <TrendingUp size={18} />
          <span>Sales & Revenue</span>
        </button>
      </nav>

      <div className="nav-actions">
        <div className="user-badge" title="Single User Admin Mode">
          <ShieldCheck size={16} color="var(--success)" />
          <span>Admin</span>
        </div>

        <button
          className="icon-btn"
          onClick={resetToDefaults}
          title="Reset to Sample Demo Data"
        >
          <RotateCcw size={18} />
        </button>

        <button
          className="icon-btn"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
};
