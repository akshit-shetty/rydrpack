import React, { useEffect, useState } from 'react';
import { User, Info, LogOut, X, ShieldAlert, Award, Compass } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Sidebar({ isOpen, onClose, onShowToast }) {
  const [profile, setProfile] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      try {
        const profileStr = localStorage.getItem('rydr_rider_profile');
        if (profileStr) {
          setProfile(JSON.parse(profileStr));
        }
      } catch (e) {
        console.error('Failed to parse rider profile:', e);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const initials = profile
    ? `${profile.firstName?.[0] || ''}${profile.lastName?.[0] || ''}`.toUpperCase() || '?'
    : '?';

  const handleEditProfile = () => {
    onClose();
    if (window.confirm('Edit your profile? This will let you update your rider details.')) {
      navigate('/onboarding');
    }
  };

  const handleLogout = () => {
    onClose();
    if (window.confirm('Are you sure you want to log out? Your local profile data will be cleared.')) {
      localStorage.removeItem('rydr_rider_profile');
      localStorage.removeItem('rydr_rider');
      localStorage.removeItem('ridesync_rider');
      sessionStorage.clear();
      onShowToast('Logged out successfully 👋', 'success');
      navigate('/');
    }
  };

  return (
    <>
      <div className="sidebar-overlay" onClick={onClose} />
      <div className="sidebar">
        {/* Drawer Close */}
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'none',
            border: 'none',
            color: '#A1A1AA',
            cursor: 'pointer'
          }}
          aria-label="Close menu"
        >
          <X size={20} />
        </button>

        {/* Profile Card */}
        <div className="sidebar-profile">
          <div className="sidebar-avatar">{initials}</div>
          <div>
            <div className="sidebar-name">
              {profile ? `${profile.firstName} ${profile.lastName || ''}`.trim() : 'No Profile'}
            </div>
            <div className="sidebar-sub">
              {profile ? (
                <>
                  {profile.bloodGroup && <span style={{ color: '#EF4444' }}>🩸 {profile.bloodGroup}</span>}
                  {profile.contact && `  ·  📞 ${profile.contact}`}
                </>
              ) : (
                'Create a profile to start tracking'
              )}
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="sidebar-menu">
          <button className="sidebar-item" onClick={() => { onClose(); navigate('/dashboard'); }}>
            <Compass size={18} />
            Explore Dashboard
          </button>
          
          <button className="sidebar-item" onClick={handleEditProfile}>
            <User size={18} />
            Edit Profile
          </button>

          <button className="sidebar-item" onClick={() => { onClose(); alert('Rydr achievements & biker badges are active. Earn badges by completing group rides!'); }}>
            <Award size={18} />
            Rider Badges
          </button>

          <button className="sidebar-item" onClick={() => { onClose(); alert('Safety Tools: Enable GPS, wear a helmet, and keep your emergency contacts updated in your profile.'); }}>
            <ShieldAlert size={18} />
            Safety Guidelines
          </button>
          
          <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.05)', margin: '10px 16px' }} />
          
          <button className="sidebar-item" onClick={() => { onClose(); onShowToast('🏍️ Rydr v2.0 — Ride together, stay together.', 'success'); }}>
            <Info size={18} />
            About Rydr
          </button>
        </div>

        {/* Logout at bottom */}
        <div style={{ padding: '16px 12px 32px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <button className="sidebar-item danger" onClick={handleLogout} style={{ width: '100%' }}>
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </div>
    </>
  );
}
