import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, MoreVertical, Compass, Navigation2, ShieldAlert, Award, Phone, Layers, ShieldCheck, Play, AlertOctagon, ArrowUp, ArrowUpRight, ArrowRight, ArrowUpLeft, RotateCcw, CheckCircle2, MapPin, LocateFixed, LogOut, Share2 } from 'lucide-react';
import Header from '../components/Header';
import MapWidget from '../components/MapWidget';
import { useGeolocation, calcDistance } from '../hooks/useGeolocation';
import { supabase, GOOGLE_MAPS_KEY, MAPTILER_KEY } from '../supabase';
import { cleanRideId } from './JoinRideScreen';

// Google Polyline Decoder
function decodePolyline(encoded) {
  let points = [];
  let index = 0, len = encoded.length;
  let lat = 0, lng = 0;
  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;
    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;
    points.push([lng / 1e5, lat / 1e5]);
  }
  return points;
}

// Calculate bearing between two coordinates
const calculateBearing = (lat1, lon1, lat2, lon2) => {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;

  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

  let bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
};

// Calculate distance from point P to segment AB
const getDistanceToSegment = (pLat, pLng, aLat, aLng, bLat, bLng) => {
  const latFactor = 111.32;
  const lngFactor = 111.32 * Math.cos((aLat * Math.PI) / 180);

  const px = pLng * lngFactor;
  const py = pLat * latFactor;
  const ax = aLng * lngFactor;
  const ay = aLat * latFactor;
  const bx = bLng * lngFactor;
  const by = bLat * latFactor;

  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return calcDistance(pLat, pLng, aLat, aLng);
  }

  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const closestLng = aLng + t * (bLng - aLng);
  const closestLat = aLat + t * (bLat - aLat);

  return calcDistance(pLat, pLng, closestLat, closestLng);
};

// Calculate minimum distance from a point to a polyline (array of [lng, lat])
const getDistanceToPolyline = (pLat, pLng, coordsList) => {
  if (!coordsList || coordsList.length === 0) return Infinity;
  if (coordsList.length === 1) {
    return calcDistance(pLat, pLng, coordsList[0][1], coordsList[0][0]);
  }

  let minDistance = Infinity;
  for (let i = 0; i < coordsList.length - 1; i++) {
    const a = coordsList[i];
    const b = coordsList[i + 1];
    const dist = getDistanceToSegment(pLat, pLng, a[1], a[0], b[1], b[0]);
    if (dist < minDistance) {
      minDistance = dist;
    }
  }
  return minDistance;
};

// Compute relative navigation arrow and instruction
const getNavigationInstruction = (userCoords, userHeading, routeCoordinates) => {
  if (!userCoords || !routeCoordinates || routeCoordinates.length < 2) {
    return { arrow: 'straight', text: 'Follow the route', angle: 0 };
  }

  const { lat, lng } = userCoords;

  // Find the index of the closest coordinate on the route
  let minDistance = Infinity;
  let closestIndex = 0;

  for (let i = 0; i < routeCoordinates.length; i++) {
    const rLng = routeCoordinates[i][0];
    const rLat = routeCoordinates[i][1];
    const dist = calcDistance(lat, lng, rLat, rLng);
    if (dist < minDistance) {
      minDistance = dist;
      closestIndex = i;
    }
  }

  // Look ahead by about 4 coordinates (approx 20-30 meters)
  const targetIndex = Math.min(closestIndex + 4, routeCoordinates.length - 1);

  // If near the end of the route
  if (closestIndex >= routeCoordinates.length - 2) {
    return { arrow: 'arrive', text: 'Arriving at destination', angle: 0 };
  }

  const targetLng = routeCoordinates[targetIndex][0];
  const targetLat = routeCoordinates[targetIndex][1];

  // Compute bearing to the target point
  const routeBearing = calculateBearing(lat, lng, targetLat, targetLng);

  // Compute relative angle to user's heading
  const heading = userHeading !== null && userHeading !== undefined ? userHeading : routeBearing;
  let relativeAngle = routeBearing - heading;

  // Normalize to -180 to 180
  relativeAngle = ((relativeAngle + 180) % 360) - 180;
  if (relativeAngle < -180) relativeAngle += 360;

  // Map to arrow directions
  let arrow = 'straight';
  let text = 'Go straight';

  if (relativeAngle >= -22.5 && relativeAngle < 22.5) {
    arrow = 'straight';
    text = 'Keep straight';
  } else if (relativeAngle >= 22.5 && relativeAngle < 67.5) {
    arrow = 'slight-right';
    text = 'Slight right turn';
  } else if (relativeAngle >= 67.5 && relativeAngle < 112.5) {
    arrow = 'right';
    text = 'Turn right';
  } else if (relativeAngle >= 112.5 && relativeAngle < 157.5) {
    arrow = 'sharp-right';
    text = 'Sharp right turn';
  } else if (relativeAngle >= -67.5 && relativeAngle < -22.5) {
    arrow = 'slight-left';
    text = 'Slight left turn';
  } else if (relativeAngle >= -112.5 && relativeAngle < -67.5) {
    arrow = 'left';
    text = 'Turn left';
  } else if (relativeAngle >= -157.5 && relativeAngle < -112.5) {
    arrow = 'sharp-left';
    text = 'Sharp left turn';
  } else {
    arrow = 'uturn';
    text = 'Make a U-turn';
  }

  return { arrow, text, angle: relativeAngle };
};

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
  const [showEndRideModal, setShowEndRideModal] = useState(false);
  const [mapStyle, setMapStyle] = useState('streets'); // Default to streets navigation style
  const [isCentered, setIsCentered] = useState(true);
  const [laggingRider, setLaggingRider] = useState(null); // Alert display packet
  const [dismissedRiders, setDismissedRiders] = useState({});
  const [isRideStarted, setIsRideStarted] = useState(false);
  const [isDrawerCollapsed, setIsDrawerCollapsed] = useState(false);
  const [navInstruction, setNavInstruction] = useState({ arrow: 'straight', text: 'Follow the route' });




  const handleStartRide = () => {
    setIsRideStarted(true);
    setIsCentered(true);
    setGpsRequested(true);
    onShowToast('Ride started! Navigation active. 🏍️', 'success');
  };

  const renderNavigationArrow = (arrow) => {
    switch (arrow) {
      case 'straight':
        return <ArrowUp size={24} />;
      case 'slight-right':
        return <ArrowUpRight size={24} />;
      case 'right':
        return <ArrowRight size={24} />;
      case 'sharp-right':
        return <ArrowUpRight size={24} style={{ transform: 'rotate(45deg)' }} />;
      case 'slight-left':
        return <ArrowUpLeft size={24} />;
      case 'left':
        return <ArrowLeft size={24} />;
      case 'sharp-left':
        return <ArrowUpLeft size={24} style={{ transform: 'rotate(-45deg)' }} />;
      case 'uturn':
        return <RotateCcw size={22} />;
      case 'arrive':
        return <CheckCircle2 size={24} style={{ color: '#10B981' }} />;
      default:
        return <ArrowUp size={24} />;
    }
  };

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
  const lastFetchedDestination = useRef({ lat: null, lng: null });

  // Load Session and verify ID
  useEffect(() => {
    const encoded = searchParams.get('s');
    const paramRideId = searchParams.get('rideId') ||
      searchParams.get('rideid') ||
      searchParams.get('ride') ||
      searchParams.get('r');
    const cleanParamRideId = paramRideId ? cleanRideId(paramRideId) : null;

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
          if (!cleanParamRideId || cleanRideId(parsed.rideId) === cleanParamRideId) {
            activeSession = parsed;
          }
        }
      } catch { }
    }

    const finalRideId = cleanRideId(activeSession?.rideId) || cleanParamRideId;

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
        .catch(() => { });
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
    if (isRideStarted && speed > maxSpeed) {
      setMaxSpeed(speed);
    }
  }, [speed, maxSpeed, isRideStarted]);

  // Update relative navigation instructions dynamically
  useEffect(() => {
    if (isRideStarted && coords && routes.length > 0) {
      const activeRoute = routes[selectedRouteIndex];
      if (activeRoute && activeRoute.geometry && activeRoute.geometry.coordinates) {
        const inst = getNavigationInstruction(
          coords,
          heading,
          activeRoute.geometry.coordinates
        );
        setNavInstruction(inst);
      }
    }
  }, [isRideStarted, coords, heading, routes, selectedRouteIndex]);

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

          // Check if this user is the DB-recorded host of this ride
          let currentProfile = null;
          try {
            const profileStr = localStorage.getItem('rydr_rider_profile');
            if (profileStr) currentProfile = JSON.parse(profileStr);
          } catch (e) {
            console.warn('Failed parsing local profile during auto-promote:', e);
          }

          if (currentProfile && currentProfile.riderId === data.host_id) {
            let isAlreadyHost = false;
            try {
              const localRider = localStorage.getItem('rydr_rider');
              if (localRider) {
                const parsed = JSON.parse(localRider);
                if (parsed && parsed.isHost && parsed.rideId === rideId) {
                  isAlreadyHost = true;
                }
              }
            } catch {}

            if (!isAlreadyHost) {
              const hostSession = {
                riderId: currentProfile.riderId,
                rideId: rideId,
                name: `${currentProfile.firstName} ${currentProfile.lastName}`,
                bike: currentProfile.bikeModel ? `${currentProfile.bikeBrand} ${currentProfile.bikeModel}` : 'Bike',
                color: '#F97316',
                isHost: true,
                rideTitle: data.title,
                email: currentProfile.email,
                contact: currentProfile.contact,
                bloodGroup: currentProfile.bloodGroup,
                destination: data.destination_lat ? {
                  name: data.destination_name,
                  lat: Number(data.destination_lat),
                  lng: Number(data.destination_lng)
                } : null
              };
              setSession(hostSession);
              try {
                localStorage.setItem('rydr_rider', JSON.stringify(hostSession));
              } catch (e) {
                console.warn('localStorage quota exceeded:', e);
              }
              sessionStorage.setItem('rydr_session', JSON.stringify(hostSession));
              onShowToast('Welcome back, Host! 🏁', 'success');
            }
          }

          if (data.destination_lat) {
            setDestination({
              name: data.destination_name || 'Destination',
              lat: Number(data.destination_lat),
              lng: Number(data.destination_lng)
            });
          }
          // Apply host's selected route index for joiners (host keeps their own via handleSelectRoute)
          if (!session?.isHost && typeof data.selected_route_index === 'number') {
            setSelectedRouteIndex(data.selected_route_index);
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
        // Sync host's route selection to all joiners in real-time
        if (!session?.isHost && typeof data.selected_route_index === 'number') {
          setSelectedRouteIndex(data.selected_route_index);
        }
        // Sync new destination to joiners in real-time
        if (!session?.isHost && data.destination_lat && data.destination_lng) {
          setDestination({
            name: data.destination_name || 'Custom Destination',
            lat: Number(data.destination_lat),
            lng: Number(data.destination_lng)
          });
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [rideId]);

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

  // Fetch Google Directions
  const fetchGoogleRoute = async (startLat, startLng, destLat, destLng) => {
    try {
      const url = 'https://routes.googleapis.com/directions/v2:computeRoutes';
      const body = {
        origin: { location: { latLng: { latitude: startLat, longitude: startLng } } },
        destination: { location: { latLng: { latitude: destLat, longitude: destLng } } },
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
        extraComputations: ['TRAFFIC_ON_POLYLINE'],
        computeAlternativeRoutes: true
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_MAPS_KEY,
          'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.travelAdvisory.speedReadingIntervals'
        },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (data.routes && data.routes.length) {
        const mappedRoutes = data.routes.map(r => ({
          distance: r.distanceMeters,
          duration: parseInt(r.duration.replace('s', ''), 10),
          geometry: {
            type: 'LineString',
            coordinates: decodePolyline(r.polyline.encodedPolyline)
          },
          speedIntervals: r.travelAdvisory?.speedReadingIntervals || []
        }));

        setRoutes(mappedRoutes);
        // Always default to route 0 (fastest) on initial fetch
        setSelectedRouteIndex(0);
        const bestRoute = mappedRoutes[0];
        baseOSRMDistance.current = bestRoute.distance;
        baseOSRMDuration.current = bestRoute.duration;
        lastRouteUpdateCoords.current = { lat: startLat, lng: startLng };
        lastFetchedDestination.current = { lat: destLat, lng: destLng };
      }
    } catch (err) {
      console.warn('Google routing fetch failed:', err);
    }
  };

  // Route updates on movement or destination change
  useEffect(() => {
    if (destination) {
      // Determine the start point for routing: host's GPS
      let routeStartCoords = null;
      if (session?.isHost) {
        routeStartCoords = coords;
      } else {
        const hostRider = riders.find(r => r.isHost);
        if (hostRider && hostRider.lat && hostRider.lng) {
          routeStartCoords = { lat: hostRider.lat, lng: hostRider.lng };
        }
      }

      if (routeStartCoords) {
        const last = lastRouteUpdateCoords.current;
        const lastDest = lastFetchedDestination.current;

        const destMoved = !lastDest.lat || Math.abs(lastDest.lat - destination.lat) > 0.0001 || Math.abs(lastDest.lng - destination.lng) > 0.0001;
        let shouldReroute = destMoved || !last.lat || calcDistance(last.lat, last.lng, routeStartCoords.lat, routeStartCoords.lng) >= 0.3;

        if (!shouldReroute && routes.length > 0) {
          const activeRoute = routes[selectedRouteIndex] || routes[0];
          if (activeRoute && activeRoute.geometry && activeRoute.geometry.coordinates) {
            const distanceToRoute = getDistanceToPolyline(
              routeStartCoords.lat,
              routeStartCoords.lng,
              activeRoute.geometry.coordinates
            );
            if (distanceToRoute > 0.06) {
              shouldReroute = true;
            }
          }
        }

        if (shouldReroute) {
          fetchGoogleRoute(routeStartCoords.lat, routeStartCoords.lng, destination.lat, destination.lng);
        }
      }
    }
  }, [coords, destination, routes, selectedRouteIndex, riders, session]);

  const handleUpdateDestination = async (lat, lng) => {
    let placeName = 'Custom Destination';
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        placeName = data.results[0].formatted_address || 'Custom Destination';
      }
    } catch (e) {
      console.warn('Reverse geocoding failed:', e);
    }

    const newDest = {
      name: placeName,
      lat: Number(lat),
      lng: Number(lng)
    };
    setDestination(newDest);

    // Update local session caches to match the new destination
    if (session) {
      const updatedSession = {
        ...session,
        destination: newDest
      };
      setSession(updatedSession);
      try {
        localStorage.setItem('rydr_rider', JSON.stringify(updatedSession));
      } catch (e) {
        console.warn('localStorage quota exceeded:', e);
      }
      sessionStorage.setItem('rydr_session', JSON.stringify(updatedSession));
    }

    // Force Google route fetch immediately
    if (coords) {
      fetchGoogleRoute(coords.lat, coords.lng, lat, lng);
    }

    // If user is the host, sync to Supabase
    if (session?.isHost && rideId) {
      try {
        await supabase
          .from('rides')
          .update({
            destination_name: placeName,
            destination_lat: lat,
            destination_lng: lng
          })
          .eq('ride_id', rideId);
      } catch (e) {
        console.error('Failed to sync new destination to database:', e);
      }
    }
  };

  // HUD Math updates — strictly uses Google Maps route distance/time
  useEffect(() => {
    if (routes.length > 0) {
      const activeRoute = routes[selectedRouteIndex] || routes[0];
      const routeDistanceKm = activeRoute.distance / 1000;
      const routeDurationSec = activeRoute.duration;
      
      // We rely completely on the route data fetched from Google.
      // (The route re-fetches periodically as you move).
      setDistanceRemaining(routeDistanceKm);
      setEtaSeconds(Math.round(routeDurationSec));
    } else {
      // Default to total distance covered before route is generated
      setDistanceRemaining(totalDistance);
    }
  }, [routes, selectedRouteIndex, totalDistance]);

  // Pacing alerts (Check if any online rider falls behind by > 10km)
  useEffect(() => {
    if (!coords) return;
    const lagging = riders.find(r => {
      if (r.id === session?.riderId || !r.online || !r.lat) return false;
      const d = calcDistance(coords.lat, coords.lng, r.lat, r.lng);
      // Alert threshold: 10 Km + away from user
      if (d <= 10.0) return false;
      // Do not alert if already dismissed for this rider
      if (dismissedRiders[r.id]) return false;
      return true;
    });

    if (lagging) {
      const d = calcDistance(coords.lat, coords.lng, lagging.lat, lagging.lng);
      setLaggingRider({
        id: lagging.id,
        name: lagging.name,
        distance: d,
        status: d > 15 ? 'Critical Separation' : 'Far Behind'
      });
    } else {
      setLaggingRider(null);
    }
  }, [riders, coords, session, dismissedRiders]);

  // Clean up dismissed riders if they catch up (distance < 10km) or go offline
  useEffect(() => {
    if (!coords) return;
    let changed = false;
    const nextDismissed = { ...dismissedRiders };

    Object.keys(nextDismissed).forEach(riderId => {
      const r = riders.find(item => item.id === riderId);
      if (!r || !r.online || !r.lat) {
        delete nextDismissed[riderId];
        changed = true;
      } else {
        const d = calcDistance(coords.lat, coords.lng, r.lat, r.lng);
        if (d < 10.0) {
          delete nextDismissed[riderId];
          changed = true;
        }
      }
    });

    if (changed) {
      setDismissedRiders(nextDismissed);
    }
  }, [riders, coords]);

  if (!session || !rideId) return null;

  const handleEnableGPS = () => {
    setGpsRequested(true);
  };

  const handleSelectRoute = async (idx) => {
    setSelectedRouteIndex(idx);
    const activeRoute = routes[idx];
    if (activeRoute) {
      baseOSRMDistance.current = activeRoute.distance;
      baseOSRMDuration.current = activeRoute.duration;
      onShowToast(`Route ${idx + 1} chosen${idx === 0 ? ' (Fastest)' : ''}`, 'success');
    }
    // Host saves selected route index to Supabase so all joiners see the same route
    if (session?.isHost && rideId) {
      try {
        await supabase
          .from('rides')
          .update({ selected_route_index: idx })
          .eq('ride_id', rideId);
      } catch (e) {
        console.warn('Failed to save selected route index:', e);
      }
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

  const handleExitGroup = () => {
    setIsMenuOpen(false);
    if (session?.isHost) {
      navigate('/dashboard');
    } else {
      setShowEndRideModal(true);
    }
  };

  const handleEndRide = () => {
    setIsMenuOpen(false);
    setShowEndRideModal(true);
  };

  const confirmEndRide = async () => {
    setShowEndRideModal(false);

    if (!session) {
      onShowToast('Session missing. Cannot end ride.', 'error');
      return;
    }

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

      // Clean up active session from storage
      localStorage.removeItem('rydr_rider');
      sessionStorage.removeItem('rydr_session');

      try {
        localStorage.setItem('rydr_last_ride_summary', JSON.stringify(finalSummary));
      } catch (e) {
        console.warn('localStorage quota exceeded:', e);
      }
      onShowToast(session.isHost ? 'Ride completed successfully! 🏁' : 'You left the group.', 'success');

      setTimeout(() => {
        navigate('/post-ride');
      }, 800);

    } catch (err) {
      console.error('confirmEndRide catch error:', err);
      onShowToast(`Failed to end ride: ${err.message || err}`, 'error');
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
            RydrPack coordinates your location in real-time to show you and your pack on the HUD map. Locations are private to this session.
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
        <button className="icon-btn" onClick={() => navigate('/dashboard')}>
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
                <button
                  onClick={() => { setIsMenuOpen(false); navigate(`/ride-created?rideId=${rideId}`); }}
                  style={{ background: 'none', border: 'none', padding: '10px 12px', color: '#fff', fontSize: '0.8rem', textAlign: 'left', cursor: 'pointer', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                >
                  <Share2 size={14} /> Share ride details
                </button>
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '4px 0' }} />
                {!session.isHost && (
                  <button
                    onClick={handleExitGroup}
                    style={{ background: 'none', border: 'none', padding: '10px 12px', color: '#fff', fontSize: '0.8rem', textAlign: 'left', cursor: 'pointer', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                  >
                    <LogOut size={14} /> Exit Group
                  </button>
                )}
                {session.isHost && (
                  <button
                    onClick={handleEndRide}
                    style={{ background: 'none', border: 'none', padding: '10px 12px', color: '#EF4444', fontSize: '0.8rem', textAlign: 'left', cursor: 'pointer', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                  >
                    <AlertOctagon size={14} /> End Ride Session
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Live Map viewport */}
      <div className="map-viewport">
        {!isCentered && (<button onClick={() => setIsCentered(true)} style={{ position: 'absolute', top: '100px', right: '16px', zIndex: 1000, background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255, 255, 255, 0.2)', color: '#3B82F6', padding: '10px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}><LocateFixed size={22} /></button>)}
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
          onUpdateDestination={handleUpdateDestination}
          isMapCentered={isCentered}
          setIsMapCentered={setIsCentered}
          isRideStarted={isRideStarted}
          currentRiderId={session?.riderId}
          isHost={session?.isHost}
        />



        {/* Floating SOS Trigger Button */}
        <button
          onClick={toggleSOS}
          style={{
            position: 'absolute',
            bottom: '20px',
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
          bottom: '120px',
          right: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          zIndex: 40
        }}>
          <button
            className="icon-btn"
            onClick={() => setMapStyle(mapStyle === 'dark' ? 'streets' : 'dark')}
            style={{
              background: 'rgba(18, 18, 20, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '50%',
              width: '44px',
              height: '44px',
              color: '#fff'
            }}
            title="Toggle Map Style"
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={() => onShowToast(`Zooming to ${laggingRider.name}`, 'success')}
                style={{ background: '#fff', border: 'none', color: '#EF4444', fontWeight: 700, fontSize: '0.68rem', padding: '4px 10px', borderRadius: '100px', cursor: 'pointer' }}
              >
                Locate
              </button>
              <button
                onClick={() => {
                  setDismissedRiders(prev => ({ ...prev, [laggingRider.id]: true }));
                  setLaggingRider(null);
                }}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '0.7rem',
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0
                }}
                title="Dismiss alert"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>

      {/* HUD Speed and Stats slide drawer panel */}
      <div style={{
        background: '#121214',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        borderTopLeftRadius: '24px',
        borderTopRightRadius: '24px',
        padding: isDrawerCollapsed ? '8px 20px 10px' : '16px 20px 24px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: isDrawerCollapsed ? '6px' : '16px',
        zIndex: 50
      }}>
        {/* Clickable collapse/expand handle */}
        <div
          onClick={() => setIsDrawerCollapsed(c => !c)}
          style={{
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'center',
            paddingBottom: isDrawerCollapsed ? '0px' : '4px',
            userSelect: 'none'
          }}
        >
          <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.18)', borderRadius: '2px' }} />
        </div>

        {/* Stats metrics row — always visible */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#fff', fontFamily: 'Outfit' }}>
              {speed}
            </div>
            <div style={{ fontSize: '0.58rem', color: '#71717A', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>km/h</div>
          </div>
          <div style={{ borderLeft: '1px solid rgba(255,255,255,0.05)', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#fff', fontFamily: 'Outfit' }}>
              {distanceRemaining !== null ? distanceRemaining.toFixed(1) : '0.0'}
            </div>
            <div style={{ fontSize: '0.58rem', color: '#71717A', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>km to dest</div>
          </div>
          <div>
            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#fff', fontFamily: 'Outfit' }}>
              {formatTime(etaSeconds)}
            </div>
            <div style={{ fontSize: '0.58rem', color: '#71717A', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>est remaining</div>
          </div>
        </div>



        {!isDrawerCollapsed && (
          <>
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
                  <MapPin size={18} style={{ color: '#F97316', flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {destination.name}
                    </div>
                    <div style={{ fontSize: '0.62rem', color: '#71717A' }}>
                      OSRM computed routing route
                    </div>
                  </div>
                </div>

                {session?.isHost && routes.length > 1 && (
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
                    switch path
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

          </>
        )}

        {/* Start ride button — always at the bottom of the container */}
        {!isRideStarted && (
          <button
            onClick={handleStartRide}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #F97316, #FF5500)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: isDrawerCollapsed ? '10px 24px' : '12px 24px',
              fontSize: '0.85rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(249, 115, 22, 0.4)',
              cursor: 'pointer',
              marginTop: isDrawerCollapsed ? '4px' : '8px'
            }}
          >
            <Play size={16} style={{ fill: 'white' }} />
            Start ride
          </button>
        )}

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
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', fontFamily: 'Outfit' }}>RydrPack Cohort List</h3>
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
                    {/* Distance Difference from current user */}
                    {(() => {
                      if (r.id === session?.riderId) {
                        return <span style={{ fontSize: '0.68rem', color: '#71717A', fontWeight: 600, paddingRight: '4px' }}>You</span>;
                      }
                      if (!r.online || !r.lat || !coords) {
                        return <span style={{ fontSize: '0.68rem', color: '#3F3F46', paddingRight: '4px' }}>—</span>;
                      }
                      const diff = calcDistance(coords.lat, coords.lng, r.lat, r.lng);
                      const isFar = diff >= 10.0;
                      return (
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          color: isFar ? '#EF4444' : '#10B981',
                          background: isFar ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.05)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          border: isFar ? '1px solid rgba(239,68,68,0.15)' : '1px solid rgba(16,185,129,0.1)'
                        }}>
                          {diff.toFixed(1)} km
                        </span>
                      );
                    })()}
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

      {/* END RIDE CONFIRMATION MODAL */}
      {showEndRideModal && (
        <>
          <div
            className="sidebar-overlay"
            onClick={() => setShowEndRideModal(false)}
            style={{ zIndex: 1050 }}
          />
          <div style={{
            position: 'fixed',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '100%',
            maxWidth: '430px',
            background: '#111113',
            borderTopLeftRadius: '24px',
            borderTopRightRadius: '24px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            zIndex: 1051,
            padding: '28px 24px 36px',
            boxSizing: 'border-box',
            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          }}>
            <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', margin: '0 auto 24px' }} />

            <div style={{
              width: '52px', height: '52px', borderRadius: '50%',
              background: 'rgba(239,68,68,0.10)',
              border: '1.5px solid rgba(239,68,68,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <AlertOctagon size={24} style={{ color: '#EF4444' }} />
            </div>

            <h3 style={{
              fontFamily: 'Outfit', fontSize: '1.2rem', fontWeight: 800,
              color: '#fff', textAlign: 'center', marginBottom: '8px',
            }}>
              {session.isHost ? 'End Ride for Everyone?' : 'Leave Group Ride?'}
            </h3>

            <p style={{
              color: '#71717A', fontSize: '0.8rem', textAlign: 'center',
              lineHeight: '1.5', marginBottom: '24px',
            }}>
              {session.isHost
                ? 'This will end the session for all riders. Your ride stats will be saved to your profile.'
                : 'You will be disconnected from the group map. The ride will continue without you.'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={confirmEndRide}
                className="btn btn-danger"
                style={{ borderRadius: '12px' }}
              >
                <AlertOctagon size={16} />
                {session.isHost ? 'Yes, End Ride Session' : 'Yes, Leave Group'}
              </button>
              <button
                onClick={() => setShowEndRideModal(false)}
                className="btn btn-secondary"
                style={{ borderRadius: '12px' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}



    </div>
  );
}
