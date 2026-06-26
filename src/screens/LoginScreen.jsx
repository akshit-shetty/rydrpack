import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, LogIn, Lock, Navigation2 } from 'lucide-react';
import { supabase } from '../supabase';

export default function LoginScreen({ onShowToast }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email.trim()) {
      onShowToast('Please enter your registered email address', 'error');
      return;
    }
    if (!password.trim()) {
      onShowToast('Please enter your password', 'error');
      return;
    }

    setLoading(true);

    try {
      // Query the riders table in Supabase for this email, sorted by newest first
      const { data, error } = await supabase
        .from('riders')
        .select('*')
        .eq('email', email.trim().toLowerCase())
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      if (data && data.length > 0) {
        const riderRecord = data[0];

        // Verify password
        if (riderRecord.password && riderRecord.password !== password) {
          onShowToast('Incorrect password. Please try again.', 'error');
          setLoading(false);
          return;
        }

        // Reconstruct local profile cache
        const profile = {
          firstName: riderRecord.first_name,
          lastName: riderRecord.last_name,
          email: riderRecord.email,
          contact: riderRecord.contact,
          emergencyContact: riderRecord.emergency_contact,
          bloodGroup: riderRecord.blood_group,
          bikeBrand: riderRecord.bike_brand,
          bikeModel: riderRecord.bike_model,
          rideStyle: riderRecord.ride_style,
          pace: riderRecord.pace,
          riderId: riderRecord.rider_id
        };

        localStorage.setItem('rydr_rider_profile', JSON.stringify(profile));
        localStorage.setItem('rydr_rider_id', riderRecord.rider_id);

        onShowToast(`Welcome back, ${riderRecord.first_name}! 🏍️`, 'success');

        setTimeout(() => {
          navigate('/dashboard');
        }, 800);
      } else {
        onShowToast('Email not registered. Please create a new profile.', 'error');
      }

    } catch (err) {
      console.error('Login error:', err);
      onShowToast(`Login failed: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="page"
      style={{
        background: 'radial-gradient(ellipse 80% 50% at 50% 0%, #1a0e06 0%, #09090b 55%)',
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Top ambient glow */}
      <div style={{
        position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
        width: '300px', height: '200px',
        background: 'radial-gradient(ellipse, rgba(249,115,22,0.08) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0
      }} />

      {/* Back button row */}
      <div style={{
        position: 'relative', zIndex: 10,
        display: 'flex', alignItems: 'center',
        padding: '20px 20px 0',
      }}>
        <button className="icon-btn" onClick={() => navigate('/')} disabled={loading}>
          <ArrowLeft size={17} />
        </button>
      </div>

      {/* Brand mark */}
      <div style={{
        position: 'relative', zIndex: 10,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '28px 20px 8px',
        gap: '8px',
      }}>
        <div style={{
          width: '48px', height: '48px',
          background: '#0e0e10', border: '1.5px solid rgba(249,115,22,0.35)',
          borderRadius: '14px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 20px rgba(249,115,22,0.08)',
        }}>
          <Navigation2 size={20} style={{ color: '#F97316', fill: 'rgba(249,115,22,0.15)', transform: 'rotate(45deg) translate(-1px,-1px)' }} />
        </div>
        <span style={{
          fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.1rem',
          color: '#F4F4F5', letterSpacing: '-0.3px'
        }}>RydrPack</span>
      </div>

      {/* Login form */}
      <form
        onSubmit={handleLogin}
        style={{
          padding: '20px 20px 40px', flex: 1,
          display: 'flex', flexDirection: 'column',
          justifyContent: 'center', position: 'relative', zIndex: 10,
        }}
      >
        <div
          className="card"
          style={{
            background: 'rgba(14,14,16,0.7)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderTop: '2px solid rgba(249,115,22,0.35)',
            padding: '28px 24px',
            borderRadius: '24px',
            boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
            display: 'flex', flexDirection: 'column',
            marginBottom: 0,
          }}
        >
          {/* Heading */}
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontFamily: 'Outfit', fontSize: '1.6rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>
              Welcome Back
            </h2>
            <p style={{ fontSize: '0.78rem', color: '#71717A', marginTop: '6px', lineHeight: '1.5' }}>
              Enter your credentials to access your rider profile.
            </p>
          </div>

          {/* Email field */}
          <div className="form-field" style={{ marginBottom: '14px' }}>
            <label className="field-label">Email Address</label>
            <div className="input-wrapper">
              <span className="input-icon"><Mail size={16} /></span>
              <input
                className="field-input"
                type="email"
                placeholder="e.g. akshay@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password field */}
          <div className="form-field" style={{ marginBottom: '20px' }}>
            <label className="field-label">Password</label>
            <div className="input-wrapper">
              <span className="input-icon"><Lock size={16} /></span>
              <input
                className="field-input"
                type="password"
                placeholder="Enter your account password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="current-password"
              />
            </div>
          </div>

          {/* Sign in button */}
          <button
            type="submit"
            className="btn btn-primary"
            style={{ borderRadius: '12px', fontSize: '0.9rem', fontWeight: 700 }}
            disabled={loading || !email.trim() || !password.trim()}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
            <LogIn size={16} />
          </button>

          {/* Caption */}
          <p style={{
            textAlign: 'center', fontSize: '0.72rem',
            color: '#3F3F46', marginTop: '14px',
            lineHeight: '1.5',
          }}>
            🔒 Your credentials are stored locally and synced securely.
          </p>

          {/* Sign up link */}
          <p style={{
            textAlign: 'center', fontSize: '0.82rem',
            color: '#52525B', marginTop: '18px',
          }}>
            No account yet?{' '}
            <span
              onClick={() => navigate('/onboarding')}
              style={{ color: '#F97316', fontWeight: 700, cursor: 'pointer' }}
            >
              Create Profile
            </span>
          </p>
        </div>
      </form>
    </div>
  );
}
