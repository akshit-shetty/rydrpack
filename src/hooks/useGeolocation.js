import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';

// Haversine formula
export function calcDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function useGeolocation({ rideId, session, enabled }) {
  const [coords, setCoords] = useState(null);
  const [speed, setSpeed] = useState(0);
  const [heading, setHeading] = useState(0);
  const [totalDistance, setTotalDistance] = useState(0);
  const [trail, setTrail] = useState([]);
  const [error, setError] = useState(null);

  const stateRef = useRef({
    lastLat: null,
    lastLng: null,
    lastGPSTime: null,
    lastFbUpdate: 0,
    trailCoords: [],
    distanceSum: 0,
  });

  useEffect(() => {
    if (!enabled || !rideId || !session) return;

    const UPDATE_INTERVAL = 3000; // 3 seconds
    let watchId = null;

    const syncRiderPosition = async (lat, lng, speedKmh, headVal) => {
      try {
        // Upsert position into public.live_riders table in Supabase
        const { error } = await supabase
          .from('live_riders')
          .upsert({
            ride_id: rideId,
            rider_id: session.riderId,
            name: session.name,
            bike: session.bike || null,
            color: session.color,
            lat,
            lng,
            speed: speedKmh,
            heading: headVal || 0,
            online: true,
            is_host: session.isHost || false,
            last_seen: new Date().toISOString()
          }, {
            onConflict: 'ride_id,rider_id'
          });

        if (error) {
          console.warn('Supabase GPS sync error:', error.message);
        }
      } catch (err) {
        console.error('Failed to sync position with Supabase:', err);
      }
    };

    const handleGPS = async (position) => {
      const now = Date.now();
      const { latitude: lat, longitude: lng, speed: gpsSpeed, heading: gpsHeading } = position.coords;
      const state = stateRef.current;

      // Speed calculation
      let speedKmh = 0;
      if (gpsSpeed !== null && gpsSpeed > 0) {
        speedKmh = Math.round(gpsSpeed * 3.6);
      } else if (state.lastLat !== null && state.lastGPSTime !== null) {
        const d = calcDistance(state.lastLat, state.lastLng, lat, lng);
        const hrs = (now - state.lastGPSTime) / 3600000;
        if (hrs > 0 && d > 0.01 && d / hrs < 200) {
          speedKmh = Math.round(d / hrs);
        }
      }

      // Filter jitter
      if (speedKmh < 3) speedKmh = 0;

      // Accumulate distance
      if (state.lastLat !== null && speedKmh > 0) {
        const d = calcDistance(state.lastLat, state.lastLng, lat, lng);
        if (d > 0.02) { // 20m threshold
          state.distanceSum += d;
          state.trailCoords = [...state.trailCoords, [lng, lat]];
          setTotalDistance(state.distanceSum);
          setTrail(state.trailCoords);
        }
      }

      state.lastLat = lat;
      state.lastLng = lng;
      state.lastGPSTime = now;

      setCoords({ lat, lng });
      setSpeed(speedKmh);
      setHeading(gpsHeading || 0);

      // Periodically sync coordinates to Supabase
      if (now - state.lastFbUpdate >= UPDATE_INTERVAL) {
        state.lastFbUpdate = now;
        await syncRiderPosition(lat, lng, speedKmh, gpsHeading);
      }
    };

    const handleGPSError = (err) => {
      console.warn('GPS watch error:', err.message);
      setError(err);
    };

    watchId = navigator.geolocation.watchPosition(handleGPS, handleGPSError, {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 2000,
    });

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
      
      // Mark offline on cleanup
      const goOffline = async () => {
        try {
          await supabase
            .from('live_riders')
            .update({ online: false, last_seen: new Date().toISOString() })
            .match({ ride_id: rideId, rider_id: session.riderId });
        } catch (e) {
          console.warn('Failed to set online=false on exit:', e);
        }
      };
      goOffline();
    };
  }, [rideId, session, enabled]);

  return { coords, speed, heading, totalDistance, trail, error };
}
