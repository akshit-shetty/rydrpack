import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Heart, Bike, Compass, ShieldAlert } from 'lucide-react';
import Header from '../components/Header';
import { supabase } from '../supabase';

export default function OnboardingScreen({ onShowToast }) {
  const navigate = useNavigate();
  
  // State variables for form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
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

  const handleSave = async (e) => {
    e.preventDefault();

    if (!firstName.trim()) { onShowToast('First name is required', 'error'); return; }
    if (!lastName.trim()) { onShowToast('Last name is required', 'error'); return; }
    if (!email.trim()) { onShowToast('Email is required', 'error'); return; }
    if (!contact.trim()) { onShowToast('Contact number is required', 'error'); return; }
    if (!emergencyContact.trim()) { onShowToast('Emergency contact is required', 'error'); return; }
    if (!bloodGroup) { onShowToast('Please select your blood group', 'error'); return; }

    setLoading(true);
    const riderId = localStorage.getItem('rydr_rider_id') || Math.random().toString(36).slice(2) + Date.now().toString(36);

    const profile = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
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
          email: email.trim(),
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
    <div className="page">
      <Header title="Rydr Profile" showMenu={false} />
      
      <form onSubmit={handleSave} style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
        <h2 style={{ fontFamily: 'Outfit', fontSize: '1.45rem', fontWeight: 800, marginBottom: '6px', letterSpacing: '-0.3px' }}>
          Rider Registration
        </h2>
        <p style={{ fontSize: '0.85rem', color: '#A1A1AA', marginBottom: '24px' }}>
          Configure your rider details for live mapping and group security.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
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
              />
            </div>
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
              />
            </div>
          </div>

          {/* Emergency Contact */}
          <div style={{ border: '1px solid rgba(239, 68, 68, 0.2)', padding: '14px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.03)' }}>
            <label className="field-label" style={{ color: '#EF4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldAlert size={14} /> Emergency Contact
            </label>
            <div className="input-wrapper" style={{ marginTop: '8px' }}>
              <span className="input-icon"><Phone size={18} /></span>
              <input 
                className="field-input" 
                type="tel" 
                placeholder="SOS Contact Number" 
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

        <button type="submit" className="btn btn-primary" style={{ marginTop: '30px', marginBottom: '10px' }} disabled={loading}>
          {loading ? 'Saving...' : 'Save & Proceed'}
        </button>
      </form>
    </div>
  );
}
