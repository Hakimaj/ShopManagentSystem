import React from 'react';
import { useShop } from '../context/ShopContext';
import { useAuth } from '../context/AuthContext';
import {
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

  const navItems = [
    { id: 'pos', icon: <ShoppingBag size={20} />, label: 'POS Terminal', badge: cartItemsCount > 0 ? cartItemsCount : null },
    { id: 'inventory', icon: <Package size={20} />, label: 'Inventory Stock', badge: null },
    { id: 'dashboard', icon: <TrendingUp size={20} />, label: 'Sales & Revenue', badge: null }
  ];

  return (
    <>
      <header className="navbar">
        <div className="brand-section">
          <img
            src="https://lh3.googleusercontent.com/d/1gEuI5_8YF6aRR1R2vYRDZutkr5jdy1lg"
            alt="Juju Clean Logo"
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              objectFit: 'cover'
            }}
          />
          <div>
            <div className="brand-title">ጁጁ ጽዳት</div>
          </div>
          <span className="brand-tag">Household &amp; Care</span>
        </div>

        {/* Desktop center nav tabs */}
        <nav className="nav-tabs">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`tab-btn ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.badge && (
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
                  {item.badge}
                </span>
              )}
            </button>
          ))}
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

      {/* Mobile bottom navigation bar */}
      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`tab-btn ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id)}
            aria-label={item.label}
          >
            {item.icon}
            <span>{item.label}</span>
            {item.badge && (
              <span
                style={{
                  background: 'var(--accent-primary)',
                  color: '#fff',
                  fontSize: '0.65rem',
                  padding: '0.1rem 0.35rem',
                  borderRadius: '999px',
                  fontWeight: 700,
                  lineHeight: 1
                }}
              >
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>
    </>
  );
};
