import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, Phone, Heart, Bike, Compass, ShieldAlert, Lock, Save } from 'lucide-react';
import { supabase } from '../supabase';

export default function EditProfileScreen({ onShowToast }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Profile fields state
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

  useEffect(() => {
    // 1. Load from localStorage first to pre-fill quickly
    const loadCachedProfile = () => {
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
        } else {
          // If no local profile, redirect to landing
          navigate('/');
        }
      } catch (e) {
        console.warn('Failed to parse cached rider profile:', e);
      }
    };

    // 2. Fetch fresh values from Supabase to sync
    const fetchLatestProfile = async () => {
      const riderId = localStorage.getItem('rydr_rider_id');
      if (!riderId) {
        setInitialLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('riders')
          .select('*')
          .eq('rider_id', riderId)
          .single();

        if (error) {
          console.warn('Could not load latest rider profile from database:', error.message);
        } else if (data) {
          setFirstName(data.first_name || '');
          setLastName(data.last_name || '');
          setEmail(data.email || '');
          setPassword(data.password || '');
          setContact(data.contact || '');
          setEmergencyContact(data.emergency_contact || '');
          setBloodGroup(data.blood_group || '');
          setBikeBrand(data.bike_brand || '');
          setBikeModel(data.bike_model || '');
          setRideStyle(data.ride_style || 'cruising');
          setPace(data.pace || 'normal');

          // Sync cache with latest DB data
          const updatedProfile = {
            firstName: data.first_name,
            lastName: data.last_name,
            email: data.email,
            password: data.password,
            contact: data.contact,
            emergencyContact: data.emergency_contact,
            bloodGroup: data.blood_group,
            bikeBrand: data.bike_brand,
            bikeModel: data.bike_model,
            rideStyle: data.ride_style,
            pace: data.pace,
            riderId: data.rider_id
          };
          localStorage.setItem('rydr_rider_profile', JSON.stringify(updatedProfile));
        }
      } catch (err) {
        console.warn('DB fetch error on edit profile init:', err);
      } finally {
        setInitialLoading(false);
      }
    };

    loadCachedProfile();
    fetchLatestProfile();
  }, [navigate]);

  const validateFields = () => {
    const nameRegex = /^[A-Za-z\s]{2,30}$/;
    const phoneRegex = /^\+?[0-9]{10,15}$/;

    if (!firstName.trim()) { onShowToast('First name is required', 'error'); return false; }
    if (!nameRegex.test(firstName.trim())) { onShowToast('First name should contain letters only (2-30 characters)', 'error'); return false; }

    if (!lastName.trim()) { onShowToast('Last name is required', 'error'); return false; }
    if (!nameRegex.test(lastName.trim())) { onShowToast('Last name should contain letters only (2-30 characters)', 'error'); return false; }

    if (!emergencyContact.trim()) { onShowToast('Emergency contact is required', 'error'); return false; }
    if (!phoneRegex.test(emergencyContact.trim())) { onShowToast('Please enter a valid emergency contact number (10-15 digits)', 'error'); return false; }

    if (contact.trim() === emergencyContact.trim()) {
      onShowToast('Emergency contact cannot be the same as your own contact number', 'error');
      return false;
    }

    if (!bloodGroup) { onShowToast('Please select your blood group', 'error'); return false; }

    return true;
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!validateFields()) return;

    setLoading(true);
    const riderId = localStorage.getItem('rydr_rider_id');

    if (!riderId) {
      onShowToast('Rider session not found. Please register/login again.', 'error');
      setLoading(false);
      return;
    }

    try {

      // 3. Update Supabase
      const { error } = await supabase
        .from('riders')
        .update({
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
        })
        .eq('rider_id', riderId);

      if (error) {
        throw new Error(error.message);
      }

      // 4. Update localStorage cache
      const updatedProfile = {
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
      localStorage.setItem('rydr_rider_profile', JSON.stringify(updatedProfile));

      onShowToast('Profile updated successfully! 🏍️', 'success');
      setTimeout(() => {
        navigate('/dashboard');
      }, 800);

    } catch (err) {
      console.error('Failed to update profile:', err);
      onShowToast(`Update failed: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

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

  if (initialLoading) {
    return (
      <div className="page" style={{ background: '#09090b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#A1A1AA', fontFamily: 'Outfit', fontWeight: 600 }}>Syncing profile details...</div>
      </div>
    );
  }

  return (
    <div className="page" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 0%, #1a0e06 0%, #09090b 55%)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      {/* Top Header Row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '20px 20px 10px',
        borderBottom: '1px solid rgba(255,255,255,0.03)',
        position: 'sticky', top: 0, background: 'rgba(9,9,11,0.95)', backdropFilter: 'blur(12px)', zIndex: 100
      }}>
        <button
          onClick={() => navigate('/dashboard')}
          disabled={loading}
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '8px', width: '32px', height: '32px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#A1A1AA', cursor: 'pointer', flexShrink: 0,
          }}
        >
          <ArrowLeft size={16} />
        </button>
        <span style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1rem', color: '#F4F4F5' }}>
          Edit Rider Profile
        </span>
      </div>

      <form onSubmit={handleUpdate} style={{ padding: '16px 20px 32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Section 1: Account Info */}
        <div className="card" style={{ background: 'rgba(14,14,16,0.75)', border: '1px solid rgba(255,255,255,0.07)', padding: '20px', borderRadius: '18px' }}>
          <h3 style={{ fontFamily: 'Outfit', fontSize: '1rem', fontWeight: 800, color: '#fff', marginBottom: '14px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
            Account Credentials
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <label className="field-label">First Name</label>
              <div className="input-wrapper">
                <span className="input-icon"><User size={15} /></span>
                <input className="field-input" type="text" placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={loading} maxLength={25} />
              </div>
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <label className="field-label">Last Name</label>
              <div className="input-wrapper">
                <span className="input-icon"><User size={15} /></span>
                <input className="field-input" type="text" placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={loading} maxLength={25} />
              </div>
            </div>
          </div>

          <div className="form-field" style={{ marginBottom: 0, marginTop: '10px' }}>
            <label className="field-label" style={{ opacity: 0.6 }}>Email Address (Locked)</label>
            <div className="input-wrapper">
              <span className="input-icon"><Mail size={15} style={{ opacity: 0.5 }} /></span>
              <input className="field-input" type="email" placeholder="Email" value={email} readOnly style={{ opacity: 0.6, cursor: 'not-allowed', background: 'rgba(255,255,255,0.01)' }} />
            </div>
          </div>
        </div>

        {/* Section 2: Safety & Emergency */}
        <div className="card" style={{ background: 'rgba(14,14,16,0.75)', border: '1px solid rgba(255,255,255,0.07)', padding: '20px', borderRadius: '18px' }}>
          <h3 style={{ fontFamily: 'Outfit', fontSize: '1rem', fontWeight: 800, color: '#fff', marginBottom: '14px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
            Safety & SOS info
          </h3>
          <div className="form-field" style={{ marginBottom: '10px' }}>
            <label className="field-label" style={{ opacity: 0.6 }}>Contact Number (Locked)</label>
            <div className="input-wrapper">
              <span className="input-icon"><Phone size={15} style={{ opacity: 0.5 }} /></span>
              <input className="field-input" type="tel" placeholder="Contact Number" value={contact} readOnly style={{ opacity: 0.6, cursor: 'not-allowed', background: 'rgba(255,255,255,0.01)' }} />
            </div>
          </div>

          <div style={{ border: '1px solid rgba(239,68,68,0.18)', borderRadius: '12px', background: 'rgba(239,68,68,0.03)', padding: '12px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <ShieldAlert size={14} style={{ color: '#EF4444' }} />
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                SOS Emergency Contact
              </span>
            </div>
            <div className="input-wrapper">
              <span className="input-icon"><Phone size={15} /></span>
              <input className="field-input" type="tel" placeholder="Emergency Phone Number" value={emergencyContact} onChange={(e) => setEmergencyContact(e.target.value)} style={{ borderColor: 'rgba(239,68,68,0.2)', background: '#0e0e10' }} disabled={loading} />
            </div>
          </div>

          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="field-label">Blood Group</label>
            <div className="input-wrapper">
              <span className="input-icon"><Heart size={15} /></span>
              <select className="field-input" value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)} style={{ appearance: 'none', background: '#0e0e10', cursor: 'pointer' }} disabled={loading}>
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

        {/* Section 3: Garage */}
        <div className="card" style={{ background: 'rgba(14,14,16,0.75)', border: '1px solid rgba(255,255,255,0.07)', padding: '20px', borderRadius: '18px' }}>
          <h3 style={{ fontFamily: 'Outfit', fontSize: '1rem', fontWeight: 800, color: '#fff', marginBottom: '14px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
            Garage & Style Preferences
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <label className="field-label">Bike Brand</label>
              <div className="input-wrapper">
                <span className="input-icon"><Bike size={15} /></span>
                <input className="field-input" type="text" placeholder="e.g. KTM" value={bikeBrand} onChange={(e) => setBikeBrand(e.target.value)} disabled={loading} />
              </div>
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <label className="field-label">Bike Model</label>
              <div className="input-wrapper">
                <span className="input-icon"><Bike size={15} /></span>
                <input className="field-input" type="text" placeholder="e.g. Duke 390" value={bikeModel} onChange={(e) => setBikeModel(e.target.value)} disabled={loading} />
              </div>
            </div>
          </div>

          <div className="form-field" style={{ marginBottom: 0, marginTop: '10px' }}>
            <label className="field-label">Riding Preference</label>
            <div className="input-wrapper">
              <span className="input-icon"><Compass size={15} /></span>
              <select className="field-input" value={rideStyle} onChange={(e) => setRideStyle(e.target.value)} style={{ appearance: 'none', background: '#0e0e10', cursor: 'pointer' }} disabled={loading}>
                <option value="cruising">Cruising / Touring</option>
                <option value="offroading">Offroading / Adventure</option>
                <option value="racing">Track / Fast Riding</option>
                <option value="city">Urban / Commuting</option>
              </select>
            </div>
          </div>

          <div className="form-field" style={{ marginBottom: 0, marginTop: '10px' }}>
            <label className="field-label">Preferred Pace</label>
            <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
              {['relaxed', 'normal', 'fast'].map((p) => (
                <button key={p} type="button" style={chipStyle(pace === p)} onClick={() => setPace(p)} disabled={loading}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
          <button type="submit" className="btn btn-primary" style={{ borderRadius: '12px' }} disabled={loading}>
            <Save size={16} /> {loading ? 'Saving Changes...' : 'Save Changes'}
          </button>
          <button type="button" className="btn btn-secondary" style={{ borderRadius: '12px' }} onClick={() => navigate('/dashboard')} disabled={loading}>
            Cancel
          </button>
        </div>

      </form>
    </div>
  );
}
