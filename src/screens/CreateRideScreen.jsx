import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, Users, ShieldAlert, Sparkles, ChevronRight, Compass, Clock } from 'lucide-react';
import { supabase, GOOGLE_MAPS_KEY } from '../supabase';
import { useGeolocation } from '../hooks/useGeolocation';

export default function CreateRideScreen({ onShowToast }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  // Form states
  const [title, setTitle] = useState('');
  const [rideType, setRideType] = useState('group'); // group or solo
  const [destQuery, setDestQuery] = useState('');
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [selectedDest, setSelectedDest] = useState(null); // { name, lat, lng }
  const [rideDate, setRideDate] = useState(new Date().toISOString().split('T')[0]);
  const [rideTime, setRideTime] = useState('06:00');
  const [pace, setPace] = useState('normal'); // relaxed, normal, fast
  const [privacy, setPrivacy] = useState('public'); // public, invite, private
  const [sizeLimit, setSizeLimit] = useState(15);
  const [safetyNotes, setSafetyNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Get user location to bias search results
  const { coords } = useGeolocation({});

  // Geocoding suggest timeout ref
  const suggestTimeoutRef = useRef(null);

  // Auto geocoding fetch
  const handleDestChange = (val) => {
    setDestQuery(val);
    if (selectedDest) setSelectedDest(null);

    if (suggestTimeoutRef.current) clearTimeout(suggestTimeoutRef.current);

    if (val.trim().length < 3) {
      setDestSuggestions([]);
      return;
    }

    suggestTimeoutRef.current = setTimeout(async () => {
      try {
        const requestBody = { input: val };
        
        // Bias search results to user location if available
        if (coords) {
          requestBody.locationBias = {
            circle: {
              center: { latitude: coords.lat, longitude: coords.lng },
              radius: 50000.0 // 50km
            }
          };
        }

        const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': GOOGLE_MAPS_KEY
          },
          body: JSON.stringify(requestBody)
        });
        
        const data = await res.json();
        if (data.suggestions) {
          const suggestions = data.suggestions.map(s => ({
            name: s.placePrediction.text.text,
            place_id: s.placePrediction.placeId
          }));
          setDestSuggestions(suggestions);
        } else {
          setDestSuggestions([]);
        }
      } catch (err) {
        console.error('Places API autocomplete error:', err);
      }
    }, 450);
  };

  const handleSelectDest = async (dest) => {
    setDestQuery(dest.name);
    setDestSuggestions([]);
    
    if (dest.place_id) {
      try {
        const res = await fetch(`https://places.googleapis.com/v1/places/${dest.place_id}?fields=location,displayName`, {
          headers: {
            'X-Goog-Api-Key': GOOGLE_MAPS_KEY
          }
        });
        const data = await res.json();
        
        if (data.location) {
          setSelectedDest({
            name: dest.name,
            lat: data.location.latitude,
            lng: data.location.longitude
          });
        }
      } catch (err) {
        console.error('Failed to fetch place details:', err);
      }
    }
  };

  // Build unique ID
  const generateRideId = () => {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const seq = String(Math.floor(Math.random() * 900) + 100);
    return `RF-${yy}${mm}${dd}-${seq}`;
  };

  const handlePublish = async () => {
    if (!title.trim()) { onShowToast('Please name your ride', 'error'); return; }
    if (!selectedDest) { onShowToast('Please select a destination', 'error'); return; }

    setLoading(true);
    const rideId = generateRideId();

    // Retrieve host profile
    let hostProfile = null;
    try {
      const profileStr = localStorage.getItem('rydr_rider_profile');
      if (profileStr) hostProfile = JSON.parse(profileStr);
    } catch {}

    if (!hostProfile) {
      onShowToast('Rider profile missing! Re-registering...', 'error');
      navigate('/onboarding');
      return;
    }

    try {
      // 1. Save active session row to Supabase public.rides
      const { error } = await supabase
        .from('rides')
        .insert({
          ride_id: rideId,
          title: title.trim(),
          ride_type: rideType,
          destination_name: selectedDest.name,
          destination_lat: selectedDest.lat,
          destination_lng: selectedDest.lng,
          ride_date: rideDate,
          ride_time: rideTime,
          pace,
          privacy,
          size_limit: Number(sizeLimit),
          safety_notes: safetyNotes.trim(),
          host_id: hostProfile.riderId,
          host_name: `${hostProfile.firstName} ${hostProfile.lastName}`,
          active: true
        });

      if (error) {
        throw new Error(error.message);
      }

      // 2. Save local host session cache
      const hostSession = {
        riderId: hostProfile.riderId,
        rideId,
        name: `${hostProfile.firstName} ${hostProfile.lastName}`,
        bike: hostProfile.bikeModel ? `${hostProfile.bikeBrand} ${hostProfile.bikeModel}` : 'Bike',
        color: '#F97316', // Host accent color
        isHost: true,
        rideTitle: title.trim(),
        email: hostProfile.email,
        contact: hostProfile.contact,
        bloodGroup: hostProfile.bloodGroup,
        destination: {
          name: selectedDest.name,
          lat: selectedDest.lat,
          lng: selectedDest.lng
        }
      };

      sessionStorage.setItem('rydr_session', JSON.stringify(hostSession));
      try {
        localStorage.setItem('rydr_rider', JSON.stringify(hostSession));
      } catch (e) {
        console.warn('localStorage quota exceeded:', e);
      }
      sessionStorage.setItem('rydr_last_created_ride_id', rideId);

      onShowToast('Ride published! 🏍️', 'success');

      setTimeout(() => {
        navigate(`/ride-created?rideId=${rideId}`);
      }, 700);

    } catch (err) {
      console.error('Publish ride error:', err);
      onShowToast(`Failed to create ride: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Chip button helper
  const chipStyle = (active, color = '#F97316') => ({
    flex: 1, padding: '11px 0',
    borderRadius: '10px',
    border: active ? `1.5px solid ${color}55` : '1.5px solid rgba(255,255,255,0.07)',
    background: active ? `${color}15` : 'rgba(255,255,255,0.02)',
    color: active ? color : '#71717A',
    fontSize: '0.8rem', fontWeight: 700,
    cursor: 'pointer', transition: 'all 0.18s',
    fontFamily: 'Inter, sans-serif',
    textTransform: 'capitalize',
  });

  // Step progress indicator
  const stepLabels = ['Basics', 'Route', 'Safety'];

  return (
    <div className="page" style={{ background: '#09090b', overflowY: 'auto' }}>

      {/* Header */}
      <header className="app-header">
        <button className="icon-btn" onClick={() => step > 1 ? setStep(step - 1) : navigate('/dashboard')} disabled={loading}>
          <ArrowLeft size={17} />
        </button>
        <span style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1rem', color: '#F4F4F5' }}>Create Ride</span>
        <span style={{ width: '40px' }} />
      </header>

      {/* Step progress pills */}
      <div style={{ display: 'flex', gap: '6px', padding: '0 20px', marginTop: '6px' }}>
        {stepLabels.map((label, idx) => {
          const s = idx + 1;
          const isActive = step === s;
          const isDone = step > s;
          return (
            <div key={s} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
            }}>
              <div style={{
                width: '100%', height: '3px', borderRadius: '2px',
                background: isDone ? '#F97316' : isActive ? '#F97316' : 'rgba(255,255,255,0.06)',
                opacity: isActive ? 1 : isDone ? 0.7 : 1,
                transition: 'all 0.3s',
              }} />
              <span style={{
                fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.4px',
                textTransform: 'uppercase',
                color: isActive ? '#F97316' : isDone ? '#52525B' : '#3F3F46',
                transition: 'all 0.3s',
              }}>{label}</span>
            </div>
          );
        })}
      </div>

      <div style={{ padding: '20px 20px 48px', flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* STEP 1: Basic Info */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', flex: 1, animation: 'fadeSlideUp 0.25s ease' }}>
            <div>
              <h2 style={{ fontFamily: 'Outfit', fontSize: '1.4rem', fontWeight: 800, color: '#F4F4F5' }}>Ride Basics</h2>
              <p style={{ fontSize: '0.78rem', color: '#71717A', marginTop: '4px', lineHeight: '1.5' }}>Name your adventure and set your crew format.</p>
            </div>

            <div className="form-field">
              <label className="field-label">Ride Name</label>
              <div className="input-wrapper">
                <span className="input-icon"><Compass size={16} /></span>
                <input
                  className="field-input"
                  type="text"
                  placeholder="e.g. Lonavala Breakfast Cruise"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={50}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-field">
              <label className="field-label">Ride Format</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setRideType('group')}
                  disabled={loading}
                  style={{
                    ...chipStyle(rideType === 'group'),
                    flex: 1, padding: '16px 0', fontSize: '0.9rem',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                  }}
                >
                  <span style={{ fontSize: '1.4rem' }}>👥</span>
                  <span>Pack Ride</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRideType('solo')}
                  disabled={loading}
                  style={{
                    ...chipStyle(rideType === 'solo'),
                    flex: 1, padding: '16px 0', fontSize: '0.9rem',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                  }}
                >
                  <span style={{ fontSize: '1.4rem' }}>🏍️</span>
                  <span>Solo Track</span>
                </button>
              </div>
            </div>

            <button
              className="btn btn-primary"
              style={{ marginTop: 'auto', borderRadius: '12px' }}
              disabled={!title.trim() || loading}
              onClick={() => setStep(2)}
            >
              Continue <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* STEP 2: Location & Route */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', flex: 1, animation: 'fadeSlideUp 0.25s ease' }}>
            <div>
              <h2 style={{ fontFamily: 'Outfit', fontSize: '1.4rem', fontWeight: 800, color: '#F4F4F5' }}>Route Coordinates</h2>
              <p style={{ fontSize: '0.78rem', color: '#71717A', marginTop: '4px', lineHeight: '1.5' }}>Set your destination to compute distance and ETA.</p>
            </div>

            <div className="form-field" style={{ position: 'relative' }}>
              <label className="field-label">Destination</label>
              <div className="input-wrapper">
                <span className="input-icon"><MapPin size={16} /></span>
                <input
                  className="field-input"
                  type="text"
                  placeholder="Search destination town / waypoint"
                  value={destQuery}
                  onChange={(e) => handleDestChange(e.target.value)}
                  disabled={loading}
                />
              </div>
              {selectedDest && (
                <div style={{
                  marginTop: '6px', padding: '8px 12px',
                  background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)',
                  borderRadius: '10px', fontSize: '0.76rem', color: '#10B981', fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                  ✓ {selectedDest.name.split(',').slice(0,2).join(',')}
                </div>
              )}

              {/* Autocomplete suggestions */}
              {destSuggestions.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0,
                  background: '#111113', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                  zIndex: 200, marginTop: '4px',
                  maxHeight: '200px', overflowY: 'auto',
                }}>
                  {destSuggestions.map((s, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSelectDest(s)}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        cursor: 'pointer', fontSize: '0.82rem', color: '#F4F4F5',
                        display: 'flex', alignItems: 'center', gap: '8px',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <MapPin size={13} style={{ color: '#F97316', flexShrink: 0 }} />
                      {s.name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-field">
                <label className="field-label">Ride Date</label>
                <div className="input-wrapper">
                  <span className="input-icon"><Calendar size={16} /></span>
                  <input
                    className="field-input"
                    type="date"
                    value={rideDate}
                    onChange={(e) => setRideDate(e.target.value)}
                    style={{ paddingLeft: '44px' }}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-field">
                <label className="field-label">Departure</label>
                <div className="input-wrapper">
                  <span className="input-icon"><Clock size={16} /></span>
                  <input
                    className="field-input"
                    type="time"
                    value={rideTime}
                    onChange={(e) => setRideTime(e.target.value)}
                    style={{ paddingLeft: '44px' }}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            <button
              className="btn btn-primary"
              style={{ marginTop: 'auto', borderRadius: '12px' }}
              disabled={!selectedDest || loading}
              onClick={() => setStep(3)}
            >
              Configure Safety <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* STEP 3: Safety & Final Review */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', flex: 1, animation: 'fadeSlideUp 0.25s ease' }}>
            <div>
              <h2 style={{ fontFamily: 'Outfit', fontSize: '1.4rem', fontWeight: 800, color: '#F4F4F5' }}>Safety & Privacy</h2>
              <p style={{ fontSize: '0.78rem', color: '#71717A', marginTop: '4px', lineHeight: '1.5' }}>Establish pacing protocols and security rules.</p>
            </div>

            {/* Preferred Pace */}
            <div className="form-field">
              <label className="field-label">Preferred Pace</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['relaxed', 'normal', 'fast'].map((p) => (
                  <button key={p} type="button" style={chipStyle(pace === p)} onClick={() => setPace(p)} disabled={loading}>{p}</button>
                ))}
              </div>
            </div>

            {/* Privacy */}
            <div className="form-field">
              <label className="field-label">Privacy Setting</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['public', 'invite', 'private'].map((priv) => (
                  <button key={priv} type="button" style={chipStyle(privacy === priv)} onClick={() => setPrivacy(priv)} disabled={loading}>{priv}</button>
                ))}
              </div>
            </div>

            {/* Size limit */}
            <div className="form-field">
              <label className="field-label">Group Size Limit</label>
              <div className="input-wrapper">
                <span className="input-icon"><Users size={16} /></span>
                <input
                  className="field-input"
                  type="number"
                  placeholder="e.g. 15"
                  value={sizeLimit}
                  onChange={(e) => setSizeLimit(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Safety notes */}
            <div className="form-field">
              <label className="field-label">Safety & Route Notes</label>
              <div className="input-wrapper">
                <span className="input-icon" style={{ top: '16px' }}><ShieldAlert size={16} /></span>
                <textarea
                  className="field-input"
                  placeholder="e.g. Wear full gear. Keep headlights on. Watch for gravel on loops."
                  value={safetyNotes}
                  onChange={(e) => setSafetyNotes(e.target.value)}
                  style={{ minHeight: '80px', paddingLeft: '48px', paddingTop: '14px', resize: 'none' }}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Summary card */}
            <div style={{
              padding: '14px 16px', borderRadius: '14px',
              background: 'rgba(249,115,22,0.04)', border: '1px solid rgba(249,115,22,0.15)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <Sparkles size={14} style={{ color: '#F97316' }} />
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#F97316' }}>Ready to Publish</span>
                <span className="badge-pill badge-green" style={{ marginLeft: 'auto' }}>✓ Set</span>
              </div>
              <p style={{ fontSize: '0.72rem', color: '#71717A', lineHeight: '1.5' }}>
                Creating <strong style={{ color: '#A1A1AA' }}>{title}</strong> to <strong style={{ color: '#A1A1AA' }}>{selectedDest?.name.split(',')[0]}</strong>. A shareable invite card with QR code will be ready.
              </p>
            </div>

            <button
              className="btn btn-primary"
              style={{ marginTop: 'auto', borderRadius: '12px' }}
              onClick={handlePublish}
              disabled={loading}
            >
              {loading ? 'Publishing...' : 'Confirm & Publish Ride'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
