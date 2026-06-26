import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Key, User, Bike, Play, ShieldCheck, MapPin } from 'lucide-react';
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
          <ArrowLeft size={17} />
        </button>
        <span style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1rem', color: '#F4F4F5' }}>Join Ride</span>
        <span style={{ width: '40px' }} />
      </header>

      <form onSubmit={handleJoin} style={{ padding: '20px 20px 48px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <h2 style={{ fontFamily: 'Outfit', fontSize: '1.5rem', fontWeight: 800, color: '#F4F4F5' }}>
              Sync with Pack
            </h2>
            <span className="live-dot" />
          </div>
          <p style={{ fontSize: '0.78rem', color: '#71717A', lineHeight: '1.5' }}>
            Enter the Ride credentials to connect your live map coordinates.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>

          <div className="form-field">
            <label className="field-label">Ride ID or Invite Link</label>
            <div className="input-wrapper">
              <span className="input-icon"><Key size={16} /></span>
              <input
                className="field-input"
                type="text"
                placeholder="e.g. RF-260626-452"
                value={rideIdInput}
                onChange={(e) => setRideIdInput(e.target.value)}
                onBlur={handleRideIdBlur}
                disabled={loading}
                style={{ textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'monospace', fontSize: '0.95rem' }}
              />
            </div>
          </div>

          {/* Preview loading */}
          {previewLoading && (
            <div style={{
              padding: '14px 16px', borderRadius: '12px',
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
              fontSize: '0.8rem', color: '#F97316', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <span className="live-dot" style={{ flexShrink: 0 }} />
              Fetching ride details...
            </div>
          )}

          {/* Ride Preview Card */}
          {ridePreview && !previewLoading && (
            <div style={{
              padding: '16px',
              borderRadius: '14px',
              background: ridePreview.notFound ? 'rgba(239,68,68,0.04)' : ridePreview.active ? 'rgba(249,115,22,0.04)' : 'rgba(239,68,68,0.04)',
              border: `1px solid ${ridePreview.notFound ? 'rgba(239,68,68,0.2)' : ridePreview.active ? 'rgba(249,115,22,0.2)' : 'rgba(239,68,68,0.2)'}`,
              borderTop: `3px solid ${ridePreview.notFound ? '#EF4444' : ridePreview.active ? '#F97316' : '#EF4444'}`,
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
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#F97316', fontWeight: 800, letterSpacing: '0.8px' }}>
                      Active Session
                    </span>
                    <span className="badge-pill badge-green">● LIVE</span>
                  </div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#F4F4F5' }}>
                    {ridePreview.title}
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '10px', fontSize: '0.75rem', color: '#71717A' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <MapPin size={12} style={{ color: '#F97316' }} />
                      {ridePreview.destinationName?.split(',')[0]}
                    </span>
                    <span>👤 Host: {ridePreview.hostName}</span>
                    <span>⚡ Pace: {ridePreview.pace}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="form-field">
            <label className="field-label">Your Name</label>
            <div className="input-wrapper">
              <span className="input-icon"><User size={16} /></span>
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
              <span className="input-icon"><Bike size={16} /></span>
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

        {/* Security note */}
        <div style={{
          background: 'rgba(16,185,129,0.04)',
          border: '1px solid rgba(16,185,129,0.15)',
          borderRadius: '14px', padding: '14px 16px',
          display: 'flex', gap: '10px', alignItems: 'flex-start',
          marginTop: 'auto', marginBottom: '16px',
        }}>
          <ShieldCheck size={18} style={{ color: '#10B981', flexShrink: 0, marginTop: '1px' }} />
          <p style={{ color: '#71717A', fontSize: '0.72rem', lineHeight: '1.4' }}>
            By joining, your location coordinates will sync with this ride session. Track is encrypted and deleted when finished.
          </p>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          style={{ borderRadius: '12px' }}
          disabled={loading || previewLoading || (ridePreview && (ridePreview.notFound || !ridePreview.active))}
        >
          {loading ? 'Entering HUD Session...' : 'Sync GPS & Join Pack'}
          <Play size={14} style={{ fill: '#fff' }} />
        </button>

      </form>
    </div>
  );
}
