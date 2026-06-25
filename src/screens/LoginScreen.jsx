import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, LogIn, Sparkles, Lock } from 'lucide-react';
import Header from '../components/Header';
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
      // Query the riders table in Supabase for this email
      const { data, error } = await supabase
        .from('riders')
        .select('*')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      if (data) {
        // Verify password
        if (data.password && data.password !== password) {
          onShowToast('Incorrect password. Please try again.', 'error');
          setLoading(false);
          return;
        }

        // Reconstruct local profile cache
        const profile = {
          firstName: data.first_name,
          lastName: data.last_name,
          email: data.email,
          contact: data.contact,
          emergencyContact: data.emergency_contact,
          bloodGroup: data.blood_group,
          bikeBrand: data.bike_brand,
          bikeModel: data.bike_model,
          rideStyle: data.ride_style,
          pace: data.pace,
          riderId: data.rider_id
        };

        localStorage.setItem('rydr_rider_profile', JSON.stringify(profile));
        localStorage.setItem('rydr_rider_id', data.rider_id);

        onShowToast(`Welcome back, ${data.first_name}! 🏍️`, 'success');
        
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
    <div className="page" style={{ background: '#09090b', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header */}
      <header className="app-header">
        <button className="icon-btn" onClick={() => navigate('/')} disabled={loading}>
          <ArrowLeft size={18} />
        </button>
        <span className="logo-text" style={{ fontSize: '1.15rem' }}>Rider Login</span>
        <span style={{ width: '40px' }} />
      </header>

      <form onSubmit={handleLogin} style={{ padding: '24px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        
        <div style={{ marginTop: '20px', marginBottom: '30px' }}>
          <h2 style={{ fontFamily: 'Outfit', fontSize: '1.6rem', fontWeight: 900, color: '#fff' }}>
            Welcome Back
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#A1A1AA', marginTop: '6px' }}>
            Enter your email and password to retrieve your profile and riding metrics.
          </p>
        </div>

        {/* Email Input Field */}
        <div className="form-field">
          <label className="field-label">Email Address</label>
          <div className="input-wrapper">
            <span className="input-icon"><Mail size={18} /></span>
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

        {/* Password Input Field */}
        <div className="form-field" style={{ marginTop: '14px' }}>
          <label className="field-label">Password</label>
          <div className="input-wrapper">
            <span className="input-icon"><Lock size={18} /></span>
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

        {/* Info card */}
        <div className="card" style={{ marginTop: '10px', background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
          <h4 style={{ fontSize: '0.8rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={14} color="#F97316" /> Database Connected
          </h4>
          <p style={{ fontSize: '0.72rem', color: '#A1A1AA', marginTop: '4px', lineHeight: '1.4' }}>
            Logging in retrieves your saved bike model, emergency contact configs, and accumulated travel odometer logs directly from Supabase.
          </p>
        </div>

        {/* Action button */}
        <button 
          type="submit" 
          className="btn btn-primary"
          style={{ marginTop: 'auto', marginBottom: '10px' }}
          disabled={loading || !email.trim() || !password.trim()}
        >
          {loading ? 'Authenticating...' : 'Log In'}
          <LogIn size={16} style={{ marginLeft: '4px' }} />
        </button>

        {/* Direct link to sign up */}
        <p style={{ textAlign: 'center', fontSize: '0.8rem', color: '#52525B', marginTop: '10px' }}>
          Don't have a profile?{' '}
          <span 
            onClick={() => navigate('/onboarding')} 
            style={{ color: '#F97316', fontWeight: 600, cursor: 'pointer' }}
          >
            Create Profile
          </span>
        </p>

      </form>
    </div>
  );
}
