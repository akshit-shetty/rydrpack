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

  return (
    <div className="page" style={{ background: '#09090b', overflowY: 'auto' }}>
      <Header title="Ride Summary" showMenu={false} />

      <div style={{ padding: '24px 20px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        {/* Trophy visual */}
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'rgba(249, 115, 22, 0.1)',
          border: '2px solid rgba(249, 115, 22, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#F97316',
          boxShadow: '0 8px 24px rgba(249, 115, 22, 0.2)',
          marginBottom: '20px',
          marginTop: '10px'
        }}>
          <Trophy size={40} />
        </div>

        <h2 style={{ fontFamily: 'Outfit', fontSize: '1.65rem', fontWeight: 900, textAlign: 'center', color: '#fff' }}>
          Ride Accomplished!
        </h2>
        <p style={{ fontSize: '0.82rem', color: '#A1A1AA', textAlign: 'center', marginTop: '4px' }}>
          You completed the ride successfully with your pack.
        </p>

        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          width: '100%',
          marginTop: '28px',
          marginBottom: '24px'
        }}>
          
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: 0, padding: '16px' }}>
            <Milestone size={18} color="#F97316" />
            <span style={{ fontSize: '0.72rem', color: '#52525B', textTransform: 'uppercase', fontWeight: 700 }}>Distance</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>{summary.distance.toFixed(1)} km</span>
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: 0, padding: '16px' }}>
            <Clock size={18} color="#0EA5E9" />
            <span style={{ fontSize: '0.72rem', color: '#52525B', textTransform: 'uppercase', fontWeight: 700 }}>Duration</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>{formatDuration(summary.duration)}</span>
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: 0, padding: '16px' }}>
            <Activity size={18} color="#10B981" />
            <span style={{ fontSize: '0.72rem', color: '#52525B', textTransform: 'uppercase', fontWeight: 700 }}>Average Speed</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>{summary.avgSpeed} km/h</span>
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: 0, padding: '16px' }}>
            <Trophy size={18} color="#A78BFA" />
            <span style={{ fontSize: '0.72rem', color: '#52525B', textTransform: 'uppercase', fontWeight: 700 }}>Top Speed</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>{summary.topSpeed} km/h</span>
          </div>

        </div>

        {/* Badge Card */}
        <div className="card" style={{
          width: '100%',
          background: 'rgba(167, 139, 250, 0.03)',
          borderColor: 'rgba(167, 139, 250, 0.15)',
          display: 'flex',
          gap: '14px',
          alignItems: 'center',
          padding: '16px',
          marginBottom: '28px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'rgba(167, 139, 250, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#A78BFA'
          }}>
            <Award size={22} />
          </div>
          <div>
            <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#fff' }}>Pack Integrator Badge</h4>
            <p style={{ color: '#A1A1AA', fontSize: '0.72rem', marginTop: '2px', lineHeight: '1.3' }}>
              Successfully rode with {summary.ridersJoined} pack members. Badge synchronised with profile.
            </p>
          </div>
        </div>

        {/* Action button triggers */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button className="btn btn-primary" onClick={handleShareStory}>
            <Share2 size={16} /> Share Ride Story Card
          </button>

          <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
            <Home size={16} /> Return to Dashboard
          </button>
        </div>

      </div>
    </div>
  );
}
