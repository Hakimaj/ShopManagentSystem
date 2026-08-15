import React from 'react';

export const Spinner = ({ size = 20, color = 'var(--accent-primary)', style = {} }) => (
  <span
    role="status"
    aria-label="Loading…"
    style={{
      display: 'inline-block',
      width: size,
      height: size,
      border: `${Math.max(2, size / 8)}px solid var(--border-color)`,
      borderTopColor: color,
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
      flexShrink: 0,
      ...style
    }}
  />
);
