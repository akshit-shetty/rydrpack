import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Key, User, Bike, Play, ShieldCheck } from 'lucide-react';
import Header from '../components/Header';
import { supabase } from '../supabase';

export default function JoinRideScreen({ onShowToast }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [rideIdInput, setRideIdInput] = useState('');
  const [riderName, setRiderName] = useState('');
  const [bikeName, setBikeName] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Preview ride details
  const [ridePreview, setRidePreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Pre-fill fields from profile and query param
  useEffect(() => {
    const urlRideId = searchParams.get('rideId') || searchParams.get('ride');
    if (urlRideId) {
      setRideIdInput(urlRideId.trim().toUpperCase());
      fetchRidePreview(urlRideId.trim().toUpperCase());
    }

    try {
      const profileStr = localStorage.getItem('rydr_rider_profile');
      if (profileStr) {
        const profile = JSON.parse(profileStr);
        if (profile.firstName) {
          setRiderName(`${profile.firstName} ${profile.lastName || ''}`.trim());
          if (profile.bikeModel) {
            setBikeName(`${profile.bikeBrand || ''} ${profile.bikeModel}`.trim());
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load profile for prefill:', e);
    }
  }, [searchParams]);

  const fetchRidePreview = async (id) => {
    if (!id) return;
    setPreviewLoading(true);
    setRidePreview(null);

    try {
      // Query rides table in Supabase
      const { data, error } = await supabase
        .from('rides')
        .select('*')
        .eq('ride_id', id)
        .single();

      if (data) {
        setRidePreview({
          title: data.title,
          destinationName: data.destination_name,
          destinationLat: data.destination_lat,
          destinationLng: data.destination_lng,
          hostName: data.host_name,
          pace: data.pace,
          active: data.active
        });
      } else {
        setRidePreview({ notFound: true });
      }
    } catch (err) {
      console.error('Failed to preview ride from Supabase:', err);
      setRidePreview({ notFound: true });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleRideIdBlur = () => {
    if (rideIdInput.trim()) {
      fetchRidePreview(rideIdInput.trim().toUpperCase());
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!rideIdInput.trim()) { onShowToast('Please enter a Ride ID', 'error'); return; }
    if (!riderName.trim()) { onShowToast('Please enter your name', 'error'); return; }

    setLoading(true);
    const targetRideId = rideIdInput.trim().toUpperCase();

    try {
      // 1. Verify ride exists in Supabase
      const { data: rideData, error: rideErr } = await supabase
        .from('rides')
        .select('*')
        .eq('ride_id', targetRideId)
        .single();

      if (!rideData || rideErr) {
        onShowToast('Ride not found. Double check the ID.', 'error');
        setLoading(false);
        return;
      }

      if (!rideData.active) {
        onShowToast('This ride session has already completed.', 'error');
        setLoading(false);
        return;
      }

      const riderId = localStorage.getItem('rydr_rider_id') || Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem('rydr_rider_id', riderId);

      // Color picker for other riders
      const colors = ['#6366F1', '#EC4899', '#F59E0B', '#22C55E', '#0EA5E9', '#F97316', '#8B5CF6', '#EF4444'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      let profileData = null;
      try {
        const profileStr = localStorage.getItem('rydr_rider_profile');
        if (profileStr) profileData = JSON.parse(profileStr);
      } catch {}

      // Build session packet
      const session = {
        riderId,
        rideId: targetRideId,
        name: riderName,
        bike: bikeName || null,
        color: randomColor,
        isHost: false,
        rideTitle: rideData.title || targetRideId,
        email: profileData?.email || null,
        contact: profileData?.contact || null,
        bloodGroup: profileData?.bloodGroup || null,
        destination: rideData.destination_name ? {
          name: rideData.destination_name,
          lat: Number(rideData.destination_lat),
          lng: Number(rideData.destination_lng)
        } : null
      };

      sessionStorage.setItem('rydr_session', JSON.stringify(session));
      localStorage.setItem('rydr_rider', JSON.stringify(session));

      onShowToast('Joining pack ride… 🏍️', 'success');

      // Base64 encode session
      const unicodeToUrlBase64 = (str) => {
        const bytes = new TextEncoder().encode(str);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      };

      setTimeout(() => {
        const encoded = unicodeToUrlBase64(JSON.stringify(session));
        navigate(`/ride?s=${encoded}`);
      }, 800);

    } catch (err) {
      console.error('Join ride error:', err);
      onShowToast('Error joining ride. Try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ background: '#09090b', overflowY: 'auto' }}>
      {/* Header */}
      <header className="app-header">
        <button className="icon-btn" onClick={() => navigate('/dashboard')} disabled={loading}>
          <ArrowLeft size={18} />
        </button>
        <span className="logo-text" style={{ fontSize: '1.15rem' }}>Join Ride</span>
        <span style={{ width: '40px' }} />
      </header>

      <form onSubmit={handleJoin} style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <h2 style={{ fontFamily: 'Outfit', fontSize: '1.45rem', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>
          Sync with Pack
        </h2>
        <p style={{ fontSize: '0.82rem', color: '#A1A1AA', marginBottom: '24px' }}>
          Enter the Ride credentials to connect your live map coordinates.
        </p>

        {/* Inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
          
          <div className="form-field">
            <label className="field-label">Ride ID or Invite Link</label>
            <div className="input-wrapper">
              <span className="input-icon"><Key size={18} /></span>
              <input 
                className="field-input"
                type="text"
                placeholder="e.g. RF-260626-452"
                value={rideIdInput}
                onChange={(e) => setRideIdInput(e.target.value)}
                onBlur={handleRideIdBlur}
                disabled={loading}
              />
            </div>
          </div>

          {/* Dynamic preview loading state */}
          {previewLoading && (
            <div style={{ padding: '12px', fontSize: '0.8rem', color: '#F97316', textAlign: 'center' }}>
              Retrieving ride specifications...
            </div>
          )}

          {/* Ride Preview Card */}
          {ridePreview && !previewLoading && (
            <div className="card" style={{
              background: ridePreview.notFound ? 'rgba(239, 68, 68, 0.04)' : 'rgba(249,115,22,0.03)',
              borderColor: ridePreview.notFound ? 'rgba(239, 68, 68, 0.15)' : 'rgba(249,115,22,0.15)',
              padding: '16px'
            }}>
              {ridePreview.notFound ? (
                <div style={{ color: '#EF4444', fontSize: '0.82rem', fontWeight: 600 }}>
                  ⚠️ Invalid credentials. Check ID code format.
                </div>
              ) : !ridePreview.active ? (
                <div style={{ color: '#EF4444', fontSize: '0.82rem', fontWeight: 600 }}>
                  🛑 This ride session is no longer active.
                </div>
              ) : (
                <div>
                  <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: '#F97316', fontWeight: 800, letterSpacing: '0.8px' }}>
                    Active Target Session
                  </span>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', marginTop: '4px' }}>
                    {ridePreview.title}
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '10px', fontSize: '0.78rem', color: '#A1A1AA' }}>
                    <span>🏁 <strong>Dest:</strong> {ridePreview.destinationName?.split(',')[0]}</span>
                    <span>👤 <strong>Host:</strong> {ridePreview.hostName}</span>
                    <span>⚡ <strong>Pace:</strong> {ridePreview.pace}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="form-field">
            <label className="field-label">Your Name</label>
            <div className="input-wrapper">
              <span className="input-icon"><User size={18} /></span>
              <input 
                className="field-input"
                type="text"
                placeholder="e.g. Akshay"
                value={riderName}
                onChange={(e) => setRiderName(e.target.value)}
                maxLength={25}
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-field">
            <label className="field-label">Bike Brand & Model (Optional)</label>
            <div className="input-wrapper">
              <span className="input-icon"><Bike size={18} /></span>
              <input 
                className="field-input"
                type="text"
                placeholder="e.g. Kawasaki Z900"
                value={bikeName}
                onChange={(e) => setBikeName(e.target.value)}
                maxLength={40}
                disabled={loading}
              />
            </div>
          </div>

        </div>

        {/* Security check */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '16px',
          padding: '14px',
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
          marginTop: 'auto',
          marginBottom: '20px'
        }}>
          <ShieldCheck size={20} color="#10B981" />
          <p style={{ color: '#A1A1AA', fontSize: '0.72rem', lineHeight: '1.3' }}>
            By joining, your location coordinates will sync with this ride session. Track is encrypted and deleted when finished.
          </p>
        </div>

        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={loading || previewLoading || (ridePreview && (ridePreview.notFound || !ridePreview.active))}
        >
          {loading ? 'Entering HUD Session...' : 'Sync GPS & Join Pack'}
          <Play size={14} style={{ fill: '#fff', marginLeft: '4px' }} />
        </button>

      </form>
    </div>
  );
}
