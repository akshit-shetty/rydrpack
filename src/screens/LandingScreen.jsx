import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Navigation2,
  ChevronRight,
  Map,
  Shield,
  AlertTriangle,
  UserPlus,
  LogIn
} from 'lucide-react';

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

  const features = [
    { num: '01', icon: <Map size={18} />, label: 'Live GPS' },
    { num: '02', icon: <Shield size={18} />, label: 'Proximity' },
    { num: '03', icon: <AlertTriangle size={18} />, label: 'SOS Radar' },
  ];

  return (
    <div
      className="page"
      style={{
        background: '#070709',
        overflowY: 'hidden',
        minHeight: '100dvh',
        padding: '0',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Ambient top glow */}
      <div style={{
        position: 'absolute', top: 0, left: '50%',
        transform: 'translateX(-50%)',
        width: '400px', height: '300px',
        background: 'radial-gradient(ellipse, rgba(249,115,22,0.12) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0
      }} />

      {/* HEADER */}
      <header style={{
        position: 'relative', zIndex: 10,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          {/* Logo badge */}
          <div style={{
            width: '34px', height: '34px',
            border: '1.5px solid rgba(249,115,22,0.2)',
            borderRadius: '10px',
            overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
          }}>
            <img src="/rydrpack_logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            {/* Live dot */}
            <span style={{
              position: 'absolute', top: '-1px', right: '-1px',
              width: '7px', height: '7px',
              borderRadius: '50%', background: '#F97316',
              border: '1.5px solid #070709',
              animation: 'pulse-ring 2.5s infinite',
              zIndex: 2,
            }} />
          </div>
          <span style={{
            fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.05rem',
            color: '#F4F4F5', letterSpacing: '-0.3px'
          }}>RydrPack</span>
        </div>
      </header>

      {/* HERO TEXT */}
      <main style={{
        position: 'relative', zIndex: 10,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        textAlign: 'center', padding: '60px 20px 0',
      }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.05 }}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
        >
          <h1 style={{
            fontFamily: 'Outfit', fontSize: '2.1rem', lineHeight: 1.08,
            fontWeight: 900, color: '#fff', letterSpacing: '-1px',
            textTransform: 'uppercase',
          }}>
            Ride Together.<br />
            <span style={{
              background: 'linear-gradient(135deg, #F97316, #ff5f00)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              Stay Together.
            </span>
          </h1>

          <p style={{
            color: '#71717A', fontSize: '0.82rem', margin: '12px auto 0',
            maxWidth: '260px', lineHeight: '1.6', fontWeight: 400,
            textAlign: 'center'
          }}>
            The ultimate real-time navigation and safety assistant for group motorcycle rides.
          </p>
        </motion.div>
      </main>

      {/* HERO IMAGE */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, delay: 0.15 }}
        style={{
          position: 'relative', zIndex: 10,
          margin: '10px 24px',
          borderRadius: '16px',
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 12px 30px rgba(0,0,0,0.7)',
          height: '120px',
          background: '#0e0e10',
        }}
      >
        <img
          src="/group_riders.png"
          alt="Group of Riders in Sequence"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: 0.92 }}
        />
        {/* Bottom fade */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, #070709 0%, transparent 55%)',
          pointerEvents: 'none',
        }} />
      </motion.div>

      {/* FEATURE CARDS */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.25 }}
        style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
          gap: '10px', padding: '0 24px', zIndex: 10, position: 'relative',
        }}
      >
        {features.map((f) => (
          <div key={f.num} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: '6px', padding: '10px 8px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '12px',
            position: 'relative',
          }}>
            <span style={{
              position: 'absolute', top: '8px', left: '8px',
              fontSize: '0.6rem', fontWeight: 800, color: 'rgba(249,115,22,0.4)',
              fontFamily: 'Outfit', letterSpacing: '0.5px',
            }}>{f.num}</span>
            <div style={{ color: 'rgba(249,115,22,0.85)' }}>{f.icon}</div>
            <span style={{
              fontSize: '0.68rem', fontWeight: 700,
              color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.5px',
              textAlign: 'center',
            }}>{f.label}</span>
          </div>
        ))}
      </motion.div>

      {/* CTA */}
      <footer style={{
        position: 'relative', zIndex: 10,
        display: 'flex', flexDirection: 'column', gap: '8px',
        padding: '12px 24px 20px',
        marginTop: 'auto',
      }}>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/onboarding')}
          className="btn btn-primary"
          style={{
            borderRadius: '14px', fontSize: '0.88rem',
            fontWeight: 700, letterSpacing: '0.2px',
            padding: '13px 24px',
          }}
        >
          <UserPlus size={17} />
          Create Rydr Profile
          <ChevronRight size={16} />
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/login')}
          className="btn btn-primary"
          style={{
            borderRadius: '14px', fontSize: '0.88rem',
            fontWeight: 700, letterSpacing: '0.2px',
            padding: '13px 24px',
          }}
        >
          <LogIn size={17} />
          Already a Rydr?
          <ChevronRight size={16} />
        </motion.button>

        <p style={{
          fontSize: '0.65rem', color: '#3F3F46',
          textAlign: 'center', fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '1.5px',
          marginTop: '6px'
        }}>
          RydrPack · v2.0
        </p>
      </footer>
    </div>
  );
}
