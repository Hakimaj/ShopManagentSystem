import React from 'react';
import { useShop } from '../context/ShopContext';
import { CheckCircle2, Building2, Smartphone, Banknote, X } from 'lucide-react';

export const TransactionModal = () => {
  const { isTxnModalOpen, setIsTxnModalOpen, lastTransaction } = useShop();

  if (!isTxnModalOpen || !lastTransaction) return null;

  const getPaymentIcon = (method) => {
    switch (method) {
      case 'Bank':
        return <Building2 size={14} />;
      case 'Telebirr':
        return <Smartphone size={14} />;
      case 'Cash':
        return <Banknote size={14} />;
      default:
        return null;
    }
  };

  return (
    <div className="modal-overlay" onClick={() => setIsTxnModalOpen(false)}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)' }}>
            <CheckCircle2 size={24} />
            <span>Transaction Complete!</span>
          </div>
          <button
            className="icon-btn"
            onClick={() => setIsTxnModalOpen(false)}
            style={{ border: 'none', background: 'transparent' }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Order Reference</span>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, fontFamily: 'monospace' }}>
              {lastTransaction.id}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justify: 'space-between',
              alignItems: 'center',
              background: 'var(--bg-card)',
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)'
            }}
          >
            <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>Payment Method</span>
            <span className={`pm-badge ${lastTransaction.paymentMethod}`}>
              {getPaymentIcon(lastTransaction.paymentMethod)}
              <span>{lastTransaction.paymentMethod}</span>
            </span>
          </div>

          <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              Purchased Items
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.4rem' }}>
              {lastTransaction.items.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justify: 'space-between',
                    fontSize: '0.85rem'
                  }}
                >
                  <span style={{ color: 'var(--text-primary)' }}>
                    {item.name} <strong style={{ color: 'var(--accent-primary)' }}>x{item.quantity}</strong>
                  </span>
                  <span style={{ fontWeight: 700 }}>
                    {item.sellingPrice * item.quantity} ETB
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justify: 'space-between',
              background: 'var(--bg-main)',
              padding: '0.85rem',
              borderRadius: '10px',
              border: '1px solid var(--border-color)'
            }}
          >
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Total Paid</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{lastTransaction.totalRevenue} ETB</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Realized Profit</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)' }}>
                +{lastTransaction.totalProfit} ETB
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-primary" onClick={() => setIsTxnModalOpen(false)}>
            Close & Continue
          </button>
        </div>
      </div>
    </div>
  );
};
