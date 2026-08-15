import React from 'react';
import { useShop } from '../context/ShopContext';
import { useAuth } from '../context/AuthContext';
import {
  Store,
  ShoppingBag,
  Package,
  TrendingUp,
  Sun,
  Moon,
  ShieldCheck,
  UserCircle,
  LogOut
} from 'lucide-react';

export const Navbar = () => {
  const { activeTab, setActiveTab, theme, toggleTheme, cart } = useShop();
  const { currentUser, isAuthenticated, logout } = useAuth();

  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const roleLabel = currentUser?.role === 'ADMIN' ? 'Admin' : 'Staff';
  const displayName = currentUser?.full_name || currentUser?.username || 'User';

  return (
    <header className="navbar">
      <div className="brand-section">
        <div
          className="brand-logo"
          style={{
            background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff'
          }}
        >
          <Store size={20} />
        </div>
        <div>
          <div className="brand-title">Cleancare POS</div>
        </div>
        <span className="brand-tag">Household &amp; Care</span>
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
          <span>Sales &amp; Revenue</span>
        </button>
      </nav>

      <div className="nav-actions">
        {/* User identity badge */}
        {isAuthenticated && currentUser ? (
          <div
            className="user-badge"
            title={`${displayName} — ${roleLabel}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'default' }}
          >
            <ShieldCheck size={16} color="var(--success)" />
            <span style={{ maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayName}
            </span>
            <span
              style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '0.1rem 0.4rem',
                borderRadius: '999px',
                background: currentUser.role === 'ADMIN' ? 'var(--accent-primary)' : 'var(--success)',
                color: '#fff',
                letterSpacing: '0.03em'
              }}
            >
              {roleLabel}
            </span>
          </div>
        ) : (
          <div className="user-badge" title="Not signed in">
            <UserCircle size={16} color="var(--text-muted)" />
            <span style={{ color: 'var(--text-muted)' }}>Guest</span>
          </div>
        )}

        {/* Theme toggle */}
        <button
          className="icon-btn"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Logout — only shown when authenticated */}
        {isAuthenticated && (
          <button
            id="logout-btn"
            className="icon-btn"
            onClick={logout}
            title="Sign Out"
            style={{ color: 'var(--danger)' }}
          >
            <LogOut size={18} />
          </button>
        )}
      </div>
    </header>
  );
};
