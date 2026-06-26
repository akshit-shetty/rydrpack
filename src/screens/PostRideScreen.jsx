import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, Trophy, Clock, Milestone, Activity, Home, Share2 } from 'lucide-react';
import Header from '../components/Header';

export default function PostRideScreen({ onShowToast }) {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    try {
      const summaryStr = localStorage.getItem('rydr_last_ride_summary');
      if (summaryStr) {
        setSummary(JSON.parse(summaryStr));
      } else {
        // Fallback mock summary
        setSummary({
          title: 'Weekend Lonavala Run',
          date: new Date().toLocaleDateString('en-IN'),
          distance: 78.4,
          duration: 6420, // seconds
          topSpeed: 104,
          avgSpeed: 44,
          ridersJoined: 6
        });
      }
    } catch (e) {
      console.warn('Failed to parse final ride summary:', e);
    }
  }, []);

  if (!summary) return null;

  const formatDuration = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.ceil((secs % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m} min`;
  };

  const handleShareStory = () => {
    if (navigator.share) {
      navigator.share({
        title: `Completed ${summary.title}!`,
        text: `I just finished riding ${summary.distance.toFixed(1)} km at an average of ${summary.avgSpeed} km/h with Rydr! 🏍️`,
        url: window.location.origin
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`I just finished riding ${summary.distance.toFixed(1)} km with my Rydr pack! 🏍️`).then(() => {
        onShowToast('Ride story copied to clipboard!', 'success');
      });
    }
  };

  const statCards = [
    { icon: <Milestone size={18} />, label: 'Distance', value: `${summary.distance.toFixed(1)} km`, color: '#F97316' },
    { icon: <Clock size={18} />, label: 'Duration', value: formatDuration(summary.duration), color: '#0EA5E9' },
    { icon: <Activity size={18} />, label: 'Avg Speed', value: `${summary.avgSpeed} km/h`, color: '#10B981' },
    { icon: <Trophy size={18} />, label: 'Top Speed', value: `${summary.topSpeed} km/h`, color: '#A78BFA' },
  ];

  return (
    <div className="page" style={{ background: '#09090b', overflowY: 'auto' }}>
      <Header title="Ride Summary" showMenu={false} />

      <div style={{ padding: '16px 20px 48px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* Trophy with animated ring */}
        <div style={{ position: 'relative', marginTop: '10px', marginBottom: '20px' }}>
          {/* Outer rotating gradient ring */}
          <div style={{
            position: 'absolute', inset: '-10px',
            borderRadius: '50%',
            border: '2px solid transparent',
            backgroundImage: 'conic-gradient(#F97316, #ff5f00, transparent, transparent)',
            animation: 'spin-slow 4s linear infinite',
            WebkitMask: 'radial-gradient(farthest-side, transparent 60%, #000 61%)',
          }} />
          {/* Inner circle */}
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: 'rgba(249,115,22,0.08)',
            border: '1.5px solid rgba(249,115,22,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#F97316',
          }}>
            <Trophy size={38} />
          </div>
        </div>

        <h2 style={{ fontFamily: 'Outfit', fontSize: '1.7rem', fontWeight: 900, textAlign: 'center', color: '#fff', letterSpacing: '-0.5px' }}>
          Ride Accomplished!
        </h2>
        <p style={{ fontSize: '0.78rem', color: '#71717A', textAlign: 'center', marginTop: '6px', lineHeight: '1.5' }}>
          You completed the ride successfully with your pack.
        </p>

        {/* Stats Grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: '10px', width: '100%',
          marginTop: '28px', marginBottom: '18px',
        }}>
          {statCards.map((s, idx) => (
            <div key={idx} className="card" style={{
              display: 'flex', flexDirection: 'column', gap: '8px',
              marginBottom: 0, padding: '16px 18px',
              borderTop: `2px solid ${s.color}33`,
            }}>
              <span style={{ color: s.color }}>{s.icon}</span>
              <span style={{ fontSize: '0.68rem', color: '#52525B', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>{s.label}</span>
              <span style={{ fontFamily: 'Outfit', fontSize: '1.25rem', fontWeight: 800, color: '#F4F4F5' }}>{s.value}</span>
            </div>
          ))}
        </div>

        {/* Badge Card */}
        <div className="card" style={{
          width: '100%',
          background: 'rgba(167,139,250,0.04)',
          borderColor: 'rgba(167,139,250,0.18)',
          borderTop: '2px solid rgba(167,139,250,0.3)',
          display: 'flex', gap: '14px', alignItems: 'center',
          padding: '16px 18px', marginBottom: '24px',
        }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
            background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#A78BFA',
          }}>
            <Award size={22} />
          </div>
          <div>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#F4F4F5' }}>Pack Integrator Badge</h4>
            <p style={{ color: '#71717A', fontSize: '0.72rem', marginTop: '3px', lineHeight: '1.4' }}>
              Successfully rode with {summary.ridersJoined} pack members. Badge synced with profile.
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button className="btn btn-primary" onClick={handleShareStory} style={{ borderRadius: '12px' }}>
            <Share2 size={16} /> Share Ride Story
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/dashboard')} style={{ borderRadius: '12px' }}>
            <Home size={16} /> Return to Dashboard
          </button>
        </div>

      </div>
    </div>
  );
}
