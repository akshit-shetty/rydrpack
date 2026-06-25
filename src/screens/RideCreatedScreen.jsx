import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, Copy, Share2, Compass, MessageSquare, Send } from 'lucide-react';
import Header from '../components/Header';
import { QRCodeSVG } from 'qrcode.react';

export default function RideCreatedScreen({ onShowToast }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rideId = searchParams.get('rideId') || sessionStorage.getItem('rydr_last_created_ride_id');

  const [inviteLink, setInviteLink] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    if (!rideId) {
      navigate('/dashboard');
      return;
    }
    const origin = window.location.origin;
    // Build invite link pointing to our React join page
    const link = `${origin}/join-ride?rideId=${encodeURIComponent(rideId)}`;
    setInviteLink(link);
  }, [rideId, navigate]);

  if (!rideId) return null;

  const handleCopyId = () => {
    navigator.clipboard.writeText(rideId).then(() => {
      onShowToast('Ride ID copied!', 'success');
    });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink).then(() => {
      onShowToast('Invite Link copied!', 'success');
    });
  };

  const handleShareWhatsapp = () => {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent('Join my Rydr pack! 🏍️\n' + inviteLink)}`);
    setShowShareModal(false);
  };

  const handleShareTelegram = () => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent('Join my Rydr pack! 🏍️')}`);
    setShowShareModal(false);
  };

  const handleShareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my Rydr pack!',
          text: 'Track our motorcycle ride in real time.',
          url: inviteLink
        });
        setShowShareModal(false);
      } catch (e) {
        console.warn('Native share failed:', e);
      }
    } else {
      handleCopyLink();
      setShowShareModal(false);
    }
  };

  const handleEnterDashboard = () => {
    const sessionStr = sessionStorage.getItem('rydr_session') || localStorage.getItem('rydr_rider');
    if (sessionStr) {
      try {
        const session = JSON.parse(sessionStr);
        // Base64 encode for parity with vanilla URL structures if they bookmark or share it directly
        const unicodeToUrlBase64 = (str) => {
          const bytes = new TextEncoder().encode(str);
          let binary = '';
          for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
          return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        };
        const encoded = unicodeToUrlBase64(JSON.stringify(session));
        navigate(`/ride?s=${encoded}`);
      } catch (e) {
        navigate(`/ride?rideId=${rideId}`);
      }
    } else {
      navigate(`/ride?rideId=${rideId}`);
    }
  };

  return (
    <div className="page" style={{ background: '#09090b', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header */}
      <header className="app-header">
        <button className="icon-btn" onClick={() => navigate('/create-ride')}>
          <ArrowLeft size={18} />
        </button>
        <span className="logo-text" style={{ fontSize: '1.15rem' }}>Ride Published</span>
        <span style={{ width: '40px' }} />
      </header>

      <div style={{ padding: '24px 20px', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        {/* Success Icon */}
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: 'rgba(16, 185, 129, 0.1)',
          border: '2px solid rgba(16, 185, 129, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#10B981',
          marginBottom: '20px',
          marginTop: '10px'
        }}>
          <Check size={36} />
        </div>

        <h2 style={{ fontFamily: 'Outfit', fontSize: '1.6rem', fontWeight: 900, textAlign: 'center', color: '#fff' }}>
          Your Ride is Live!
        </h2>
        <p style={{ fontSize: '0.82rem', color: '#A1A1AA', textAlign: 'center', marginTop: '6px', maxWidth: '300px', lineHeight: '1.4' }}>
          Share the ride credentials or QR code below with your crew to sync mapping.
        </p>

        {/* Info Card */}
        <div className="card" style={{ width: '100%', marginTop: '30px', background: '#121214', border: '1px solid rgba(255,255,255,0.06)' }}>
          
          {/* Ride ID row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div>
              <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#52525B', fontWeight: 700, letterSpacing: '0.8px' }}>Ride ID</span>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', marginTop: '2px', fontFamily: 'monospace' }}>{rideId}</div>
            </div>
            <button className="icon-btn" onClick={handleCopyId} title="Copy Ride ID">
              <Copy size={16} />
            </button>
          </div>

          {/* Invite link row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ minWidth: 0, flex: 1, marginRight: '16px' }}>
              <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#52525B', fontWeight: 700, letterSpacing: '0.8px' }}>Invite Link</span>
              <div style={{ fontSize: '0.8rem', color: '#A1A1AA', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {inviteLink}
              </div>
            </div>
            <button className="icon-btn" onClick={handleCopyLink} title="Copy Link">
              <Copy size={16} />
            </button>
          </div>

          {/* QR Code Container */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
            <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {inviteLink && (
                <QRCodeSVG 
                  value={inviteLink} 
                  size={130} 
                  bgColor="#FFFFFF" 
                  fgColor="#09090B" 
                  level="H" 
                />
              )}
            </div>
          </div>

          {/* Share Button */}
          <button className="btn btn-primary" onClick={() => setShowShareModal(true)} style={{ width: '100%' }}>
            <Share2 size={16} />
            Invite Crew
          </button>
        </div>

        {/* Launch HUD dashboard button */}
        <button 
          className="btn btn-secondary" 
          onClick={handleEnterDashboard}
          style={{
            marginTop: 'auto',
            background: 'linear-gradient(135deg, #F97316, #FF5500)',
            color: '#FFFFFF',
            border: 'none',
            boxShadow: '0 4px 15px rgba(249, 115, 22, 0.3)'
          }}
        >
          Enter HUD Dashboard
          <Compass size={18} style={{ marginLeft: '4px' }} />
        </button>

      </div>

      {/* Share Drawer Modal Sheet */}
      {showShareModal && (
        <>
          <div className="sidebar-overlay" onClick={() => setShowShareModal(false)} style={{ zIndex: 1000 }} />
          <div style={{
            position: 'fixed',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '100%',
            maxWidth: '430px',
            background: '#121214',
            borderTopLeftRadius: '24px',
            borderTopRightRadius: '24px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            zIndex: 1001,
            padding: '24px 20px',
            boxSizing: 'border-box',
            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', margin: '0 auto 20px' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', textAlign: 'center', marginBottom: '18px', fontFamily: 'Outfit' }}>
              Share Ride Invite
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button onClick={handleShareWhatsapp} className="btn" style={{ background: '#10B981', color: 'white', border: 'none' }}>
                <MessageSquare size={16} /> Share via WhatsApp
              </button>
              <button onClick={handleShareTelegram} className="btn" style={{ background: '#0EA5E9', color: 'white', border: 'none' }}>
                <Send size={16} /> Share via Telegram
              </button>
              <button onClick={handleCopyLink} className="btn" style={{ background: 'rgba(255,255,255,0.06)', color: 'white', border: '1px solid rgba(255,255,255,0.08)' }}>
                <Copy size={16} /> Copy Invite Link
              </button>
              <button onClick={handleShareNative} className="btn btn-primary">
                <Share2 size={16} /> System Share Sheet
              </button>
            </div>
            
            <button 
              onClick={() => setShowShareModal(false)} 
              style={{
                marginTop: '16px',
                width: '100%',
                background: 'none',
                border: 'none',
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#71717A',
                padding: '10px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </>
      )}

    </div>
  );
}
