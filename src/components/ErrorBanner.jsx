import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Spinner } from './Spinner';

export const ErrorBanner = ({ message, onRetry, loading = false }) => (
  <div className="api-error-banner">
    <AlertCircle size={16} style={{ flexShrink: 0 }} />
    <span style={{ flex: 1 }}>{message || 'Something went wrong.'}</span>
    {onRetry && (
      <button
        onClick={onRetry}
        disabled={loading}
        style={{
          background: 'none',
          border: '1px solid currentColor',
          borderRadius: '6px',
          padding: '0.25rem 0.6rem',
          cursor: loading ? 'not-allowed' : 'pointer',
          color: 'inherit',
          fontWeight: 700,
          fontSize: '0.78rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.3rem',
          opacity: loading ? 0.6 : 1,
          whiteSpace: 'nowrap'
        }}
      >
        {loading ? <Spinner size={13} color="currentColor" /> : <RefreshCw size={13} />}
        Retry
      </button>
    )}
  </div>
);
