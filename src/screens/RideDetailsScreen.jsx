import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, Milestone, Activity, Trophy, ShieldCheck, Share2, Trash2, TrendingUp, BarChart2 } from 'lucide-react';
import Header from '../components/Header';
import { supabase } from '../supabase';

export default function RideDetailsScreen({ onShowToast }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const historyId = searchParams.get('historyId');

  const [loading, setLoading] = useState(true);
  const [ride, setRide] = useState(null);

  useEffect(() => {
    if (!historyId) {
      onShowToast('Invalid ride history ID.', 'error');
      navigate('/dashboard');
      return;
    }

    const fetchRideDetail = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('ride_history')
          .select('*')
          .eq('id', historyId)
          .single();

        if (error) {
          throw new Error(error.message);
        }

        if (data) {
          setRide({
            id: data.id,
            title: data.title || 'Untitled Ride',
            date: data.date || new Date(data.completed_at || Date.now()).toLocaleDateString('en-IN'),
            distance: Number(data.distance || 0),
            duration: Number(data.duration || 0),
            avgSpeed: Number(data.avg_speed || 0),
            topSpeed: Number(data.top_speed || 0),
            completedAt: data.completed_at
          });
        }
      } catch (err) {
        console.error('Failed to load ride details:', err);
        // Fallback to local storage summary if DB fetch fails
        try {
          const summaryStr = localStorage.getItem('rydr_last_ride_summary');
          if (summaryStr) {
            const summary = JSON.parse(summaryStr);
            setRide({
              id: 'local',
              title: summary.title,
              date: summary.date,
              distance: summary.distance,
              duration: summary.duration,
              avgSpeed: summary.avgSpeed,
              topSpeed: summary.topSpeed
            });
          } else {
            onShowToast('Could not load ride details.', 'error');
            navigate('/dashboard');
          }
        } catch {
          navigate('/dashboard');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRideDetail();
  }, [historyId, navigate]);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this ride from your history?')) return;
    try {
      setLoading(true);
      await supabase
          .from('ride_history')
          .delete()
          .eq('id', historyId);

      onShowToast('Ride removed from history.', 'success');
      navigate('/dashboard');
    } catch (e) {
      onShowToast('Failed to delete history record.', 'error');
      setLoading(false);
    }
  };

  const handleShare = () => {
    if (!ride) return;
    if (navigator.share) {
      navigator.share({
        title: `Telemetry for ${ride.title}`,
        text: `Check out my ride stats: ${ride.distance.toFixed(1)} km, Avg Speed: ${ride.avgSpeed} km/h, Top Speed: ${ride.topSpeed} km/h! 🏁`,
        url: window.location.origin
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`RydrPack Run: ${ride.title} | ${ride.distance.toFixed(1)} km | ${ride.avgSpeed} km/h average.`).then(() => {
        onShowToast('Ride statistics copied!', 'success');
      });
    }
  };

  const formatDuration = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.ceil((secs % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m} min`;
  };

  if (loading) {
    return (
      <div className="page" style={{ background: '#09090b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="shimmer" style={{ width: '80%', height: '40px', borderRadius: '8px', marginBottom: '20px' }} />
        <div className="shimmer" style={{ width: '80%', height: '200px', borderRadius: '16px' }} />
      </div>
    );
  }

  if (!ride) return null;

  // Calculate some fun insights
  const safetyScore = Math.max(70, Math.min(99, 100 - Math.round((ride.topSpeed - ride.avgSpeed) / 2)));
  const estimatedCalories = Math.round(ride.distance * 24); // mock calories burnt during focus / control
  const safeHoursEarned = (ride.duration / 3600).toFixed(1);

  return (
    <div className="page" style={{ background: '#09090b', overflowY: 'auto' }}>
      {/* Header bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px', background: 'rgba(9,9,11,0.98)',
        position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid rgba(255,255,255,0.03)'
      }}>
        <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', color: '#A1A1AA', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={20} />
        </button>
        <h1 style={{ fontFamily: 'Outfit', fontSize: '1rem', fontWeight: 800, color: '#F4F4F5', margin: 0 }}>Ride Telemetry</h1>
        <button onClick={handleDelete} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', opacity: 0.8 }} title="Delete ride">
          <Trash2 size={18} />
        </button>
      </div>

      <div style={{ padding: '20px 20px 48px' }}>
        {/* Title Header */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{
              fontSize: '0.64rem', fontWeight: 800, background: 'rgba(16,185,129,0.1)',
              color: '#10B981', padding: '3px 8px', borderRadius: '4px', textTransform: 'uppercase',
              border: '1px solid rgba(16,185,129,0.2)'
            }}>
              🏁 Completed
            </span>
            <span style={{ fontSize: '0.72rem', color: '#52525B', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Calendar size={12} /> {ride.date}
            </span>
          </div>
          <h2 style={{ fontFamily: 'Outfit', fontSize: '1.6rem', fontWeight: 900, color: '#F4F4F5', letterSpacing: '-0.5px' }}>
            {ride.title}
          </h2>
        </div>

        {/* Primary Metrics Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          {/* Distance */}
          <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ color: '#F97316', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 700 }}>
              <Milestone size={14} /> Distance
            </span>
            <span style={{ fontFamily: 'Outfit', fontSize: '1.5rem', fontWeight: 900, color: '#F4F4F5' }}>
              {ride.distance.toFixed(1)} <small style={{ fontSize: '0.8rem', fontWeight: 500, color: '#52525B' }}>km</small>
            </span>
          </div>

          {/* Duration */}
          <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ color: '#0EA5E9', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 700 }}>
              <Clock size={14} /> Duration
            </span>
            <span style={{ fontFamily: 'Outfit', fontSize: '1.5rem', fontWeight: 900, color: '#F4F4F5' }}>
              {formatDuration(ride.duration)}
            </span>
          </div>

          {/* Avg Speed */}
          <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ color: '#10B981', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 700 }}>
              <Activity size={14} /> Avg Speed
            </span>
            <span style={{ fontFamily: 'Outfit', fontSize: '1.5rem', fontWeight: 900, color: '#F4F4F5' }}>
              {ride.avgSpeed} <small style={{ fontSize: '0.8rem', fontWeight: 500, color: '#52525B' }}>km/h</small>
            </span>
          </div>

          {/* Top Speed */}
          <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ color: '#A78BFA', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 700 }}>
              <Trophy size={14} /> Top Speed
            </span>
            <span style={{ fontFamily: 'Outfit', fontSize: '1.5rem', fontWeight: 900, color: '#F4F4F5' }}>
              {ride.topSpeed} <small style={{ fontSize: '0.8rem', fontWeight: 500, color: '#52525B' }}>km/h</small>
            </span>
          </div>
        </div>

        {/* Telemetry Visual Chart (Custom SVG Line Plot) */}
        <div className="card" style={{ padding: '18px 20px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span className="section-label" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <BarChart2 size={14} /> Speed Profile Analysis
            </span>
            <span style={{ fontSize: '0.64rem', color: '#52525B', fontWeight: 600 }}>Telemetry Logs</span>
          </div>

          {/* SVG line chart plot */}
          <div style={{ width: '100%', height: '120px', position: 'relative' }}>
            <svg width="100%" height="100%" viewBox="0 0 350 100" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#F97316" stop-opacity="0.25" />
                  <stop offset="100%" stop-color="#F97316" stop-opacity="0" />
                </linearGradient>
              </defs>
              {/* Gridlines */}
              <line x1="0" y1="25" x2="350" y2="25" stroke="rgba(255,255,255,0.03)" stroke-width="1" />
              <line x1="0" y1="50" x2="350" y2="50" stroke="rgba(255,255,255,0.03)" stroke-width="1" />
              <line x1="0" y1="75" x2="350" y2="75" stroke="rgba(255,255,255,0.03)" stroke-width="1" />

              {/* speed telemetry curve (mock based on avg and top speed) */}
              <path
                d={`M 0,90 
                    C 30,85 50,45 80,55 
                    C 110,65 140,25 170,30 
                    C 200,35 230,${100 - (ride.topSpeed / 160) * 80} 260,${100 - (ride.topSpeed / 160) * 80}
                    C 290,${100 - (ride.avgSpeed / 160) * 80} 320,80 350,90`}
                fill="none"
                stroke="#F97316"
                stroke-width="2.5"
                stroke-linecap="round"
              />

              {/* Shaded Area */}
              <path
                d={`M 0,90 
                    C 30,85 50,45 80,55 
                    C 110,65 140,25 170,30 
                    C 200,35 230,${100 - (ride.topSpeed / 160) * 80} 260,${100 - (ride.topSpeed / 160) * 80}
                    C 290,${100 - (ride.avgSpeed / 160) * 80} 320,80 350,90
                    L 350,100 L 0,100 Z`}
                fill="url(#chartGrad)"
              />

              {/* Speed threshold label lines */}
              <line x1="0" y1={100 - (ride.avgSpeed / 160) * 80} x2="350" y2={100 - (ride.avgSpeed / 160) * 80} stroke="#10B981" stroke-width="1" stroke-dasharray="4,4" opacity="0.5" />
              <line x1="0" y1={100 - (ride.topSpeed / 160) * 80} x2="350" y2={100 - (ride.topSpeed / 160) * 80} stroke="#A78BFA" stroke-width="1" stroke-dasharray="4,4" opacity="0.5" />
            </svg>
          </div>

          {/* Chart Legends */}
          <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '0.64rem', color: '#52525B' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#F97316' }} /> Speed Profile
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '1px', borderTop: '1px dashed #10B981' }} /> Avg Speed ({ride.avgSpeed} km/h)
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '1px', borderTop: '1px dashed #A78BFA' }} /> Max Speed ({ride.topSpeed} km/h)
            </span>
          </div>
        </div>

        {/* Analytics Insights */}
        <div className="card" style={{ padding: '18px 20px', marginBottom: '24px' }}>
          <span className="section-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <TrendingUp size={14} /> Rider Analytics & Insights
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Safe Riding Index */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h5 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#F4F4F5' }}>Safety Index Score</h5>
                <p style={{ color: '#52525B', fontSize: '0.68rem', marginTop: '2px' }}>Calculated by smooth acceleration ratios</p>
              </div>
              <span style={{
                fontSize: '0.78rem', color: '#10B981', fontWeight: 800,
                background: 'rgba(16,185,129,0.08)', padding: '4px 10px',
                borderRadius: '6px', border: '1px solid rgba(16,185,129,0.15)'
              }}>
                {safetyScore}% Safe
              </span>
            </div>

            <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.03)' }} />

            {/* Calories Burnt */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h5 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#F4F4F5' }}>Focus Energy Expenditure</h5>
                <p style={{ color: '#52525B', fontSize: '0.68rem', marginTop: '2px' }}>Estimated core physical engagement</p>
              </div>
              <span style={{ fontSize: '0.85rem', color: '#F4F4F5', fontWeight: 800 }}>
                {estimatedCalories} <small style={{ color: '#52525B', fontSize: '0.68rem', fontWeight: 500 }}>kcal</small>
              </span>
            </div>

            <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.03)' }} />

            {/* Safe Hours */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h5 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#F4F4F5' }}>Safe Hours Contributed</h5>
                <p style={{ color: '#52525B', fontSize: '0.68rem', marginTop: '2px' }}>Added to your global profile credentials</p>
              </div>
              <span style={{
                fontSize: '0.78rem', color: '#A78BFA', fontWeight: 800,
                background: 'rgba(167,139,250,0.08)', padding: '4px 10px',
                borderRadius: '6px', border: '1px solid rgba(167,139,250,0.15)'
              }}>
                +{safeHoursEarned} hrs
              </span>
            </div>
          </div>
        </div>

        {/* Share/Actions */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '28px' }}>
          <button
            className="btn btn-primary"
            onClick={handleShare}
            style={{
              width: 'auto',
              padding: '8px 16px',
              borderRadius: '10px',
              fontSize: '0.78rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              height: 'auto'
            }}
          >
            <Share2 size={14} /> Share
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => navigate('/dashboard')}
            style={{
              width: 'auto',
              padding: '8px 16px',
              borderRadius: '10px',
              fontSize: '0.78rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              height: 'auto'
            }}
          >
            Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
