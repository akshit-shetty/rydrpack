import React from 'react';
import { Menu, Bell, Navigation2 } from 'lucide-react';

export default function Header({ title = 'RydrPack', onMenuClick, showMenu = true }) {
  return (
    <header className="app-header">
      <div className="logo-group">
        <div className="logo-badge" style={{ overflow: 'hidden', padding: 0, border: '1.5px solid rgba(249,115,22,0.2)' }}>
          <img src="/rydrpack_logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>
        <span className="logo-text">{title}</span>
      </div>

      {showMenu && (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="icon-btn"
            aria-label="Notifications"
            onClick={() => alert('Notifications coming soon!')}
          >
            <Bell size={17} />
          </button>
          <button
            className="icon-btn"
            id="menuBtn"
            aria-label="Open menu"
            onClick={onMenuClick}
          >
            <Menu size={17} />
          </button>
        </div>
      )}
    </header>
  );
}
