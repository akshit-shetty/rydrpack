import React from 'react';
import { Menu, Bell } from 'lucide-react';

export default function Header({ title = 'Rydr', onMenuClick, showMenu = true }) {
  return (
    <header className="app-header">
      <div className="logo-group">
        <div className="logo-badge">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M3 17h1.5l1.5-5h10l1.5 5H19"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="7.5" cy="17.5" r="1.5" fill="white" />
            <circle cx="16.5" cy="17.5" r="1.5" fill="white" />
            <path
              d="M9 12l1.5-5h3L15 12"
              stroke="white"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <span className="logo-text">{title}</span>
      </div>
      
      {showMenu && (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="icon-btn" aria-label="Notifications" onClick={() => alert('Notifications coming soon!')}>
            <Bell size={18} />
          </button>
          <button className="icon-btn" id="menuBtn" aria-label="Menu" onClick={onMenuClick}>
            <Menu size={18} />
          </button>
        </div>
      )}
    </header>
  );
}
