import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, Users, ShieldAlert, Sparkles, ChevronRight, Compass } from 'lucide-react';
import { supabase, MAPTILER_KEY } from '../supabase';

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
        const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(val)}.json?key=${MAPTILER_KEY}&autocomplete=true&fuzzyMatch=true&language=en`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.features) {
          const suggestions = data.features.map(f => ({
            name: f.place_name,
            lng: f.geometry.coordinates[0],
            lat: f.geometry.coordinates[1]
          }));
          setDestSuggestions(suggestions);
        }
      } catch (err) {
        console.error('Geocoding suggestions error:', err);
      }
    }, 450);
  };

  const handleSelectDest = (dest) => {
    setSelectedDest(dest);
    setDestQuery(dest.name);
    setDestSuggestions([]);
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
      localStorage.setItem('rydr_rider', JSON.stringify(hostSession));
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

  return (
    <div className="page" style={{ background: '#09090b', overflowY: 'auto' }}>
      
      {/* Header */}
      <header className="app-header">
        <button className="icon-btn" onClick={() => step > 1 ? setStep(step - 1) : navigate('/dashboard')} disabled={loading}>
          <ArrowLeft size={18} />
        </button>
        <span className="logo-text" style={{ fontSize: '1.15rem' }}>Create Ride</span>
        <span style={{ width: '40px' }} />
      </header>

      {/* Steps indicator */}
      <div style={{ display: 'flex', gap: '6px', padding: '0 20px', marginTop: '10px' }}>
        {[1, 2, 3].map((s) => (
          <div 
            key={s} 
            style={{ 
              flex: 1, 
              height: '4px', 
              borderRadius: '2px', 
              background: s <= step ? 'linear-gradient(90deg, #F97316, #FF5500)' : 'rgba(255,255,255,0.06)' 
            }} 
          />
        ))}
      </div>

      <div style={{ padding: '24px 20px 40px', flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* STEP 1: Basic Info */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
            <div>
              <h2 style={{ fontFamily: 'Outfit', fontSize: '1.45rem', fontWeight: 800, color: '#fff' }}>Ride Basics</h2>
              <p style={{ fontSize: '0.82rem', color: '#A1A1AA', marginTop: '4px' }}>Name your adventure and set your crew format.</p>
            </div>

            <div className="form-field">
              <label className="field-label">Ride Name</label>
              <div className="input-wrapper">
                <span className="input-icon"><Compass size={18} /></span>
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
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  className={`btn ${rideType === 'group' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, padding: '14px 0', fontSize: '0.88rem' }}
                  onClick={() => setRideType('group')}
                  disabled={loading}
                >
                  👥 Pack Ride
                </button>
                <button
                  type="button"
                  className={`btn ${rideType === 'solo' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, padding: '14px 0', fontSize: '0.88rem' }}
                  onClick={() => setRideType('solo')}
                  disabled={loading}
                >
                  🏍️ Solo Track
                </button>
              </div>
            </div>

            <button 
              className="btn btn-primary" 
              style={{ marginTop: 'auto' }}
              disabled={!title.trim() || loading}
              onClick={() => setStep(2)}
            >
              Continue <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* STEP 2: Location & Route */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
            <div>
              <h2 style={{ fontFamily: 'Outfit', fontSize: '1.45rem', fontWeight: 800, color: '#fff' }}>Route Coordinates</h2>
              <p style={{ fontSize: '0.82rem', color: '#A1A1AA', marginTop: '4px' }}>Set your destination to compute distance and ETA lines.</p>
            </div>

            <div className="form-field" style={{ position: 'relative' }}>
              <label className="field-label">Destination</label>
              <div className="input-wrapper">
                <span className="input-icon"><MapPin size={18} /></span>
                <input 
                  className="field-input"
                  type="text"
                  placeholder="Search destination town / waypoint"
                  value={destQuery}
                  onChange={(e) => handleDestChange(e.target.value)}
                  disabled={loading}
                />
              </div>
              
              {/* Autocomplete suggestions */}
              {destSuggestions.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: '#121214',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                  zIndex: 200,
                  marginTop: '4px',
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}>
                  {destSuggestions.map((s, idx) => (
                    <div 
                      key={idx}
                      onClick={() => handleSelectDest(s)}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid rgba(255,255,255,0.03)',
                        cursor: 'pointer',
                        fontSize: '0.82rem',
                        color: '#FAFAFA'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      📍 {s.name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-field">
                <label className="field-label">Ride Date</label>
                <div className="input-wrapper">
                  <span className="input-icon"><Calendar size={18} /></span>
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
                  <span className="input-icon"><Compass size={18} /></span>
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
              style={{ marginTop: 'auto' }}
              disabled={!selectedDest || loading}
              onClick={() => setStep(3)}
            >
              Configure Safety <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* STEP 3: Safety & Final Review */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
            <div>
              <h2 style={{ fontFamily: 'Outfit', fontSize: '1.45rem', fontWeight: 800, color: '#fff' }}>Safety & Privacy</h2>
              <p style={{ fontSize: '0.82rem', color: '#A1A1AA', marginTop: '4px' }}>Establish pacing protocols and security rules.</p>
            </div>

            {/* Ride Pace */}
            <div className="form-field">
              <label className="field-label">Preferred Pace</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['relaxed', 'normal', 'fast'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`btn ${pace === p ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, padding: '10px 0', textTransform: 'capitalize', fontSize: '0.8rem' }}
                    onClick={() => setPace(p)}
                    disabled={loading}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Privacy */}
            <div className="form-field">
              <label className="field-label">Privacy Setting</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['public', 'invite', 'private'].map((priv) => (
                  <button
                    key={priv}
                    type="button"
                    className={`btn ${privacy === priv ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, padding: '10px 0', textTransform: 'capitalize', fontSize: '0.8rem' }}
                    onClick={() => setPrivacy(priv)}
                    disabled={loading}
                  >
                    {priv}
                  </button>
                ))}
              </div>
            </div>

            {/* Limit */}
            <div className="form-field">
              <label className="field-label">Group Size Limit</label>
              <div className="input-wrapper">
                <span className="input-icon"><Users size={18} /></span>
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
                <span className="input-icon" style={{ top: '16px' }}><ShieldAlert size={18} /></span>
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
            <div className="card" style={{ padding: '14px', marginTop: '10px', background: 'rgba(249,115,22,0.03)', borderColor: 'rgba(249,115,22,0.1)' }}>
              <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#F97316', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={14} /> Ready to Publish
              </h4>
              <p style={{ fontSize: '0.72rem', color: '#A1A1AA', marginTop: '4px', lineHeight: '1.4' }}>
                Creating <strong>{title}</strong> to <strong>{selectedDest?.name.split(',')[0]}</strong>. A shareable invite card with QR code and live WhatsApp/Telegram links will be ready.
              </p>
            </div>

            <button 
              className="btn btn-primary" 
              style={{ marginTop: 'auto' }}
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
