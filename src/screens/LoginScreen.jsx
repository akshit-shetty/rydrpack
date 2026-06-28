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

        const pendingRideId = sessionStorage.getItem('rydr_join_after_onboard');

        onShowToast(`Welcome back, ${riderRecord.first_name}! 🏍️`, 'success');

        setTimeout(() => {
          if (pendingRideId) {
            sessionStorage.removeItem('rydr_join_after_onboard');
            navigate(`/join-ride?rideId=${pendingRideId}`);
          } else {
            navigate('/dashboard');
          }
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
        overflowY: 'hidden',
      }}
    >
      {/* Top ambient glow */}
      <div style={{
        position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
        width: '300px', height: '200px',
        background: 'radial-gradient(ellipse, rgba(249,115,22,0.08) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0
      }} />

      {/* Back button row (floating absolute) */}
      <div style={{
        position: 'absolute', top: '16px', left: '16px', zIndex: 100,
      }}>
        <button className="icon-btn" onClick={() => navigate('/')} disabled={loading} style={{ width: '36px', height: '36px' }}>
          <ArrowLeft size={15} />
        </button>
      </div>

      {/* Brand mark (horizontal & compact) */}
      <div style={{
        position: 'relative', zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px 20px 0',
        gap: '8px',
      }}>
        <div style={{
          width: '32px', height: '32px',
          border: '1.5px solid rgba(249,115,22,0.2)',
          borderRadius: '8px',
          overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <img src="/rydrpack_logo.jpg" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <span style={{
          fontFamily: 'Outfit', fontWeight: 800, fontSize: '0.95rem',
          color: '#F4F4F5', letterSpacing: '-0.3px'
        }}>RydrPack</span>
      </div>

      {/* Login form */}
      <form
        onSubmit={handleLogin}
        style={{
          padding: '10px 20px 20px', flex: 1,
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
            padding: '16px 18px',
            borderRadius: '16px',
            boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
            display: 'flex', flexDirection: 'column',
            marginBottom: 0,
          }}
        >
          {/* Heading */}
          <div style={{ marginBottom: '10px' }}>
            <h2 style={{ fontFamily: 'Outfit', fontSize: '1.25rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>
              Welcome Back
            </h2>
            <p style={{ fontSize: '0.74rem', color: '#71717A', marginTop: '3px', lineHeight: '1.4' }}>
              Enter your credentials to access your rider profile.
            </p>
          </div>

          {/* Email field */}
          <div className="form-field" style={{ marginBottom: '8px' }}>
            <label className="field-label">Email Address</label>
            <div className="input-wrapper">
              <span className="input-icon" style={{ left: '12px' }}><Mail size={14} /></span>
              <input
                className="field-input"
                type="email"
                placeholder="e.g. akshay@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                autoComplete="email"
                style={{ padding: '11px 14px 11px 38px', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          {/* Password field */}
          <div className="form-field" style={{ marginBottom: '12px' }}>
            <label className="field-label">Password</label>
            <div className="input-wrapper">
              <span className="input-icon" style={{ left: '12px' }}><Lock size={14} /></span>
              <input
                className="field-input"
                type="password"
                placeholder="Enter your account password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="current-password"
                style={{ padding: '11px 14px 11px 38px', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          {/* Sign in button */}
          <button
            type="submit"
            className="btn btn-primary"
            style={{ borderRadius: '10px', fontSize: '0.85rem', fontWeight: 700, padding: '12px 20px' }}
            disabled={loading || !email.trim() || !password.trim()}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
            <LogIn size={15} />
          </button>

          {/* Caption */}
          <p style={{
            textAlign: 'center', fontSize: '0.72rem',
            color: '#3F3F46', marginTop: '10px',
            lineHeight: '1.5',
          }}>
            🔒 Your credentials are stored locally and synced securely.
          </p>

          {/* Sign up link */}
          <p style={{
            textAlign: 'center', fontSize: '0.82rem',
            color: '#52525B', marginTop: '12px',
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
