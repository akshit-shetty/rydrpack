import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, MoreVertical, Compass, Navigation2, ShieldAlert, Award, Phone, Layers, ShieldCheck, Play, AlertOctagon } from 'lucide-react';
import Header from '../components/Header';
import MapWidget from '../components/MapWidget';
import { useGeolocation, calcDistance } from '../hooks/useGeolocation';
import { supabase } from '../supabase';

export default function LiveRideScreen({ onShowToast }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // State packets
  const [session, setSession] = useState(null);
  const [rideId, setRideId] = useState(null);
  const [rideData, setRideData] = useState(null);
  
  // Geolocation trigger
  const [gpsRequested, setGpsRequested] = useState(false);
  const [gpsPermissionState, setGpsPermissionState] = useState('prompt');

  // UI state
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showRidersOverlay, setShowRidersOverlay] = useState(false);
  const [showDetailsOverlay, setShowDetailsOverlay] = useState(false);
  const [mapStyle, setMapStyle] = useState('dark'); // Dark style premium standard
  const [isCentered, setIsCentered] = useState(true);
  const [laggingRider, setLaggingRider] = useState(null); // Alert display packet

  // Routing metrics
  const [routes, setRoutes] = useState([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [destination, setDestination] = useState(null);
  const [etaSeconds, setEtaSeconds] = useState(null);
  const [distanceRemaining, setDistanceRemaining] = useState(null);

  // Supabase live cohort list
  const [riders, setRiders] = useState([]);

  // Base state tracking refs
  const baseOSRMDistance = useRef(null);
  const baseOSRMDuration = useRef(null);
  const lastRouteUpdateCoords = useRef({ lat: null, lng: null });

  // Load Session and verify ID
  useEffect(() => {
    const encoded = searchParams.get('s');
    const paramRideId = searchParams.get('rideId') || searchParams.get('ride') || searchParams.get('r');
    
    let activeSession = null;

    if (encoded) {
      try {
        // Decode URL base64 session wrapper
        const b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
        const padded = b64 + '=='.slice(0, (4 - b64.length % 4) % 4);
        const decoded = JSON.parse(atob(padded));
        if (decoded?.rideId) activeSession = decoded;
      } catch (e) {
        console.error('Failed to parse URL session state:', e);
      }
    }

    if (!activeSession) {
      try {
        const localSession = localStorage.getItem('rydr_rider') || sessionStorage.getItem('rydr_session');
        if (localSession) {
          const parsed = JSON.parse(localSession);
          if (!paramRideId || parsed.rideId === paramRideId) {
            activeSession = parsed;
          }
        }
      } catch {}
    }

    const finalRideId = activeSession?.rideId || paramRideId;
    
    if (!finalRideId) {
      onShowToast('Session missing. Redirecting home...', 'error');
      navigate('/dashboard');
      return;
    }

    setRideId(finalRideId);
    
    if (activeSession) {
      setSession(activeSession);
      if (activeSession.destination) {
        setDestination(activeSession.destination);
      }
    } else {
      // Guest entering without session setup
      onShowToast('Redirecting to join flow...', 'error');
      navigate(`/join-ride?rideId=${finalRideId}`);
    }
  }, [searchParams, navigate]);

  // Check GPS permission state
  useEffect(() => {
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' })
        .then(r => {
          setGpsPermissionState(r.state);
          if (r.state === 'granted') {
            setGpsRequested(true);
          }
        })
        .catch(() => {});
    }
  }, []);

  const [sessionStartTime] = useState(Date.now());
  const [maxSpeed, setMaxSpeed] = useState(0);

  // Sync GPS Coordinates to Supabase
  const { coords, speed, heading, totalDistance, trail } = useGeolocation({
    rideId,
    session,
    enabled: gpsRequested
  });

  // Track max speed reached during the ride session
  useEffect(() => {
    if (speed > maxSpeed) {
      setMaxSpeed(speed);
    }
  }, [speed, maxSpeed]);

  // Subscribe to Ride Document changes in Supabase
  useEffect(() => {
    if (!rideId) return;

    const fetchRide = async () => {
      try {
        const { data, error } = await supabase
          .from('rides')
          .select('*')
          .eq('ride_id', rideId)
          .single();

        if (data) {
          setRideData({
            title: data.title,
            rideDate: data.ride_date,
            rideTime: data.ride_time,
            pace: data.pace,
            safetyNotes: data.safety_notes,
            hostName: data.host_name,
            hostId: data.host_id,
            createdAt: data.created_at,
            active: data.active
          });

          if (data.destination_lat && !destination) {
            setDestination({
              name: data.destination_name || 'Destination',
              lat: Number(data.destination_lat),
              lng: Number(data.destination_lng)
            });
          }
        }
      } catch (err) {
        console.warn('Failed to load initial ride details:', err);
      }
    };

    fetchRide();

    // Listen to changes on the active ride details
    const subscription = supabase
      .channel(`ride-${rideId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rides', filter: `ride_id=eq.${rideId}` }, payload => {
        const data = payload.new;
        setRideData(prev => prev ? {
          ...prev,
          title: data.title,
          active: data.active
        } : null);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [rideId, destination]);

  // Subscribe to other riders' coordinates in Supabase
  useEffect(() => {
    if (!rideId) return;

    const fetchRidersList = async () => {
      try {
        const { data } = await supabase
          .from('live_riders')
          .select('*')
          .eq('ride_id', rideId);

        if (data) {
          setRiders(data.map(r => ({
            id: r.rider_id,
            name: r.name,
            bike: r.bike,
            color: r.color,
            lat: Number(r.lat),
            lng: Number(r.lng),
            speed: r.speed,
            heading: Number(r.heading),
            online: r.online,
            sos: r.sos,
            isHost: r.is_host
          })));
        }
      } catch (err) {
        console.warn('Failed to fetch cohort:', err);
      }
    };

    fetchRidersList();

    // Websocket changes
    const channel = supabase
      .channel(`live-riders-${rideId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_riders', filter: `ride_id=eq.${rideId}` }, payload => {
        const eventType = payload.eventType;
        const row = payload.new || payload.old;

        if (eventType === 'DELETE') {
          setRiders(prev => prev.filter(r => r.id !== row.rider_id));
        } else {
          const rider = {
            id: row.rider_id,
            name: row.name,
            bike: row.bike,
            color: row.color,
            lat: Number(row.lat),
            lng: Number(row.lng),
            speed: row.speed,
            heading: Number(row.heading),
            online: row.online,
            sos: row.sos,
            isHost: row.is_host
          };

          setRiders(prev => {
            const idx = prev.findIndex(item => item.id === rider.id);
            if (idx >= 0) {
              const clone = [...prev];
              clone[idx] = rider;
              return clone;
            } else {
              return [...prev, rider];
            }
          });
        }
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [rideId]);

  // Fetch OSRM directions
  const fetchOSRMRoute = async (startLat, startLng, destLat, destLng) => {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${destLng},${destLat}?overview=full&geometries=geojson&alternatives=true`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.code === 'Ok' && data.routes?.length) {
        setRoutes(data.routes);
        const bestRoute = data.routes[0];
        baseOSRMDistance.current = bestRoute.distance;
        baseOSRMDuration.current = bestRoute.duration;
        lastRouteUpdateCoords.current = { lat: startLat, lng: startLng };
      }
    } catch (err) {
      console.warn('OSRM routing fetch failed:', err);
    }
  };

  // Route updates on movement (300m threshold)
  useEffect(() => {
    if (coords && destination) {
      const last = lastRouteUpdateCoords.current;
      const moved = !last.lat || calcDistance(last.lat, last.lng, coords.lat, coords.lng) >= 0.3;
      if (moved) {
        fetchOSRMRoute(coords.lat, coords.lng, destination.lat, destination.lng);
      }
    }
  }, [coords, destination]);

  // HUD Math updates
  useEffect(() => {
    if (coords && destination) {
      const currentDistance = calcDistance(coords.lat, coords.lng, destination.lat, destination.lng);
      setDistanceRemaining(currentDistance);

      if (baseOSRMDistance.current && baseOSRMDistance.current > 0.001) {
        const ratio = currentDistance / (baseOSRMDistance.current / 1000);
        if (baseOSRMDuration.current) {
          setEtaSeconds(Math.max(0, Math.round(baseOSRMDuration.current * ratio)));
        }
      } else {
        setEtaSeconds(Math.round(currentDistance * 80));
      }
    } else {
      setDistanceRemaining(totalDistance);
    }
  }, [coords, destination, totalDistance]);

  // Pacing alerts (Check if any online rider falls behind by > 3km)
  useEffect(() => {
    if (!coords) return;
    const lagging = riders.find(r => {
      if (r.id === session?.riderId || !r.online || !r.lat) return false;
      const d = calcDistance(coords.lat, coords.lng, r.lat, r.lng);
      return d > 3.0;
    });

    if (lagging) {
      const d = calcDistance(coords.lat, coords.lng, lagging.lat, lagging.lng);
      setLaggingRider({
        name: lagging.name,
        distance: d,
        status: d > 5 ? 'Needs attention' : 'Lagging slightly'
      });
    } else {
      setLaggingRider(null);
    }
  }, [riders, coords, session]);

  if (!session || !rideId) return null;

  const handleEnableGPS = () => {
    setGpsRequested(true);
  };

  const handleSelectRoute = (idx) => {
    setSelectedRouteIndex(idx);
    const activeRoute = routes[idx];
    if (activeRoute) {
      baseOSRMDistance.current = activeRoute.distance;
      baseOSRMDuration.current = activeRoute.duration;
      onShowToast(`Route ${idx + 1} chosen${idx === 0 ? ' (Fastest)' : ''}`, 'success');
    }
  };

  const toggleSOS = async () => {
    if (!coords) return;
    try {
      const isCurrentlySOS = riders.find(r => r.id === session.riderId)?.sos || false;
      await supabase
        .from('live_riders')
        .update({ sos: !isCurrentlySOS, last_seen: new Date().toISOString() })
        .match({ ride_id: rideId, rider_id: session.riderId });

      onShowToast(isCurrentlySOS ? 'SOS Alarm disabled.' : 'SOS ALARM INITIATED! Crew notified.', isCurrentlySOS ? 'success' : 'error');
    } catch (e) {
      console.error(e);
    }
  };

  const handleEndRide = async () => {
    setIsMenuOpen(false);
    const hostConfirm = window.confirm(
      session.isHost 
        ? 'Are you sure you want to end this ride for everyone? Final ride stats will be saved to your profile database.'
        : 'Are you sure you want to leave this group ride?'
    );

    if (!hostConfirm) return;

    try {
      if (session.isHost) {
        // Host flags active status = false in Supabase
        await supabase
          .from('rides')
          .update({ active: false })
          .eq('ride_id', rideId);
      }

      // Exit GPS loop
      setGpsRequested(false);

      // Save summary metrics (use actual duration, distance, and max speed)
      const calculatedDuration = Math.round((Date.now() - sessionStartTime) / 1000);
      const finalSummary = {
        title: rideData?.title || 'Live Ride',
        date: rideData?.rideDate || new Date().toISOString().split('T')[0],
        distance: Number(totalDistance.toFixed(2)),
        duration: calculatedDuration,
        topSpeed: maxSpeed,
        avgSpeed: calculatedDuration > 0 ? Math.round(totalDistance / (calculatedDuration / 3600)) : 0,
        ridersJoined: riders.length
      };

      // 1. Write completed ride to history sub-table in Supabase
      const { error: histErr } = await supabase
        .from('ride_history')
        .insert({
          rider_id: session.riderId,
          ride_id: rideId,
          title: finalSummary.title,
          date: finalSummary.date,
          distance: finalSummary.distance,
          duration: finalSummary.duration,
          avg_speed: finalSummary.avgSpeed,
          top_speed: finalSummary.topSpeed
        });

      if (histErr) {
        console.warn('Failed to insert Supabase ride history row:', histErr.message);
      }

      // 2. Query and increment cumulative rider profile stats in Supabase
      const { data: currentStats } = await supabase
        .from('riders')
        .select('total_rides, total_distance, top_speed, safe_hours')
        .eq('rider_id', session.riderId)
        .single();

      if (currentStats) {
        const updatedRides = (currentStats.total_rides || 0) + 1;
        const updatedDistance = Number(currentStats.total_distance || 0) + finalSummary.distance;
        const updatedTopSpeed = Math.max(currentStats.top_speed || 0, finalSummary.topSpeed);
        const updatedHours = (currentStats.safe_hours || 0) + Math.round(finalSummary.duration / 3600);

        await supabase
          .from('riders')
          .update({
            total_rides: updatedRides,
            total_distance: updatedDistance,
            top_speed: updatedTopSpeed,
            safe_hours: updatedHours
          })
          .eq('rider_id', session.riderId);
      }

      localStorage.setItem('rydr_last_ride_summary', JSON.stringify(finalSummary));
      onShowToast(session.isHost ? 'Ride completed successfully! 🏁' : 'You left the group.', 'success');
      
      setTimeout(() => {
        navigate('/post-ride');
      }, 800);

    } catch (err) {
      console.error(err);
      navigate('/dashboard');
    }
  };

  // Formatting utils
  const formatTime = (secs) => {
    if (secs === null || isNaN(secs) || secs < 0) return '--';
    const h = Math.floor(secs / 3600);
    const m = Math.ceil((secs % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m > 0 ? m : 1}m`;
  };

  const onlineRiders = riders.filter(r => r.online);

  return (
    <div className="page" style={{ height: '100dvh', background: '#09090b', display: 'flex', flexDirection: 'column' }}>
      
      {/* GPS Permission Request Overlay */}
      {!gpsRequested && gpsPermissionState !== 'granted' && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(9,9,11,0.95)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          boxSizing: 'border-box',
          textAlign: 'center'
        }}>
          <div className="logo-badge" style={{ width: '64px', height: '64px', borderRadius: '18px', marginBottom: '24px' }}>
            <Navigation2 size={32} style={{ color: 'white', transform: 'rotate(45deg)' }} />
          </div>
          <h2 style={{ fontFamily: 'Outfit', fontSize: '1.6rem', fontWeight: 800, color: '#fff', marginBottom: '10px' }}>
            Authorize GPS Location
          </h2>
          <p style={{ color: '#A1A1AA', fontSize: '0.88rem', lineHeight: '1.5', marginBottom: '28px', maxWidth: '300px' }}>
            Rydr coordinates your location in real-time to show you and your pack on the HUD map. Locations are private to this session.
          </p>
          <button className="btn btn-primary" onClick={handleEnableGPS} style={{ maxWidth: '240px' }}>
            📍 Authorize GPS
          </button>
        </div>
      )}

      {/* Floating HUD Top bar */}
      <div className="app-header" style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        background: 'linear-gradient(to bottom, rgba(9, 9, 11, 0.9) 30%, rgba(9, 9, 11, 0))',
        borderBottom: 'none',
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
        zIndex: 50
      }}>
        <button className="icon-btn" onClick={() => {
          if (window.confirm('Leave this live map and return to dashboard? Location syncing will continue.')) {
            navigate('/dashboard');
          }
        }}>
          <ArrowLeft size={18} />
        </button>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#fff', fontFamily: 'Outfit' }}>
            {rideData?.title || 'Live Ride'}
          </span>
          <span style={{ fontSize: '0.62rem', color: '#F97316', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.5px', marginTop: '1px' }}>
            ID: {rideId}
          </span>
        </div>

        <div style={{ position: 'relative' }}>
          <button className="icon-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            <MoreVertical size={18} />
          </button>

          {/* Settings Menu Dropdown */}
          {isMenuOpen && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 100 }} onClick={() => setIsMenuOpen(false)} />
              <div style={{
                position: 'absolute',
                top: '48px',
                right: 0,
                width: '180px',
                background: '#121214',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                padding: '6px',
                zIndex: 101,
                display: 'flex',
                flexDirection: 'column',
                gap: '2px'
              }}>
                <button 
                  onClick={() => { setIsMenuOpen(false); setShowDetailsOverlay(true); }}
                  style={{ background: 'none', border: 'none', padding: '10px 12px', color: '#fff', fontSize: '0.8rem', textAlign: 'left', cursor: 'pointer', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                >
                  <Compass size={14} /> Ride details
                </button>
                <button 
                  onClick={() => { setIsMenuOpen(false); setShowRidersOverlay(true); }}
                  style={{ background: 'none', border: 'none', padding: '10px 12px', color: '#fff', fontSize: '0.8rem', textAlign: 'left', cursor: 'pointer', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                >
                  <Award size={14} /> Pack List ({onlineRiders.length})
                </button>
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '4px 0' }} />
                <button 
                  onClick={handleEndRide}
                  style={{ background: 'none', border: 'none', padding: '10px 12px', color: '#EF4444', fontSize: '0.8rem', textAlign: 'left', cursor: 'pointer', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                >
                  <AlertOctagon size={14} /> {session.isHost ? 'End Ride Session' : 'Exit Group'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Live Map viewport */}
      <div className="map-viewport">
        <MapWidget 
          userCoords={coords}
          userColor={session.color}
          userName={session.name}
          userHeading={heading}
          riders={riders}
          destination={destination}
          userTrail={trail}
          mapStyle={mapStyle}
          allRoutes={routes}
          selectedRouteIndex={selectedRouteIndex}
          onSelectRoute={handleSelectRoute}
          isMapCentered={isCentered}
          setIsMapCentered={setIsCentered}
        />

        {/* Floating SOS Trigger Button */}
        <button 
          onClick={toggleSOS}
          style={{
            position: 'absolute',
            bottom: '220px',
            left: '16px',
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            background: riders.find(r => r.id === session.riderId)?.sos ? '#EF4444' : 'rgba(18,18,20,0.85)',
            border: riders.find(r => r.id === session.riderId)?.sos ? '2px solid #FFF' : '1px solid rgba(255,255,255,0.1)',
            boxShadow: riders.find(r => r.id === session.riderId)?.sos ? '0 0 15px #EF4444' : '0 4px 12px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            cursor: 'pointer',
            zIndex: 40,
            transition: 'all 0.2s'
          }}
          title="Toggle SOS Alert"
        >
          <ShieldAlert size={20} className={riders.find(r => r.id === session.riderId)?.sos ? 'pulse-sos' : ''} />
        </button>

        {/* Map style floating toggler */}
        <div style={{
          position: 'absolute',
          bottom: '220px',
          right: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          zIndex: 40
        }}>
          <button 
            className="icon-btn" 
            onClick={() => setMapStyle(mapStyle === 'dark' ? 'outdoor' : mapStyle === 'outdoor' ? 'satellite' : 'dark')}
            style={{ background: 'rgba(18, 18, 20, 0.85)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '50%', width: '44px', height: '44px' }}
          >
            <Layers size={16} />
          </button>
          <button 
            className="icon-btn" 
            onClick={() => setIsCentered(true)}
            style={{
              background: isCentered ? 'linear-gradient(135deg, #F97316, #FF5500)' : 'rgba(18, 18, 20, 0.85)',
              border: isCentered ? 'none' : '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '50%',
              width: '44px',
              height: '44px',
              color: 'white',
              boxShadow: isCentered ? '0 0 10px rgba(249, 115, 22, 0.4)' : 'none'
            }}
          >
            <Navigation2 size={16} style={{ transform: isCentered ? 'rotate(45deg)' : 'none' }} />
          </button>
        </div>

        {/* Lag Alert Banner */}
        {laggingRider && (
          <div style={{
            position: 'absolute',
            top: '84px',
            left: '16px',
            right: '16px',
            background: 'rgba(239, 68, 68, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '12px',
            padding: '12px 16px',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 20px rgba(239,68,68,0.4)',
            zIndex: 40,
            animation: 'slideDownFadeIn 0.3s'
          }}>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldAlert size={14} /> Rider Falling Behind
              </div>
              <div style={{ fontSize: '0.72rem', opacity: 0.9, marginTop: '2px' }}>
                {laggingRider.name} is {laggingRider.distance.toFixed(1)} km behind you.
              </div>
            </div>
            <button 
              onClick={() => onShowToast(`Zooming to ${laggingRider.name}`, 'success')}
              style={{ background: '#fff', border: 'none', color: '#EF4444', fontWeight: 700, fontSize: '0.68rem', padding: '4px 10px', borderRadius: '100px', cursor: 'pointer' }}
            >
              Locate
            </button>
          </div>
        )}
      </div>

      {/* HUD Speed and Stats slide drawer panel */}
      <div style={{
        background: '#121214',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        borderTopLeftRadius: '24px',
        borderTopRightRadius: '24px',
        padding: '16px 20px 24px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        zIndex: 50
      }}>
        <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', margin: '0 auto 4px' }} />

        {/* Stats metrics row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff', fontFamily: 'Outfit' }}>
              {speed}
            </div>
            <div style={{ fontSize: '0.62rem', color: '#71717A', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>km/h</div>
          </div>
          <div style={{ borderLeft: '1px solid rgba(255,255,255,0.05)', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff', fontFamily: 'Outfit' }}>
              {distanceRemaining !== null ? distanceRemaining.toFixed(1) : '0.0'}
            </div>
            <div style={{ fontSize: '0.62rem', color: '#71717A', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>km to dest</div>
          </div>
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff', fontFamily: 'Outfit' }}>
              {formatTime(etaSeconds)}
            </div>
            <div style={{ fontSize: '0.62rem', color: '#71717A', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>est remaining</div>
          </div>
        </div>

        {/* Destination row indicator */}
        {destination && (
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '12px',
            padding: '10px 14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <span style={{ fontSize: '1.1rem' }}>🏁</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {destination.name}
                </div>
                <div style={{ fontSize: '0.62rem', color: '#71717A' }}>
                  OSRM computed routing route
                </div>
              </div>
            </div>
            
            {routes.length > 1 && (
              <button 
                onClick={() => handleSelectRoute((selectedRouteIndex + 1) % routes.length)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#F97316',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Switch Alt Path
              </button>
            )}
          </div>
        )}

        {/* Mini Cohort status */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#fff' }}>Pack Members</span>
            <span style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: '100px', fontWeight: 700, color: '#A1A1AA' }}>
              {onlineRiders.length} Online
            </span>
          </div>
          <button 
            onClick={() => setShowRidersOverlay(true)} 
            style={{ background: 'none', border: 'none', color: '#F97316', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
          >
            Manage Pack List
          </button>
        </div>

        {/* Pack Quick view (First 2 riders) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {onlineRiders.slice(0, 2).map((r, idx) => (
            <div key={idx} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 12px',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: r.color }} />
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>{r.name}</div>
                  <div style={{ fontSize: '0.68rem', color: '#71717A' }}>{r.bike || 'No bike details'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {r.sos && <span style={{ fontSize: '0.62rem', background: '#EF4444', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>SOS</span>}
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#A1A1AA' }}>{r.speed} km/h</span>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* PACK LIST SHEET OVERLAY */}
      {showRidersOverlay && (
        <>
          <div className="sidebar-overlay" onClick={() => setShowRidersOverlay(false)} style={{ zIndex: 100 }} />
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
            zIndex: 101,
            padding: '24px 20px',
            boxSizing: 'border-box',
            maxHeight: '75vh',
            display: 'flex',
            flexDirection: 'column',
            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', margin: '0 auto 20px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', fontFamily: 'Outfit' }}>Rydr Cohort List</h3>
              <span style={{ fontSize: '0.78rem', color: '#A1A1AA' }}>{riders.length} Registered</span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingBottom: '20px' }}>
              {riders.map((r, idx) => (
                <div key={idx} style={{
                  padding: '12px 14px',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: '12px',
                  border: r.sos ? '1px solid #EF4444' : '1px solid rgba(255,255,255,0.04)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: r.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      color: 'white'
                    }}>
                      {r.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {r.name}
                        {r.isHost && <span style={{ fontSize: '0.58rem', background: '#F97316', color: '#fff', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>HOST</span>}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#71717A', marginTop: '1px' }}>
                        {r.bike || 'Bike Details not set'} · {r.online ? 'Online' : 'Offline'}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {r.bloodGroup && <span style={{ fontSize: '0.68rem', background: 'rgba(239,68,68,0.08)', padding: '2px 6px', borderRadius: '4px', color: '#EF4444', fontWeight: 600 }}>🩸 {r.bloodGroup}</span>}
                    {r.contact && (
                      <a href={`tel:${r.contact}`} className="icon-btn" style={{ width: '30px', height: '30px', borderRadius: '50%' }}>
                        <Phone size={12} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button className="btn btn-secondary" onClick={() => setShowRidersOverlay(false)} style={{ width: '100%' }}>
              Close Pack List
            </button>
          </div>
        </>
      )}

      {/* RIDE DETAILS OVERLAY */}
      {showDetailsOverlay && (
        <>
          <div className="sidebar-overlay" onClick={() => setShowDetailsOverlay(false)} style={{ zIndex: 100 }} />
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
            zIndex: 101,
            padding: '24px 20px',
            boxSizing: 'border-box',
            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', margin: '0 auto 20px' }} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', marginBottom: '16px', fontFamily: 'Outfit' }}>
              Ride Information
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px', fontSize: '0.8rem', color: '#A1A1AA' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '8px' }}>
                <span>Ride ID</span>
                <strong style={{ color: '#fff', fontFamily: 'monospace' }}>{rideId}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '8px' }}>
                <span>Host Name</span>
                <strong style={{ color: '#fff' }}>{rideData?.hostName || 'You'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '8px' }}>
                <span>Destination Coordinates</span>
                <strong style={{ color: '#fff' }}>{destination?.lat.toFixed(4)}, {destination?.lng.toFixed(4)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '8px' }}>
                <span>Date & Time</span>
                <strong style={{ color: '#fff' }}>{rideData?.rideDate} · {rideData?.rideTime}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '8px' }}>
                <span>Pace Target</span>
                <strong style={{ color: '#fff', textTransform: 'capitalize' }}>{rideData?.pace}</strong>
              </div>
              
              {rideData?.safetyNotes && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                  <span>Safety Notes & Guidelines</span>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', color: '#fff', fontStyle: 'italic', fontSize: '0.75rem', lineHeight: '1.4' }}>
                    "{rideData.safetyNotes}"
                  </div>
                </div>
              )}
            </div>

            <button className="btn btn-secondary" onClick={() => setShowDetailsOverlay(false)} style={{ width: '100%' }}>
              Close Information
            </button>
          </div>
        </>
      )}

    </div>
  );
}
