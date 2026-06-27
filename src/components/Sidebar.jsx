import React, { useEffect, useState } from 'react';
import { User, Info, LogOut, X, ShieldAlert, Award, Compass, ChevronRight, Phone, Mail, Bike, ArrowLeft, Heart, Zap, Edit3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Drag handle pill shown at top of every bottom sheet panel
const SheetHandle = ({ onClose }) => (
  <div style={{ padding: '12px 16px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
    <div
      onClick={onClose}
      style={{
        width: '40px', height: '4px',
        background: 'rgba(255,255,255,0.18)',
        borderRadius: '2px',
        cursor: 'pointer'
      }}
    />
  </div>
);

export default function Sidebar({ isOpen, onClose, onShowToast }) {
  const [profile, setProfile] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
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
    } else {
      // Reset sub-views when drawer closes
      setShowProfile(false);
      setShowLogoutConfirm(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const initials = profile
    ? `${profile.firstName?.[0] || ''}${profile.lastName?.[0] || ''}`.toUpperCase() || '?'
    : '?';

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    localStorage.removeItem('rydr_rider_profile');
    localStorage.removeItem('rydr_rider');
    localStorage.removeItem('ridesync_rider');
    sessionStorage.clear();
    onClose();
    onShowToast('Logged out successfully 👋', 'success');
    navigate('/');
  };

  const menuItems = [
    { icon: <Compass size={17} />, label: 'Dashboard', action: () => { onClose(); navigate('/dashboard'); } },
    { icon: <User size={17} />, label: 'Profile', action: () => setShowProfile(true) },
    { icon: <Award size={17} />, label: 'Rider Badges', action: () => { onClose(); onShowToast('Earn badges by completing group rides! 🏆', 'success'); } },
    { icon: <ShieldAlert size={17} />, label: 'Safety Guidelines', action: () => { onClose(); onShowToast('Wear full gear, enable GPS, keep emergency contacts updated. Stay safe! 🛡️', 'success'); } },
  ];

  // ─── PROFILE DETAIL VIEW ───────────────────────────────────────────────────
  if (showProfile) {
    const rows = [
      { icon: <User size={15} />, label: 'Full Name', value: profile ? `${profile.firstName} ${profile.lastName || ''}`.trim() : '—' },
      { icon: <Mail size={15} />, label: 'Email', value: profile?.email || '—' },
      { icon: <Phone size={15} />, label: 'Contact', value: profile?.contact || '—' },
      { icon: <ShieldAlert size={15} />, label: 'Emergency', value: profile?.emergencyContact || '—', accent: '#EF4444' },
      { icon: <Heart size={15} />, label: 'Blood Group', value: profile?.bloodGroup || '—', accent: '#EF4444' },
      { icon: <Bike size={15} />, label: 'Bike', value: profile ? `${profile.bikeBrand || ''} ${profile.bikeModel || ''}`.trim() || '—' : '—', accent: '#F97316' },
      { icon: <Compass size={15} />, label: 'Ride Style', value: profile?.rideStyle || '—' },
      { icon: <Zap size={15} />, label: 'Pace', value: profile?.pace ? profile.pace.charAt(0).toUpperCase() + profile.pace.slice(1) : '—' },
    ];

    return (
      <>
        <div className="sidebar-overlay" onClick={onClose} />
        <div className="sidebar">
          <SheetHandle onClose={onClose} />

          {/* Profile view header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '14px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
          }}>
            <button
              onClick={() => setShowProfile(false)}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '8px', width: '32px', height: '32px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#A1A1AA', cursor: 'pointer', flexShrink: 0,
              }}
            >
              <ArrowLeft size={16} />
            </button>
            <span style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1rem', color: '#F4F4F5' }}>
              Rider Profile
            </span>
            <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#52525B', cursor: 'pointer', padding: '4px' }}>
              <X size={16} />
            </button>
          </div>

          {/* Avatar + name hero */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '20px 20px 16px',
            background: 'linear-gradient(to bottom, rgba(249,115,22,0.04), transparent)',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
          }}>
            <div className="sidebar-avatar" style={{ width: '60px', height: '60px', fontSize: '1.4rem', marginBottom: '10px' }}>
              {initials}
            </div>
            <div style={{ fontFamily: 'Outfit', fontSize: '1.2rem', fontWeight: 800, color: '#F4F4F5', letterSpacing: '-0.3px' }}>
              {profile ? `${profile.firstName} ${profile.lastName || ''}`.trim() : 'No Profile'}
            </div>
            {profile?.bikeModel && (
              <span style={{
                marginTop: '8px',
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.18)',
                borderRadius: '999px', padding: '4px 12px',
                fontSize: '0.72rem', fontWeight: 700, color: '#F97316',
              }}>
                🏍️ {profile.bikeBrand} {profile.bikeModel}
              </span>
            )}
          </div>

          {/* Profile details list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {rows.map((row, idx) => (
              <div key={idx} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '11px 14px', borderRadius: '12px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.04)',
              }}>
                <span style={{ color: row.accent || '#52525B', flexShrink: 0 }}>{row.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.64rem', color: '#3F3F46', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {row.label}
                  </div>
                  <div style={{
                    fontSize: '0.84rem', fontWeight: 600,
                    color: row.value === '—' ? '#3F3F46' : (row.accent || '#F4F4F5'),
                    marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {row.value}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Edit profile button */}
          <div style={{ padding: '12px 14px 32px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <button
              className="btn btn-secondary"
              style={{ borderRadius: '12px', fontSize: '0.85rem' }}
              onClick={() => { onClose(); navigate('/edit-profile'); }}
            >
              <Edit3 size={15} /> Edit Profile Details
            </button>
          </div>
        </div>
      </>
    );
  }

  // ─── LOGOUT CONFIRM VIEW ──────────────────────────────────────────────────
  if (showLogoutConfirm) {
    return (
      <>
        <div className="sidebar-overlay" onClick={() => setShowLogoutConfirm(false)} />
        <div className="sidebar">
          <SheetHandle onClose={() => setShowLogoutConfirm(false)} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 24px 32px' }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '50%',
              background: 'rgba(239,68,68,0.10)', border: '1.5px solid rgba(239,68,68,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '16px',
            }}>
              <LogOut size={22} style={{ color: '#EF4444' }} />
            </div>
            <h3 style={{ fontFamily: 'Outfit', fontSize: '1.1rem', fontWeight: 800, color: '#fff', textAlign: 'center', marginBottom: '8px' }}>
              Sign Out?
            </h3>
            <p style={{ color: '#71717A', fontSize: '0.78rem', textAlign: 'center', lineHeight: '1.5', marginBottom: '28px' }}>
              Your local profile data will be cleared. You'll need to log in again.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
              <button className="btn btn-danger" style={{ borderRadius: '12px' }} onClick={confirmLogout}>
                <LogOut size={15} /> Yes, Sign Out
              </button>
              <button className="btn btn-secondary" style={{ borderRadius: '12px' }} onClick={() => setShowLogoutConfirm(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ─── MAIN SIDEBAR ─────────────────────────────────────────────────────────
  return (
    <>
      <div className="sidebar-overlay" onClick={onClose} />
      <div className="sidebar">
        <SheetHandle onClose={onClose} />

        {/* Profile section */}
        <div className="sidebar-profile" style={{ borderTop: 'none' }}>
          <div className="sidebar-avatar">{initials}</div>
          <div>
            <div className="sidebar-name">
              {profile ? `${profile.firstName} ${profile.lastName || ''}`.trim() : 'No Profile'}
            </div>
            <div className="sidebar-sub">
              {profile ? (
                <>
                  {profile.bloodGroup && (
                    <span style={{ color: '#EF4444', display: 'block' }}>
                      🩸 {profile.bloodGroup}
                      {profile.contact && `  ·  📞 ${profile.contact}`}
                    </span>
                  )}
                  {profile.bikeModel && (
                    <span style={{ color: '#F97316', marginTop: '2px', display: 'block' }}>
                      🏍️ {profile.bikeBrand} {profile.bikeModel}
                    </span>
                  )}
                </>
              ) : (
                'Create a profile to start tracking'
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="sidebar-menu">
          {menuItems.map((item, idx) => (
            <button key={idx} className="sidebar-item" onClick={item.action}>
              <span style={{ color: '#52525B' }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              <ChevronRight size={14} style={{ color: '#3F3F46' }} />
            </button>
          ))}

          <div style={{ height: '1px', background: 'rgba(255,255,255,0.04)', margin: '8px 14px' }} />

          <button className="sidebar-item" onClick={() => { onClose(); onShowToast('🏍️ RydrPack v2.0 — Ride together, stay together.', 'success'); }}>
            <span style={{ color: '#52525B' }}><Info size={17} /></span>
            <span style={{ flex: 1 }}>About RydrPack</span>
            <ChevronRight size={14} style={{ color: '#3F3F46' }} />
          </button>
        </div>

        {/* Logout */}
        <div style={{ padding: '14px 10px 32px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <button className="sidebar-item danger" onClick={handleLogout} style={{ width: '100%', borderRadius: '10px' }}>
            <LogOut size={17} />
            <span style={{ flex: 1 }}>Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
}
