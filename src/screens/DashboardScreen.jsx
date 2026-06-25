import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Link2, MapPin, Compass, Award, ChevronRight } from 'lucide-react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import { supabase } from '../supabase';

export default function DashboardScreen({ onShowToast }) {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [profile, setProfile] = useState(null);
  const [dbStats, setDbStats] = useState({
    totalRides: 0,
    totalDistance: 0,
    topSpeed: 0,
    safeHours: 0
  });
  const [upcomingRides, setUpcomingRides] = useState([]);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Initial local profile check
    let localProfile = null;
    try {
      const profileStr = localStorage.getItem('rydr_rider_profile');
      if (!profileStr) {
        navigate('/');
        return;
      }
      localProfile = JSON.parse(profileStr);
      setProfile(localProfile);
    } catch (e) {
      console.warn('Failed to parse rider profile:', e);
      navigate('/');
      return;
    }

    const fetchSupabaseData = async () => {
      if (!localProfile?.riderId) return;

      try {
        setLoading(true);

        // a. Fetch cumulative stats from public.riders
        const { data: riderData, error: riderErr } = await supabase
          .from('riders')
          .select('total_rides, total_distance, top_speed, safe_hours')
          .eq('rider_id', localProfile.riderId)
          .single();

        if (riderData) {
          setDbStats({
            totalRides: riderData.total_rides || 0,
            totalDistance: Number(riderData.total_distance || 0).toFixed(1),
            topSpeed: riderData.top_speed || 0,
            safeHours: riderData.safe_hours || 0
          });
        } else if (riderErr) {
          console.warn('Rider DB fetch issue:', riderErr.message);
        }

        // b. Fetch recent completed rides from public.ride_history
        const { data: histData } = await supabase
          .from('ride_history')
          .select('*')
          .eq('rider_id', localProfile.riderId)
          .order('completed_at', { ascending: false })
          .limit(3);

        if (histData) {
          setHistoryLogs(histData);
        }

        // c. Fetch active public pack rides from public.rides
        const { data: ridesData } = await supabase
          .from('rides')
          .select('ride_id, title, ride_date, host_name')
          .eq('active', true)
          .eq('privacy', 'public')
          .order('created_at', { ascending: false })
          .limit(3);

        if (ridesData) {
          setUpcomingRides(ridesData);
        }

      } catch (err) {
        console.error('Supabase fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSupabaseData();
  }, [navigate]);

  if (!profile) return null;

  const stats = [
    { label: 'Rides Done', value: dbStats.totalRides },
    { label: 'Total Distance', value: `${dbStats.totalDistance} km` },
    { label: 'Top Speed', value: `${dbStats.topSpeed} km/h` },
    { label: 'Safe Hours', value: `${dbStats.safeHours}h` }
  ];

  return (
    <div className="page" style={{ background: '#09090b', overflowY: 'auto' }}>
      <Header onMenuClick={() => setIsSidebarOpen(true)} title="Rydr Pack" />
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} onShowToast={onShowToast} />

      <div style={{ padding: '20px 20px 40px' }}>
        
        {/* Welcome Section */}
        <div style={{ marginBottom: '24px' }}>
          <p style={{ color: '#A1A1AA', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
            Welcome back, rider
          </p>
          <h2 style={{ fontFamily: 'Outfit', fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.5px', marginTop: '2px' }}>
            Hey, {profile.firstName}!
          </h2>
          {profile.bikeModel && (
            <p style={{ color: '#F97316', fontSize: '0.82rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(249,115,22,0.08)', padding: '4px 10px', borderRadius: '100px', marginTop: '8px', border: '1px solid rgba(249,115,22,0.15)' }}>
              Model: {profile.bikeBrand} {profile.bikeModel}
            </p>
          )}
        </div>

        {/* HUD Quick Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px' }}>
          
          <button 
            onClick={() => navigate('/create-ride')}
            style={{
              background: 'linear-gradient(135deg, #18181B, #121214)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px',
              padding: '20px 16px',
              color: '#fff',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              height: '130px',
              transition: 'all 0.2s',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#F97316'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
          >
            <div style={{ width: '36px', height: '36px', background: 'rgba(249, 115, 22, 0.1)', border: '1px solid rgba(249, 115, 22, 0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F97316' }}>
              <Plus size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '2px' }}>Create Ride</h3>
              <p style={{ color: '#71717A', fontSize: '0.72rem' }}>Invite your pack to ride</p>
            </div>
          </button>

          <button 
            onClick={() => navigate('/join-ride')}
            style={{
              background: 'linear-gradient(135deg, #18181B, #121214)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px',
              padding: '20px 16px',
              color: '#fff',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              height: '130px',
              transition: 'all 0.2s',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#F97316'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
          >
            <div style={{ width: '36px', height: '36px', background: 'rgba(14, 165, 233, 0.1)', border: '1px solid rgba(14, 165, 233, 0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0EA5E9' }}>
              <Link2 size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '2px' }}>Join Ride</h3>
              <p style={{ color: '#71717A', fontSize: '0.72rem' }}>Enter code / link to track</p>
            </div>
          </button>

        </div>

        {/* User Biker Statistics */}
        <div className="card" style={{ padding: '16px 20px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#A1A1AA', fontWeight: 700, marginBottom: '14px' }}>
            Rider Metrics (Database Active)
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {stats.map((s, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ color: '#52525B', fontSize: '0.75rem', fontWeight: 600 }}>{s.label}</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginTop: '2px' }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Active Public Rides */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontFamily: 'Outfit', fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>Active Public Pack Rides</h3>
          </div>
          
          {loading ? (
            <div style={{ color: '#71717A', fontSize: '0.82rem', padding: '10px 0' }}>Syncing database...</div>
          ) : upcomingRides.length === 0 ? (
            <div style={{ color: '#52525B', fontSize: '0.78rem', fontStyle: 'italic', padding: '10px 0' }}>
              No public pack rides active. Go ahead and create one!
            </div>
          ) : (
            upcomingRides.map((ride, idx) => (
              <div 
                key={idx} 
                className="card" 
                onClick={() => navigate(`/join-ride?rideId=${ride.ride_id}`)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', cursor: 'pointer' }}
              >
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>{ride.title}</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '0.75rem', color: '#71717A' }}>
                    <span>Date: {ride.ride_date}</span>
                    <span>·</span>
                    <span>Host: {ride.host_name}</span>
                  </div>
                </div>
                <ChevronRight size={16} color="#F97316" />
              </div>
            ))
          )}
        </div>

        {/* Recent Finished Rides (Personal History) */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontFamily: 'Outfit', fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>Recent Finished Runs</h3>
          </div>

          {loading ? (
            <div style={{ color: '#71717A', fontSize: '0.82rem', padding: '10px 0' }}>Loading logs...</div>
          ) : historyLogs.length === 0 ? (
            <div style={{ color: '#52525B', fontSize: '0.78rem', fontStyle: 'italic', padding: '10px 0' }}>
              Completed ride summaries will appear here.
            </div>
          ) : (
            historyLogs.map((log, idx) => (
              <div key={idx} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Award size={18} color="#F97316" />
                  <div>
                    <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff' }}>{log.title}</h4>
                    <span style={{ fontSize: '0.75rem', color: '#71717A' }}>{log.distance.toFixed(1)} km · Duration: {Math.round(log.duration / 60)} mins</span>
                  </div>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#10B981', background: 'rgba(16,185,129,0.08)', padding: '2px 8px', borderRadius: '100px', fontWeight: 600 }}>
                  🏁 Summary
                </span>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
