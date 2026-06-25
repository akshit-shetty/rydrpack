import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, KeyRound, Check } from 'lucide-react';

export default function LandingScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    // If profile already exists, auto-redirect to dashboard
    try {
      const profileStr = localStorage.getItem('rydr_rider_profile');
      if (profileStr) {
        const profile = JSON.parse(profileStr);
        if (profile.firstName && profile.lastName) {
          navigate('/dashboard');
        }
      }
    } catch (e) {
      console.warn('No existing profile found:', e);
    }
  }, [navigate]);

  return (
    <div className="page" style={{ justifyContent: 'space-between', padding: '40px 24px' }}>
      
      {/* Brand Header */}
      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '56px',
          height: '56px',
          background: 'linear-gradient(135deg, #F97316, #FF5500)',
          borderRadius: '16px',
          boxShadow: '0 8px 24px rgba(249, 115, 22, 0.4)',
          marginBottom: '16px'
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M3 17h1.5l1.5-5h10l1.5 5H19" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="7.5" cy="17.5" r="1.5" fill="white" />
            <circle cx="16.5" cy="17.5" r="1.5" fill="white" />
            <path d="M9 12l1.5-5h3L15 12" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 style={{ fontFamily: 'Outfit', fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>
          Rydr
        </h1>
        <p style={{ color: '#A1A1AA', fontSize: '0.9rem', fontWeight: 500 }}>
          Ride together. Stay together.
        </p>
      </div>

      {/* Hero Visual Card */}
      <div style={{
        position: 'relative',
        height: '240px',
        borderRadius: '24px',
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
        margin: '20px 0'
      }}>
        {/* We can use CSS pattern matching a highway or motorcycle lights */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 30% 20%, #2e1a12 0%, #09090b 80%)'
        }} />
        
        {/* Animated glowing dots representing riders on a route */}
        <div style={{
          position: 'absolute',
          top: '40%',
          left: '15%',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: '#F97316',
          boxShadow: '0 0 12px #F97316'
        }} />
        <div style={{
          position: 'absolute',
          top: '55%',
          left: '45%',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: '#0EA5E9',
          boxShadow: '0 0 12px #0EA5E9'
        }} />
        <div style={{
          position: 'absolute',
          top: '35%',
          left: '75%',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: '#10B981',
          boxShadow: '0 0 12px #10B981'
        }} />
        
        {/* Dotted path connecting the dots */}
        <svg style={{ position: 'absolute', width: '100%', height: '100%', pointerEvents: 'none' }}>
          <path d="M 50 100 Q 150 150 250 80 T 350 120" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2" strokeDasharray="6,6" />
        </svg>

        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          right: '20px',
          background: 'rgba(9,9,11,0.8)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '16px',
          padding: '16px',
          boxSizing: 'border-box'
        }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981' }} />
            Live Cohort Tracking
          </h3>
          <p style={{ color: '#A1A1AA', fontSize: '0.78rem', lineHeight: '1.4' }}>
            Watch your pack on the map live. Automatically alert riders who fall behind or trigger an SOS.
          </p>
        </div>
      </div>

      {/* Action CTA Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', marginBottom: '20px' }}>
        <h2 style={{
          fontSize: '1.8rem',
          fontFamily: 'Outfit',
          fontWeight: 800,
          letterSpacing: '-0.5px',
          lineHeight: '1.2',
          textAlign: 'center',
          marginBottom: '6px'
        }}>
          Track Your Pack,<br />Never Ride Alone.
        </h2>
        
        <button className="btn btn-primary" onClick={() => navigate('/onboarding')}>
          <PlusCircle size={18} />
          Create Rider Profile
        </button>

        <button className="btn btn-outline" onClick={() => navigate('/login')} style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
          <KeyRound size={18} />
          Already registered? Log in
        </button>
      </div>

      {/* Trust & Tagline */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', fontSize: '0.75rem', color: '#52525B', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
        <span>✓ Real-time Location</span>
        <span>✓ No sign-up required for guests</span>
        <span>✓ Emergency SOS</span>
      </div>

    </div>
  );
}
