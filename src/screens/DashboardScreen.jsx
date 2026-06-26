import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Link2, MapPin, Compass, Award, ChevronRight, TrendingUp } from 'lucide-react';
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
    { label: 'Rides Done', value: dbStats.totalRides, color: '#F97316' },
    { label: 'Distance', value: `${dbStats.totalDistance} km`, color: '#0EA5E9' },
    { label: 'Top Speed', value: `${dbStats.topSpeed} km/h`, color: '#10B981' },
    { label: 'Safe Hours', value: `${dbStats.safeHours}h`, color: '#A78BFA' },
  ];

  return (
    <div className="page" style={{ background: '#09090b', overflowY: 'auto' }}>
      <Header onMenuClick={() => setIsSidebarOpen(true)} title="RydrPack" />
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} onShowToast={onShowToast} />

      <div style={{ padding: '20px 20px 48px' }}>

        {/* Ambient glow */}
        <div style={{
          position: 'absolute', top: 60, left: '50%', transform: 'translateX(-50%)',
          width: '280px', height: '160px',
          background: 'radial-gradient(ellipse, rgba(249,115,22,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Welcome Section */}
        <div style={{ marginBottom: '24px', position: 'relative', zIndex: 1 }}>
          <p style={{
            color: '#52525B', fontSize: '0.72rem', textTransform: 'uppercase',
            letterSpacing: '1.2px', fontWeight: 700,
          }}>
            Welcome back, rider
          </p>
          <h2 style={{
            fontFamily: 'Outfit', fontSize: '1.9rem', fontWeight: 900,
            letterSpacing: '-0.8px', marginTop: '3px', color: '#F4F4F5',
          }}>
            Hey, {profile.firstName}!
          </h2>
          {profile.bikeModel && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              color: '#F97316', fontSize: '0.76rem', fontWeight: 700,
              background: 'rgba(249,115,22,0.08)',
              padding: '4px 12px', borderRadius: '999px', marginTop: '10px',
              border: '1px solid rgba(249,115,22,0.18)',
            }}>
              🏍️ {profile.bikeBrand} {profile.bikeModel}
            </span>
          )}
        </div>

        {/* Action Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px', position: 'relative', zIndex: 1 }}>
          {/* Create Ride */}
          <button
            onClick={() => navigate('/create-ride')}
            style={{
              background: '#0e0e10',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '18px', padding: '20px 16px',
              color: '#fff', textAlign: 'left', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              height: '136px', transition: 'all 0.2s',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              position: 'relative', overflow: 'hidden',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(249,115,22,0.4)'; e.currentTarget.style.background = '#111113'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.background = '#0e0e10'; }}
          >
            <div style={{
              position: 'absolute', bottom: 0, right: 0,
              width: '80px', height: '80px',
              background: 'radial-gradient(circle, rgba(249,115,22,0.08) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />
            <div style={{
              width: '36px', height: '36px',
              background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)',
              borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F97316',
            }}>
              <Plus size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '3px' }}>Create Ride</h3>
              <p style={{ color: '#52525B', fontSize: '0.7rem', lineHeight: '1.3' }}>Start a new pack session</p>
            </div>
          </button>

          {/* Join Ride */}
          <button
            onClick={() => navigate('/join-ride')}
            style={{
              background: '#0e0e10',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '18px', padding: '20px 16px',
              color: '#fff', textAlign: 'left', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              height: '136px', transition: 'all 0.2s',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              position: 'relative', overflow: 'hidden',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(14,165,233,0.4)'; e.currentTarget.style.background = '#111113'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.background = '#0e0e10'; }}
          >
            <div style={{
              position: 'absolute', bottom: 0, right: 0,
              width: '80px', height: '80px',
              background: 'radial-gradient(circle, rgba(14,165,233,0.08) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />
            <div style={{
              width: '36px', height: '36px',
              background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.2)',
              borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0EA5E9',
            }}>
              <Link2 size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '3px' }}>Join Ride</h3>
              <p style={{ color: '#52525B', fontSize: '0.7rem', lineHeight: '1.3' }}>Enter code to sync GPS</p>
            </div>
          </button>
        </div>

        {/* Stats Card */}
        <div className="card" style={{ padding: '18px 20px', marginBottom: '24px', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span className="section-label" style={{ marginBottom: 0 }}>Your Stats</span>
            <TrendingUp size={14} style={{ color: '#3F3F46' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {stats.map((s, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ width: '24px', height: '2px', borderRadius: '2px', background: s.color, opacity: 0.6 }} />
                <span style={{ color: '#52525B', fontSize: '0.72rem', fontWeight: 600, marginTop: '4px' }}>{s.label}</span>
                {loading ? (
                  <div className="shimmer" style={{ width: '60px', height: '22px', marginTop: '2px' }} />
                ) : (
                  <span style={{ fontFamily: 'Outfit', fontSize: '1.25rem', fontWeight: 800, color: '#F4F4F5' }}>{s.value}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Active Public Rides */}
        <div style={{ marginBottom: '24px', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontFamily: 'Outfit', fontSize: '1rem', fontWeight: 800, color: '#F4F4F5' }}>
              Active Pack Rides
            </h3>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[1,2].map(i => <div key={i} className="shimmer" style={{ height: '60px', borderRadius: '12px' }} />)}
            </div>
          ) : upcomingRides.length === 0 ? (
            <div style={{
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '14px', padding: '20px',
              color: '#3F3F46', fontSize: '0.78rem', fontStyle: 'italic', textAlign: 'center',
            }}>
              No public pack rides active right now.<br />
              <span style={{ color: '#F97316', fontWeight: 600, fontStyle: 'normal' }}>Create one!</span>
            </div>
          ) : (
            upcomingRides.map((ride, idx) => (
              <div
                key={idx}
                className="card"
                onClick={() => navigate(`/join-ride?rideId=${ride.ride_id}`)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginBottom: '10px', cursor: 'pointer', padding: '14px 16px',
                  borderLeft: '3px solid rgba(249,115,22,0.5)',
                }}
              >
                <div>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#F4F4F5' }}>{ride.title}</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px', fontSize: '0.72rem', color: '#52525B' }}>
                    <span>{ride.ride_date}</span>
                    <span>·</span>
                    <span>{ride.host_name}</span>
                  </div>
                </div>
                <ChevronRight size={16} color="#F97316" />
              </div>
            ))
          )}
        </div>

        {/* Recent Rides History */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontFamily: 'Outfit', fontSize: '1rem', fontWeight: 800, color: '#F4F4F5' }}>
              Recent Finished Runs
            </h3>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className="shimmer" style={{ height: '60px', borderRadius: '12px' }} />
            </div>
          ) : historyLogs.length === 0 ? (
            <div style={{
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '14px', padding: '20px',
              color: '#3F3F46', fontSize: '0.78rem', fontStyle: 'italic', textAlign: 'center',
            }}>
              Completed ride summaries will appear here.
            </div>
          ) : (
            historyLogs.map((log, idx) => (
              <div key={idx} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '10px',
                    background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Award size={16} color="#F97316" />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#F4F4F5' }}>{log.title}</h4>
                    <span style={{ fontSize: '0.72rem', color: '#52525B' }}>{log.distance.toFixed(1)} km · {Math.round(log.duration / 60)} mins</span>
                  </div>
                </div>
                <span style={{
                  fontSize: '0.68rem', color: '#10B981', fontWeight: 700,
                  background: 'rgba(16,185,129,0.08)', padding: '3px 10px',
                  borderRadius: '999px', border: '1px solid rgba(16,185,129,0.15)',
                  whiteSpace: 'nowrap',
                }}>
                  🏁 Done
                </span>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
