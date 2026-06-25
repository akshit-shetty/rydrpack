import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Heart, Bike, Compass, ShieldAlert, Lock, ChevronRight, ChevronLeft, ShieldCheck } from 'lucide-react';
import Header from '../components/Header';
import { supabase } from '../supabase';

export default function OnboardingScreen({ onShowToast }) {
  const navigate = useNavigate();
  
  // Multi-step tracking
  const [step, setStep] = useState(1);

  // State variables for form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [contact, setContact] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [bikeBrand, setBikeBrand] = useState('');
  const [bikeModel, setBikeModel] = useState('');
  const [rideStyle, setRideStyle] = useState('cruising');
  const [pace, setPace] = useState('normal');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Populate form if profile already exists
    try {
      const profileStr = localStorage.getItem('rydr_rider_profile');
      if (profileStr) {
        const profile = JSON.parse(profileStr);
        setFirstName(profile.firstName || '');
        setLastName(profile.lastName || '');
        setEmail(profile.email || '');
        setPassword(profile.password || '');
        setContact(profile.contact || '');
        setEmergencyContact(profile.emergencyContact || '');
        setBloodGroup(profile.bloodGroup || '');
        setBikeBrand(profile.bikeBrand || '');
        setBikeModel(profile.bikeModel || '');
        setRideStyle(profile.rideStyle || 'cruising');
        setPace(profile.pace || 'normal');
      }
    } catch (e) {
      console.warn('Error reading local profile:', e);
    }
  }, []);

  const validateStep = (s) => {
    if (s === 1) {
      if (!firstName.trim()) { onShowToast('First name is required', 'error'); return false; }
      if (!lastName.trim()) { onShowToast('Last name is required', 'error'); return false; }
      if (!email.trim()) { onShowToast('Email is required', 'error'); return false; }
      if (!password.trim()) { onShowToast('Password is required', 'error'); return false; }
      if (password.trim().length < 6) { onShowToast('Password must be at least 6 characters', 'error'); return false; }
    } else if (s === 2) {
      if (!contact.trim()) { onShowToast('Contact number is required', 'error'); return false; }
      if (!emergencyContact.trim()) { onShowToast('Emergency contact is required', 'error'); return false; }
      if (!bloodGroup) { onShowToast('Please select your blood group', 'error'); return false; }
    }
    return true;
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!validateStep(1) || !validateStep(2)) {
      return;
    }

    setLoading(true);
    const riderId = localStorage.getItem('rydr_rider_id') || Math.random().toString(36).slice(2) + Date.now().toString(36);

    const profile = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      password: password.trim(),
      contact: contact.trim(),
      emergencyContact: emergencyContact.trim(),
      bloodGroup,
      bikeBrand: bikeBrand.trim(),
      bikeModel: bikeModel.trim(),
      rideStyle,
      pace,
      riderId
    };

    try {
      // Upsert into Supabase public.riders table
      const { error } = await supabase
        .from('riders')
        .upsert({
          rider_id: riderId,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim().toLowerCase(),
          password: password.trim(),
          contact: contact.trim(),
          emergency_contact: emergencyContact.trim(),
          blood_group: bloodGroup,
          bike_brand: bikeBrand.trim(),
          bike_model: bikeModel.trim(),
          ride_style: rideStyle,
          pace: pace
        });

      if (error) {
        console.warn('Supabase profile save error:', error.message);
      }

      // Save locally as cache fallback
      localStorage.setItem('rydr_rider_profile', JSON.stringify(profile));
      localStorage.setItem('rydr_rider_id', riderId);
      
      onShowToast('Profile synced successfully! 🏍️', 'success');
      setTimeout(() => {
        navigate('/dashboard');
      }, 800);
    } catch (err) {
      console.error(err);
      onShowToast('Database connection unavailable, profile saved locally.', 'error');
      
      // Fallback local save
      localStorage.setItem('rydr_rider_profile', JSON.stringify(profile));
      localStorage.setItem('rydr_rider_id', riderId);
      setTimeout(() => navigate('/dashboard'), 800);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ background: '#09090b', display: 'flex', flexDirection: 'column' }}>
      <Header title="Rydr Profile" showMenu={false} />
      
      <form onSubmit={handleSave} style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', flex: 1, boxSizing: 'border-box' }}>
        
        {/* Step Indicator */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '16px',
          padding: '12px 16px',
          marginBottom: '28px',
          position: 'relative'
        }}>
          {/* Progress bar line */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '12%',
            right: '12%',
            height: '2px',
            background: 'rgba(255,255,255,0.08)',
            zIndex: 1,
            transform: 'translateY(-50%)'
          }} />
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '12%',
            width: step === 1 ? '0%' : step === 2 ? '38%' : '76%',
            height: '2px',
            background: 'linear-gradient(90deg, #F97316, #FF5500)',
            boxShadow: '0 0 8px #F97316',
            zIndex: 1,
            transform: 'translateY(-50%)',
            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }} />

          {[
            { num: 1, label: 'Account', icon: <User size={14} /> },
            { num: 2, label: 'Safety', icon: <ShieldAlert size={14} /> },
            { num: 3, label: 'Garage', icon: <Bike size={14} /> }
          ].map((s) => {
            const isActive = step >= s.num;
            const isCurrent = step === s.num;
            return (
              <div key={s.num} style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                zIndex: 2,
                cursor: 'pointer'
              }} onClick={() => {
                if (s.num < step) setStep(s.num);
                else if (s.num === 2 && validateStep(1)) setStep(2);
                else if (s.num === 3 && validateStep(1) && validateStep(2)) setStep(3);
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: isCurrent 
                    ? 'linear-gradient(135deg, #F97316, #FF5500)' 
                    : isActive ? '#1e1b18' : '#121214',
                  border: isCurrent 
                    ? '2px solid #FFF' 
                    : isActive ? '1px solid #F97316' : '1px solid rgba(255,255,255,0.1)',
                  boxShadow: isCurrent ? '0 0 12px rgba(249, 115, 22, 0.4)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isActive ? '#fff' : '#52525B',
                  transition: 'all 0.3s'
                }}>
                  {s.icon}
                </div>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: isActive ? 700 : 500,
                  color: isCurrent ? '#F97316' : isActive ? '#FAFAFA' : '#52525B',
                  fontFamily: 'Outfit',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Step Contents */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', animation: 'fadeIn 0.25s' }}>
              <div>
                <h3 style={{ fontFamily: 'Outfit', fontSize: '1.3rem', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>
                  Create Account
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#A1A1AA', marginBottom: '10px' }}>
                  Set up your Rider profile credentials.
                </p>
              </div>

              {/* First Name */}
              <div className="form-field">
                <label className="field-label">First Name</label>
                <div className="input-wrapper">
                  <span className="input-icon"><User size={18} /></span>
                  <input 
                    className="field-input" 
                    type="text" 
                    placeholder="e.g. Akshay" 
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    maxLength={25}
                    disabled={loading}
                    autoComplete="given-name"
                  />
                </div>
              </div>

              {/* Last Name */}
              <div className="form-field">
                <label className="field-label">Last Name</label>
                <div className="input-wrapper">
                  <span className="input-icon"><User size={18} /></span>
                  <input 
                    className="field-input" 
                    type="text" 
                    placeholder="e.g. Shetty" 
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    maxLength={25}
                    disabled={loading}
                    autoComplete="family-name"
                  />
                </div>
              </div>

              {/* Email */}
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

              {/* Password */}
              <div className="form-field">
                <label className="field-label">Password</label>
                <div className="input-wrapper">
                  <span className="input-icon"><Lock size={18} /></span>
                  <input 
                    className="field-input" 
                    type="password" 
                    placeholder="Min 6 characters" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    autoComplete="new-password"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', animation: 'fadeIn 0.25s' }}>
              <div>
                <h3 style={{ fontFamily: 'Outfit', fontSize: '1.3rem', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>
                  Safety & Emergency Config
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#A1A1AA', marginBottom: '10px' }}>
                  Crucial data for tracking safety and emergency broadcast triggers.
                </p>
              </div>

              {/* Contact */}
              <div className="form-field">
                <label className="field-label">Contact Number</label>
                <div className="input-wrapper">
                  <span className="input-icon"><Phone size={18} /></span>
                  <input 
                    className="field-input" 
                    type="tel" 
                    placeholder="e.g. 9876543210" 
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    disabled={loading}
                    autoComplete="tel"
                  />
                </div>
              </div>

              {/* Emergency Contact */}
              <div style={{ border: '1px solid rgba(239, 68, 68, 0.2)', padding: '14px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.03)' }}>
                <label className="field-label" style={{ color: '#EF4444', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <ShieldAlert size={14} /> SOS Emergency Broadcast Contact
                </label>
                <div className="input-wrapper">
                  <span className="input-icon"><Phone size={18} /></span>
                  <input 
                    className="field-input" 
                    type="tel" 
                    placeholder="Emergency Phone Number" 
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Blood Group */}
              <div className="form-field">
                <label className="field-label">Blood Group</label>
                <div className="input-wrapper">
                  <span className="input-icon"><Heart size={18} /></span>
                  <select 
                    className="field-input" 
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    style={{ appearance: 'none', background: '#121214', cursor: 'pointer' }}
                    disabled={loading}
                  >
                    <option value="" disabled>Select Blood Type</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', animation: 'fadeIn 0.25s' }}>
              <div>
                <h3 style={{ fontFamily: 'Outfit', fontSize: '1.3rem', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>
                  Garage & Ride Profile
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#A1A1AA', marginBottom: '10px' }}>
                  Help your crew understand your ride preferences.
                </p>
              </div>

              {/* Bike Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-field">
                  <label className="field-label">Bike Brand</label>
                  <div className="input-wrapper">
                    <span className="input-icon"><Bike size={18} /></span>
                    <input 
                      className="field-input" 
                      type="text" 
                      placeholder="e.g. KTM" 
                      value={bikeBrand}
                      onChange={(e) => setBikeBrand(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>
                <div className="form-field">
                  <label className="field-label">Bike Model</label>
                  <div className="input-wrapper">
                    <span className="input-icon"><Bike size={18} /></span>
                    <input 
                      className="field-input" 
                      type="text" 
                      placeholder="e.g. Duke 390" 
                      value={bikeModel}
                      onChange={(e) => setBikeModel(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              {/* Preferred Style */}
              <div className="form-field">
                <label className="field-label">Riding Preference</label>
                <div className="input-wrapper">
                  <span className="input-icon"><Compass size={18} /></span>
                  <select 
                    className="field-input" 
                    value={rideStyle}
                    onChange={(e) => setRideStyle(e.target.value)}
                    style={{ appearance: 'none', background: '#121214', cursor: 'pointer' }}
                    disabled={loading}
                  >
                    <option value="cruising">Cruising / Touring</option>
                    <option value="offroading">Offroading / Adventure</option>
                    <option value="racing">Track / Fast Riding</option>
                    <option value="city">Urban / Commuting</option>
                  </select>
                </div>
              </div>

              {/* Preferred Pace */}
              <div className="form-field">
                <label className="field-label">Preferred Pace</label>
                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  {['relaxed', 'normal', 'fast'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`btn ${pace === p ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: 1, padding: '12px 0', textTransform: 'capitalize', fontSize: '0.82rem' }}
                      onClick={() => setPace(p)}
                      disabled={loading}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Navigation Buttons */}
        <div style={{ display: 'flex', gap: '12px', marginTop: 'auto', paddingTop: '24px' }}>
          {step > 1 && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setStep(step - 1)}
              style={{ flex: 1 }}
              disabled={loading}
            >
              <ChevronLeft size={16} /> Back
            </button>
          )}
          
          {step < 3 ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                if (validateStep(step)) setStep(step + 1);
              }}
              style={{ flex: 2 }}
              disabled={loading}
            >
              Next Step <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 2 }}
              disabled={loading}
            >
              {loading ? 'Registering...' : 'Create Rider Profile'}
              <ShieldCheck size={16} style={{ marginLeft: '4px' }} />
            </button>
          )}
        </div>

      </form>
    </div>
  );
}
