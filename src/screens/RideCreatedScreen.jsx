import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, Copy, Share2, Compass, MessageSquare, Send } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { cleanRideId } from './JoinRideScreen';

export default function RideCreatedScreen({ onShowToast }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawRideId = searchParams.get('rideId') || sessionStorage.getItem('rydr_last_created_ride_id');
  const rideId = rawRideId ? cleanRideId(rawRideId) : '';

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
    <div className="page" style={{ background: '#09090b', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

      {/* Header */}
      <header className="app-header">
        <button className="icon-btn" onClick={() => navigate('/create-ride')}>
          <ArrowLeft size={17} />
        </button>
        <span style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1rem', color: '#F4F4F5' }}>Ride Published</span>
        <span style={{ width: '40px' }} />
      </header>

      <div style={{ padding: '20px 20px 40px', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* Success icon with pulsing ring */}
        <div style={{ position: 'relative', marginTop: '10px', marginBottom: '20px' }}>
          <div style={{
            position: 'absolute', inset: '-8px',
            borderRadius: '50%',
            border: '2px solid rgba(16,185,129,0.2)',
            animation: 'pulse-green 2s infinite',
          }} />
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%',
            background: 'rgba(16,185,129,0.1)',
            border: '1.5px solid rgba(16,185,129,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#10B981',
          }}>
            <Check size={36} strokeWidth={2.5} />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <h2 style={{ fontFamily: 'Outfit', fontSize: '1.6rem', fontWeight: 900, textAlign: 'center', color: '#fff' }}>
            Your Ride is Live!
          </h2>
          <span className="live-dot green" />
        </div>
        <p style={{ fontSize: '0.78rem', color: '#71717A', textAlign: 'center', maxWidth: '280px', lineHeight: '1.5' }}>
          Share the ride credentials or QR code with your crew to sync real-time mapping.
        </p>

        {/* Info Card */}
        <div style={{
          width: '100%', marginTop: '28px',
          background: '#0e0e10',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '20px',
          overflow: 'hidden',
        }}>
          {/* Ride ID */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
          }}>
            <div>
              <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#52525B', fontWeight: 700, letterSpacing: '0.8px', display: 'block' }}>Ride ID</span>
              <div style={{
                fontSize: '1.05rem', fontWeight: 800, color: '#F97316',
                marginTop: '3px', fontFamily: 'monospace', letterSpacing: '1px',
              }}>{rideId}</div>
            </div>
            <button className="icon-btn" onClick={handleCopyId} title="Copy Ride ID">
              <Copy size={15} />
            </button>
          </div>

          {/* Invite link */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
          }}>
            <div style={{ minWidth: 0, flex: 1, marginRight: '16px' }}>
              <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#52525B', fontWeight: 700, letterSpacing: '0.8px', display: 'block' }}>Invite Link</span>
              <div style={{ fontSize: '0.75rem', color: '#71717A', marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {inviteLink}
              </div>
            </div>
            <button className="icon-btn" onClick={handleCopyLink} title="Copy Link">
              <Copy size={15} />
            </button>
          </div>

          {/* QR Code */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 20px' }}>
            <div style={{
              background: '#FFFFFF', padding: '16px',
              borderRadius: '16px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}>
              {inviteLink && (
                <QRCodeSVG value={inviteLink} size={130} bgColor="#FFFFFF" fgColor="#09090B" level="H" />
              )}
            </div>
            <p style={{ fontSize: '0.65rem', color: '#52525B', marginTop: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Scan to Join
            </p>
          </div>

          {/* Share button */}
          <div style={{ padding: '0 16px 16px' }}>
            <button className="btn btn-primary" onClick={() => setShowShareModal(true)} style={{ borderRadius: '12px' }}>
              <Share2 size={16} />
              Invite Crew
            </button>
          </div>
        </div>

        {/* Enter HUD button */}
        <button
          className="btn btn-primary"
          onClick={handleEnterDashboard}
          style={{
            marginTop: '16px',
            borderRadius: '12px',
          }}
        >
          Enter HUD Dashboard
          <Compass size={17} />
        </button>

      </div>

      {/* Share Drawer Modal */}
      {showShareModal && (
        <>
          <div className="sidebar-overlay" onClick={() => setShowShareModal(false)} style={{ zIndex: 1000 }} />
          <div style={{
            position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
            width: '100%', maxWidth: '430px',
            background: '#111113',
            borderTopLeftRadius: '24px', borderTopRightRadius: '24px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            zIndex: 1001, padding: '24px 20px',
            boxSizing: 'border-box',
            animation: 'slideUp 0.3s var(--ease-spring)',
          }}>
            <div style={{ width: '36px', height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', margin: '0 auto 20px' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', textAlign: 'center', marginBottom: '18px', fontFamily: 'Outfit' }}>
              Share Ride Invite
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button onClick={handleShareWhatsapp} className="btn" style={{ background: '#10B981', color: 'white', border: 'none', borderRadius: '12px' }}>
                <MessageSquare size={16} /> Share via WhatsApp
              </button>
              <button onClick={handleShareTelegram} className="btn" style={{ background: '#0EA5E9', color: 'white', border: 'none', borderRadius: '12px' }}>
                <Send size={16} /> Share via Telegram
              </button>
              <button onClick={handleCopyLink} className="btn btn-secondary" style={{ borderRadius: '12px' }}>
                <Copy size={16} /> Copy Invite Link
              </button>
              <button onClick={handleShareNative} className="btn btn-primary" style={{ borderRadius: '12px' }}>
                <Share2 size={16} /> System Share Sheet
              </button>
            </div>

            <button
              onClick={() => setShowShareModal(false)}
              style={{
                marginTop: '16px', width: '100%', background: 'none', border: 'none',
                fontSize: '0.82rem', fontWeight: 600, color: '#52525B', padding: '10px', cursor: 'pointer',
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
