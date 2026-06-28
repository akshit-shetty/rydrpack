import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Heart, Bike, Compass, ShieldAlert, Lock, ChevronRight, ChevronLeft, ShieldCheck, ArrowLeft, Navigation2 } from 'lucide-react';
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
    // Name validation pattern (letters and spaces only, 2-30 chars)
    const nameRegex = /^[A-Za-z\s]{2,30}$/;
    // Email validation pattern
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // Phone validation pattern (allows optional +, 10-15 digits)
    const phoneRegex = /^\+?[0-9]{10,15}$/;

    if (s === 1) {
      if (!firstName.trim()) { onShowToast('First name is required', 'error'); return false; }
      if (!nameRegex.test(firstName.trim())) { onShowToast('First name should contain letters only (2-30 characters)', 'error'); return false; }

      if (!lastName.trim()) { onShowToast('Last name is required', 'error'); return false; }
      if (!nameRegex.test(lastName.trim())) { onShowToast('Last name should contain letters only (2-30 characters)', 'error'); return false; }

      if (!email.trim()) { onShowToast('Email is required', 'error'); return false; }
      if (!emailRegex.test(email.trim())) { onShowToast('Please enter a valid email address (e.g. name@domain.com)', 'error'); return false; }

      if (!password.trim()) { onShowToast('Password is required', 'error'); return false; }
      if (password.trim().length < 6) { onShowToast('Password must be at least 6 characters', 'error'); return false; }
    } else if (s === 2) {
      if (!contact.trim()) { onShowToast('Contact number is required', 'error'); return false; }
      if (!phoneRegex.test(contact.trim())) { onShowToast('Please enter a valid contact number (10-15 digits)', 'error'); return false; }

      if (!emergencyContact.trim()) { onShowToast('Emergency contact is required', 'error'); return false; }
      if (!phoneRegex.test(emergencyContact.trim())) { onShowToast('Please enter a valid emergency contact number (10-15 digits)', 'error'); return false; }

      if (contact.trim() === emergencyContact.trim()) {
        onShowToast('Emergency contact cannot be the same as your own contact number', 'error');
        return false;
      }

      if (!bloodGroup) { onShowToast('Please select your blood group', 'error'); return false; }
    }
    return true;
  };

  const handleStepNavigation = async (targetStep) => {
    if (targetStep === step) return;

    if (targetStep === 1) {
      setStep(1);
      return;
    }

    if (targetStep === 2) {
      if (!validateStep(1)) return;

      setLoading(true);
      try {
        const existingRiderId = localStorage.getItem('rydr_rider_id');
        const { data, error } = await supabase
          .from('riders')
          .select('rider_id')
          .eq('email', email.trim().toLowerCase())
          .maybeSingle();

        if (error) console.warn(error.message);

        if (data && data.rider_id !== existingRiderId) {
          onShowToast('This email is already registered to another account. Please log in instead.', 'error');
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn(err);
      } finally {
        setLoading(false);
      }

      setStep(2);
      return;
    }

    if (targetStep === 3) {
      // First validate Step 1
      if (!validateStep(1)) return;

      setLoading(true);
      try {
        const existingRiderId = localStorage.getItem('rydr_rider_id');
        const { data: emailData } = await supabase
          .from('riders')
          .select('rider_id')
          .eq('email', email.trim().toLowerCase())
          .maybeSingle();

        if (emailData && emailData.rider_id !== existingRiderId) {
          onShowToast('This email is already registered to another account. Please log in instead.', 'error');
          setLoading(false);
          return;
        }

        // Validate Step 2
        if (!validateStep(2)) {
          setLoading(false);
          return;
        }

        const { data: contactData } = await supabase
          .from('riders')
          .select('rider_id')
          .eq('contact', contact.trim())
          .maybeSingle();

        if (contactData && contactData.rider_id !== existingRiderId) {
          onShowToast('This contact number is already registered to another account.', 'error');
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn(err);
      } finally {
        setLoading(false);
      }

      setStep(3);
      return;
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!validateStep(1) || !validateStep(2)) {
      return;
    }

    setLoading(true);
    const riderId = localStorage.getItem('rydr_rider_id') || Math.random().toString(36).slice(2) + Date.now().toString(36);

    try {
      // Check if email already registered to someone else in the database
      const existingRiderId = localStorage.getItem('rydr_rider_id');
      const { data: checkData, error: checkError } = await supabase
        .from('riders')
        .select('rider_id')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();

      if (checkError) {
        console.warn('Supabase email unique validation check error:', checkError.message);
      }

      if (checkData && checkData.rider_id !== existingRiderId) {
        onShowToast('This email is already registered to another account. Please log in instead.', 'error');
        setLoading(false);
        return;
      }

      // Check if contact already registered to someone else in the database
      const { data: checkContactData, error: checkContactError } = await supabase
        .from('riders')
        .select('rider_id')
        .eq('contact', contact.trim())
        .maybeSingle();

      if (checkContactError) {
        console.warn('Supabase contact unique validation check error:', checkContactError.message);
      }

      if (checkContactData && checkContactData.rider_id !== existingRiderId) {
        onShowToast('This contact number is already registered to another account.', 'error');
        setLoading(false);
        return;
      }
    } catch (err) {
      console.warn('Failsafe check failed, continuing...', err);
    }

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

      const pendingRideId = sessionStorage.getItem('rydr_join_after_onboard');

      onShowToast('Profile synced successfully! 🏍️', 'success');
      setTimeout(() => {
        if (pendingRideId) {
          sessionStorage.removeItem('rydr_join_after_onboard');
          navigate(`/join-ride?rideId=${pendingRideId}`);
        } else {
          navigate('/dashboard');
        }
      }, 800);
    } catch (err) {
      console.error(err);
      onShowToast('Database connection unavailable, profile saved locally.', 'error');

      // Fallback local save
      localStorage.setItem('rydr_rider_profile', JSON.stringify(profile));
      localStorage.setItem('rydr_rider_id', riderId);
      
      const pendingRideId = sessionStorage.getItem('rydr_join_after_onboard');
      setTimeout(() => {
        if (pendingRideId) {
          sessionStorage.removeItem('rydr_join_after_onboard');
          navigate(`/join-ride?rideId=${pendingRideId}`);
        } else {
          navigate('/dashboard');
        }
      }, 800);
    } finally {
      setLoading(false);
    }
  };

  // Step metadata
  const steps = [
    { num: 1, label: 'Account', icon: <User size={13} /> },
    { num: 2, label: 'Safety', icon: <ShieldAlert size={13} /> },
    { num: 3, label: 'Garage', icon: <Bike size={13} /> },
  ];

  // Chip button style helper
  const chipStyle = (active) => ({
    flex: 1, padding: '11px 0',
    borderRadius: '10px',
    border: active ? '1.5px solid rgba(249,115,22,0.5)' : '1.5px solid rgba(255,255,255,0.07)',
    background: active ? 'rgba(249,115,22,0.12)' : 'rgba(255,255,255,0.02)',
    color: active ? '#F97316' : '#71717A',
    fontSize: '0.8rem', fontWeight: 700,
    cursor: 'pointer', transition: 'all 0.18s',
    fontFamily: 'Inter, sans-serif',
    textTransform: 'capitalize',
  });

  return (
    <div className="page" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 0%, #1a0e06 0%, #09090b 55%)', display: 'flex', flexDirection: 'column' }}>
      {/* Back button row (floating absolute) */}
      <div style={{
        position: 'absolute', top: '16px', left: '16px', zIndex: 100,
      }}>
        <button type="button" className="icon-btn" onClick={() => navigate('/')} disabled={loading} style={{ width: '36px', height: '36px' }}>
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
          <img src="/rydrpack_logo.svg" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <span style={{
          fontFamily: 'Outfit', fontWeight: 800, fontSize: '0.95rem',
          color: '#F4F4F5', letterSpacing: '-0.3px'
        }}>RydrPack</span>
      </div>

      <form onSubmit={handleSave} style={{ padding: '16px 20px 32px', display: 'flex', flexDirection: 'column', flex: 1, boxSizing: 'border-box' }}>

        {/* Step Tabs */}
        <div style={{
          display: 'flex', gap: '6px',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '14px', padding: '4px',
          marginBottom: '20px',
        }}>
          {steps.map((s) => {
            const isActive = step === s.num;
            const isDone = step > s.num;
            return (
              <div
                key={s.num}
                onClick={() => handleStepNavigation(s.num)}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                  padding: '9px 4px', borderRadius: '10px', cursor: 'pointer',
                  background: isActive ? '#F97316' : isDone ? 'rgba(249,115,22,0.12)' : 'transparent',
                  transition: 'all 0.2s',
                }}
              >
                <span style={{ color: isActive ? '#fff' : isDone ? '#F97316' : '#52525B', display: 'flex' }}>
                  {s.icon}
                </span>
                <span style={{
                  fontSize: '0.68rem', fontWeight: 700,
                  color: isActive ? '#fff' : isDone ? '#F97316' : '#52525B',
                  textTransform: 'uppercase', letterSpacing: '0.4px',
                }}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Step Card */}
        <div className="card" style={{
          background: 'rgba(14,14,16,0.75)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.07)',
          padding: '24px 20px',
          borderRadius: '20px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
          display: 'flex', flexDirection: 'column',
          flex: 1, justifyContent: 'flex-start', gap: '14px',
          marginBottom: '16px',
        }}>

          {/* ─── STEP 1: Account ─── */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', animation: 'fadeSlideUp 0.25s ease' }}>
              <div>
                <h3 style={{ fontFamily: 'Outfit', fontSize: '1.3rem', fontWeight: 800, color: '#fff' }}>
                  Create Account
                </h3>
                <p style={{ fontSize: '0.76rem', color: '#71717A', marginTop: '4px', lineHeight: '1.5' }}>
                  Set up your rider profile credentials.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-field" style={{ marginBottom: 0 }}>
                  <label className="field-label">First Name</label>
                  <div className="input-wrapper">
                    <span className="input-icon"><User size={15} /></span>
                    <input className="field-input" type="text" placeholder="e.g. Akshay"
                      value={firstName} onChange={(e) => setFirstName(e.target.value)}
                      maxLength={25} disabled={loading} autoComplete="given-name" />
                  </div>
                </div>

                <div className="form-field" style={{ marginBottom: 0 }}>
                  <label className="field-label">Last Name</label>
                  <div className="input-wrapper">
                    <span className="input-icon"><User size={15} /></span>
                    <input className="field-input" type="text" placeholder="e.g. Shetty"
                      value={lastName} onChange={(e) => setLastName(e.target.value)}
                      maxLength={25} disabled={loading} autoComplete="family-name" />
                  </div>
                </div>
              </div>

              <div className="form-field" style={{ marginBottom: 0 }}>
                <label className="field-label">Email Address</label>
                <div className="input-wrapper">
                  <span className="input-icon"><Mail size={15} /></span>
                  <input className="field-input" type="email" placeholder="e.g. akshay@example.com"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    disabled={loading} autoComplete="email" />
                </div>
              </div>

              <div className="form-field" style={{ marginBottom: 0 }}>
                <label className="field-label">Password</label>
                <div className="input-wrapper">
                  <span className="input-icon"><Lock size={15} /></span>
                  <input className="field-input" type="password" placeholder="Min 6 characters"
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    disabled={loading} autoComplete="new-password" />
                </div>
              </div>
            </div>
          )}

          {/* ─── STEP 2: Safety ─── */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', animation: 'fadeSlideUp 0.25s ease' }}>
              <div>
                <h3 style={{ fontFamily: 'Outfit', fontSize: '1.3rem', fontWeight: 800, color: '#fff' }}>
                  Safety & Emergency
                </h3>
                <p style={{ fontSize: '0.76rem', color: '#71717A', marginTop: '4px', lineHeight: '1.5' }}>
                  Critical data for emergency broadcast triggers.
                </p>
              </div>

              <div className="form-field" style={{ marginBottom: 0 }}>
                <label className="field-label">Contact Number</label>
                <div className="input-wrapper">
                  <span className="input-icon"><Phone size={15} /></span>
                  <input className="field-input" type="tel" placeholder="e.g. 9876543210"
                    value={contact} onChange={(e) => setContact(e.target.value)}
                    disabled={loading} autoComplete="tel" />
                </div>
              </div>

              {/* Emergency contact — special card */}
              <div style={{
                border: '1px solid rgba(239,68,68,0.18)',
                borderRadius: '14px',
                background: 'rgba(239,68,68,0.03)',
                overflow: 'hidden',
              }}>
                <div style={{
                  background: 'rgba(239,68,68,0.06)',
                  borderBottom: '1px solid rgba(239,68,68,0.12)',
                  padding: '10px 16px',
                  display: 'flex', alignItems: 'center', gap: '7px',
                }}>
                  <ShieldAlert size={14} style={{ color: '#EF4444' }} />
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    SOS Emergency Contact
                  </span>
                </div>
                <div style={{ padding: '12px 14px' }}>
                  <div className="input-wrapper">
                    <span className="input-icon"><Phone size={15} /></span>
                    <input className="field-input" type="tel" placeholder="Emergency Phone Number"
                      value={emergencyContact} onChange={(e) => setEmergencyContact(e.target.value)}
                      style={{ borderColor: 'rgba(239,68,68,0.2)', background: '#0e0e10' }}
                      disabled={loading} />
                  </div>
                </div>
              </div>

              <div className="form-field" style={{ marginBottom: 0 }}>
                <label className="field-label">Blood Group</label>
                <div className="input-wrapper">
                  <span className="input-icon"><Heart size={15} /></span>
                  <select className="field-input" value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    style={{ appearance: 'none', background: '#0e0e10', cursor: 'pointer' }}
                    disabled={loading}>
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

          {/* ─── STEP 3: Garage ─── */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', animation: 'fadeSlideUp 0.25s ease' }}>
              <div>
                <h3 style={{ fontFamily: 'Outfit', fontSize: '1.3rem', fontWeight: 800, color: '#fff' }}>
                  Garage & Ride Profile
                </h3>
                <p style={{ fontSize: '0.76rem', color: '#71717A', marginTop: '4px', lineHeight: '1.5' }}>
                  Help your crew understand your preferences.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-field" style={{ marginBottom: 0 }}>
                  <label className="field-label">Bike Brand</label>
                  <div className="input-wrapper">
                    <span className="input-icon"><Bike size={15} /></span>
                    <input className="field-input" type="text" placeholder="e.g. KTM"
                      value={bikeBrand} onChange={(e) => setBikeBrand(e.target.value)}
                      disabled={loading} />
                  </div>
                </div>
                <div className="form-field" style={{ marginBottom: 0 }}>
                  <label className="field-label">Bike Model</label>
                  <div className="input-wrapper">
                    <span className="input-icon"><Bike size={15} /></span>
                    <input className="field-input" type="text" placeholder="e.g. Duke 390"
                      value={bikeModel} onChange={(e) => setBikeModel(e.target.value)}
                      disabled={loading} />
                  </div>
                </div>
              </div>

              <div className="form-field" style={{ marginBottom: 0 }}>
                <label className="field-label">Riding Preference</label>
                <div className="input-wrapper">
                  <span className="input-icon"><Compass size={15} /></span>
                  <select className="field-input" value={rideStyle}
                    onChange={(e) => setRideStyle(e.target.value)}
                    style={{ appearance: 'none', background: '#0e0e10', cursor: 'pointer' }}
                    disabled={loading}>
                    <option value="cruising">Cruising / Touring</option>
                    <option value="offroading">Offroading / Adventure</option>
                    <option value="racing">Track / Fast Riding</option>
                    <option value="city">Urban / Commuting</option>
                  </select>
                </div>
              </div>

              <div className="form-field" style={{ marginBottom: 0 }}>
                <label className="field-label">Preferred Pace</label>
                <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                  {['relaxed', 'normal', 'fast'].map((p) => (
                    <button key={p} type="button"
                      style={chipStyle(pace === p)}
                      onClick={() => setPace(p)}
                      disabled={loading}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          {step > 1 && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setStep(step - 1)}
              style={{ flex: 1, borderRadius: '12px' }}
              disabled={loading}
            >
              <ChevronLeft size={16} /> Back
            </button>
          )}

          {step < 3 ? (
            <button
              type="button"
              className="btn btn-primary"
              style={{ flex: 2, borderRadius: '12px' }}
              disabled={loading}
              onClick={async () => {
                if (!validateStep(step)) return;

                if (step === 1) {
                  setLoading(true);
                  try {
                    const existingRiderId = localStorage.getItem('rydr_rider_id');
                    const { data, error } = await supabase
                      .from('riders')
                      .select('rider_id')
                      .eq('email', email.trim().toLowerCase())
                      .maybeSingle();

                    if (error) {
                      console.warn('Supabase email validation check error:', error.message);
                    }

                    if (data && data.rider_id !== existingRiderId) {
                      onShowToast('This email is already registered to another account. Please log in instead.', 'error');
                      setLoading(false);
                      return;
                    }
                  } catch (err) {
                    console.warn('Failsafe check failed, continuing...', err);
                  } finally {
                    setLoading(false);
                  }
                }

                if (step === 2) {
                  setLoading(true);
                  try {
                    const existingRiderId = localStorage.getItem('rydr_rider_id');
                    const { data, error } = await supabase
                      .from('riders')
                      .select('rider_id')
                      .eq('contact', contact.trim())
                      .maybeSingle();

                    if (error) {
                      console.warn('Supabase contact validation check error:', error.message);
                    }

                    if (data && data.rider_id !== existingRiderId) {
                      onShowToast('This contact number is already registered to another account.', 'error');
                      setLoading(false);
                      return;
                    }
                  } catch (err) {
                    console.warn('Failsafe check failed, continuing...', err);
                  } finally {
                    setLoading(false);
                  }
                }

                setStep(step + 1);
              }}
            >
              {loading ? 'Checking...' : 'Next Step'} <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 2, borderRadius: '12px' }}
              disabled={loading}
            >
              {loading ? 'Registering...' : 'Create Rider Profile'}
              <ShieldCheck size={16} />
            </button>
          )}
        </div>

      </form>
    </div>
  );
}
