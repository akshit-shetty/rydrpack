import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { MAP_STYLES } from '../supabase';

// Helper to project point P onto line segment AB, returning the closest point strictly on the road segment
const projectPointOnSegment = (p, a, b) => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return a;
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lenSq));
  return [a[0] + t * dx, a[1] + t * dy];
};

// Helper to find the closest coordinate index in a polyline to the user's position
const findClosestPointIndex = (coordinates, user) => {
  if (!user || !coordinates || coordinates.length === 0) return 0;
  let minDistance = Infinity;
  let closestIdx = 0;
  for (let i = 0; i < coordinates.length; i++) {
    const pt = coordinates[i];
    const dx = pt[0] - user.lng;
    const dy = pt[1] - user.lat;
    const dist = dx * dx + dy * dy;
    if (dist < minDistance) {
      minDistance = dist;
      closestIdx = i;
    }
  }
  return closestIdx;
};

// Returns a road-accurate route slice that stays strictly on the road (never pulling off-road or across lanes)
const getCleanRemainingCoords = (coordinates, user, isRideStarted) => {
  if (!coordinates || coordinates.length === 0) return [];
  if (!isRideStarted || !user) return coordinates;

  const closestIdx = findClosestPointIndex(coordinates, user);
  if (closestIdx >= coordinates.length - 1) {
    return coordinates.slice(Math.max(0, coordinates.length - 2));
  }

  // Snapped start point strictly on the road segment
  const pA = coordinates[closestIdx];
  const pB = coordinates[closestIdx + 1];
  const snapped = projectPointOnSegment([user.lng, user.lat], pA, pB);

  return [snapped, ...coordinates.slice(closestIdx + 1)];
};

export default function MapWidget({
  userCoords,
  userColor,
  userName,
  userHeading,
  riders = [],
  destination,
  userTrail = [],
  mapStyle = 'streets',
  allRoutes = [],
  selectedRouteIndex = 0,
  onSelectRoute,
  onUpdateDestination,
  isMapCentered,
  setIsMapCentered,
  isRideStarted = false,
  currentRiderId = null,
  isHost = false
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({}); // riderId -> Marker instance
  const destMarkerRef = useRef(null);
  const styleUrl = MAP_STYLES[mapStyle] || MAP_STYLES.streets;

  // ─── Mutable refs for draw functions ────────────────────────────────────────
  // This is the key fix: map.on('load') / map.on('styledata') are set up ONCE
  // in the init useEffect. Those closures would permanently capture the empty
  // allRoutes/selectedRouteIndex from the first render. By calling through
  // these refs, the event listeners always invoke the LATEST version of the
  // draw functions with the LATEST props.
  const drawRouteLayersRef = useRef(null);
  const drawTrailLayersRef = useRef(null);
  const onSelectRouteRef = useRef(onSelectRoute);
  onSelectRouteRef.current = onSelectRoute;

  // Draw Trails
  const drawTrailLayers = (map) => {
    if (!map || !map.isStyleLoaded()) return;

    if (userTrail.length >= 2) {
      const srcId = 'user-trail';
      const lyrId = 'user-trail-layer';
      const geojson = { type: 'Feature', geometry: { type: 'LineString', coordinates: userTrail }, properties: {} };

      if (map.getSource(srcId)) {
        map.getSource(srcId).setData(geojson);
      } else {
        map.addSource(srcId, { type: 'geojson', data: geojson });
        map.addLayer({
          id: lyrId,
          type: 'line',
          source: srcId,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': userColor || '#3B82F6',
            'line-width': 3
          }
        });
      }
    }
  };

  // Draw Routes
  const drawRouteLayers = (map) => {
    if (!map || !map.isStyleLoaded()) return;

    if (!allRoutes || !allRoutes.length) {
      // Hide all route layers
      for (let idx = 0; idx < 10; idx++) {
        const casingLyr = `rydr-route-casing-${idx}`;
        const lineLyr   = `rydr-route-line-${idx}`;
        const clickLyr  = `rydr-route-click-${idx}`;
        if (map.getLayer(casingLyr)) map.setLayoutProperty(casingLyr, 'visibility', 'none');
        if (map.getLayer(lineLyr))   map.setLayoutProperty(lineLyr, 'visibility', 'none');
        if (map.getLayer(clickLyr))  map.setLayoutProperty(clickLyr, 'visibility', 'none');
      }
      return;
    }

    const renderOrder = [];
    for (let i = 0; i < Math.min(allRoutes.length, 10); i++) {
      if (i !== selectedRouteIndex) renderOrder.push(i);
    }
    renderOrder.push(selectedRouteIndex);

    for (const idx of renderOrder) {
      const srcId = `rydr-route-src-${idx}`;
      const casingLyr = `rydr-route-casing-${idx}`;
      const lineLyr = `rydr-route-line-${idx}`;
      const clickLyr = `rydr-route-click-${idx}`;
      const route = allRoutes[idx];
      
      const isRideActive = isRideStarted && !!userCoords;
      const closestIdx = isRideActive ? findClosestPointIndex(route.geometry.coordinates, userCoords) : 0;
      
      let geojson;
      if (route.speedIntervals && route.speedIntervals.length > 0) {
        const features = [];
        route.speedIntervals.forEach(interval => {
          const segmentCoords = route.geometry.coordinates.slice(interval.startPolylinePointIndex, interval.endPolylinePointIndex + 1);
          if (segmentCoords.length >= 2) {
            features.push({
              type: 'Feature',
              geometry: { type: 'LineString', coordinates: segmentCoords },
              properties: { speed: interval.speed || 'NORMAL' }
            });
          }
        });
        geojson = features.length > 0 
          ? { type: 'FeatureCollection', features } 
          : { type: 'Feature', geometry: route.geometry, properties: { speed: 'NORMAL' } };
      } else {
        geojson = { type: 'Feature', geometry: route.geometry, properties: { speed: 'NORMAL' } };
      }

      const isSelected = idx === selectedRouteIndex;

      if (map.getSource(srcId)) {
        map.getSource(srcId).setData(geojson);
      } else {
        map.addSource(srcId, { type: 'geojson', data: geojson, lineMetrics: true });
      }

      // White outline casing for contrast
      if (map.getLayer(casingLyr)) {
        map.setLayoutProperty(casingLyr, 'visibility', 'visible');
        map.setPaintProperty(casingLyr, 'line-width', isSelected ? 11 : 7.5);
        map.setPaintProperty(casingLyr, 'line-opacity', isSelected ? 0.35 : 0.2);
      } else {
        map.addLayer({
          id: casingLyr,
          type: 'line',
          source: srcId,
          layout: { 'line-cap': 'round', 'line-join': 'round', 'visibility': 'visible' },
          paint: {
            'line-color': '#FFFFFF',
            'line-width': isSelected ? 11 : 7.5,
            'line-opacity': isSelected ? 0.35 : 0.2
          }
        });
      }

      // Route lines with traffic coloring
      if (map.getLayer(lineLyr)) {
        map.setLayoutProperty(lineLyr, 'visibility', 'visible');
        map.setPaintProperty(lineLyr, 'line-color', isSelected ? [
          'match',
          ['get', 'speed'],
          'SLOW', '#F59E0B',
          'TRAFFIC_JAM', '#EF4444',
          '#3B82F6' // default NORMAL
        ] : '#71717A');
        map.setPaintProperty(lineLyr, 'line-width', isSelected ? 7 : 4.5);
        map.setPaintProperty(lineLyr, 'line-opacity', isSelected ? 0.9 : 0.7);
      } else {
        map.addLayer({
          id: lineLyr,
          type: 'line',
          source: srcId,
          layout: { 'line-cap': 'round', 'line-join': 'round', 'visibility': 'visible' },
          paint: {
            'line-color': isSelected ? [
              'match',
              ['get', 'speed'],
              'SLOW', '#F59E0B',
              'TRAFFIC_JAM', '#EF4444',
              '#3B82F6' // default NORMAL
            ] : '#71717A',
            'line-width': isSelected ? 7 : 4.5,
            'line-opacity': isSelected ? 0.9 : 0.7
          }
        });
      }

      // Click areas for selecting routes
      if (map.getLayer(clickLyr)) {
        map.setLayoutProperty(clickLyr, 'visibility', 'visible');
      } else {
        map.addLayer({
          id: clickLyr,
          type: 'line',
          source: srcId,
          layout: { 'line-cap': 'round', 'line-join': 'round', 'visibility': 'visible' },
          paint: { 'line-color': 'rgba(0,0,0,0)', 'line-width': 18 }
        });

        map.on('click', clickLyr, () => {
          if (onSelectRouteRef.current) onSelectRouteRef.current(idx);
        });
        map.on('mouseenter', clickLyr, () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', clickLyr, () => {
          map.getCanvas().style.cursor = '';
        });
      }
    }

    // Bring selected to top
    const selCasing = `rydr-route-casing-${selectedRouteIndex}`;
    const selLine = `rydr-route-line-${selectedRouteIndex}`;
    const selClick = `rydr-route-click-${selectedRouteIndex}`;
    if (map.getLayer(selCasing)) map.moveLayer(selCasing);
    if (map.getLayer(selLine)) map.moveLayer(selLine);
    if (map.getLayer(selClick)) map.moveLayer(selClick);

    // Hide extra layers
    for (let idx = allRoutes.length; idx < 10; idx++) {
      const casingLyr = `rydr-route-casing-${idx}`;
      const lineLyr = `rydr-route-line-${idx}`;
      const clickLyr = `rydr-route-click-${idx}`;
      if (map.getLayer(casingLyr)) map.setLayoutProperty(casingLyr, 'visibility', 'none');
      if (map.getLayer(lineLyr)) map.setLayoutProperty(lineLyr, 'visibility', 'none');
      if (map.getLayer(clickLyr)) map.setLayoutProperty(clickLyr, 'visibility', 'none');
    }
  };

  // Update refs on EVERY render so event listeners always get fresh closures
  drawRouteLayersRef.current = drawRouteLayers;
  drawTrailLayersRef.current = drawTrailLayers;

  // Init Map — runs ONCE. Uses refs for callbacks so they always see latest data.
  useEffect(() => {
    const initLat = userCoords?.lat || 19.0760;
    const initLng = userCoords?.lng || 72.8777;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: styleUrl,
      center: [initLng, initLat],
      zoom: 14,
      pitch: 40,
      bearing: userHeading || 0,
      antialias: true,
      attributionControl: false
    });

    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');

    map.on('dragstart', () => {
      if (setIsMapCentered) setIsMapCentered(false);
    });

    // Use refs here so when these events fire they call the LATEST draw
    // functions with the LATEST allRoutes/selectedRouteIndex — not stale closures.
    map.on('load', () => {
      drawTrailLayersRef.current(map);
      drawRouteLayersRef.current(map);
    });

    map.on('styledata', () => {
      drawTrailLayersRef.current(map);
      drawRouteLayersRef.current(map);
    });

    map.on('idle', () => {
      drawTrailLayersRef.current(map);
      drawRouteLayersRef.current(map);
    });

    return () => {
      Object.values(markersRef.current).forEach(m => m.remove());
      markersRef.current = {};
      if (destMarkerRef.current) {
        destMarkerRef.current.remove();
        destMarkerRef.current = null;
      }
      map.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update style
  useEffect(() => {
    const map = mapRef.current;
    if (map) {
      map.setStyle(styleUrl);
    }
  }, [styleUrl]);

  // Center / Follow camera
  useEffect(() => {
    const map = mapRef.current;
    if (map && userCoords && isMapCentered) {
      map.easeTo({
        center: [userCoords.lng, userCoords.lat],
        bearing: userHeading || 0,
        zoom: isRideStarted ? 16.8 : 14.5,
        pitch: isRideStarted ? 52 : 40,
        duration: 800
      });
    }
  }, [userCoords, userHeading, isMapCentered, isRideStarted]);

  // Update User & Riders Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const getInitials = (name) => {
      if (!name) return 'U';
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      return name.slice(0, 2).toUpperCase();
    };

    const createMarkerEl = (name, color, isMe, initialHeading) => {
      if (isMe) {
        if (isRideStarted) {
          // ── Active ride: highlighted glowing motorcycle with forward beam and direction ──
          const size = 72;
          const wrap = document.createElement('div');
          wrap.className = 'gmaps-nav-chevron';
          wrap.style.cssText = `
            position:relative; width:${size}px; height:${size}px; cursor:pointer;
            display:flex; align-items:center; justify-content:center;
          `;
          const heading = initialHeading || 0;

          // Outer pulsing glow beacon
          const pulse = document.createElement('div');
          pulse.style.cssText = `
            position:absolute; width:68px; height:68px; border-radius:50%;
            border:2.5px solid rgba(249,115,22,0.65);
            background:radial-gradient(circle, rgba(249,115,22,0.25) 0%, rgba(249,115,22,0) 70%);
            animation:pulse-ring 2s infinite; z-index:1; pointer-events:none;
          `;
          wrap.appendChild(pulse);

          // Rotating vehicle and beam container
          const rotator = document.createElement('div');
          rotator.className = 'rydr-bike-rotator';
          rotator.style.cssText = `
            position:relative; width:56px; height:56px; display:flex; align-items:center; justify-content:center;
            transform:rotate(${heading}deg); transform-origin:50% 50%;
            transition:transform 0.2s cubic-bezier(0.2, 0, 0, 1); z-index:2; pointer-events:none;
          `;
          rotator.innerHTML = `
            <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
              <defs>
                <radialGradient id="bikeHeadlight" cx="50%" cy="100%" r="100%">
                  <stop offset="0%" stop-color="#FDBA74" stop-opacity="0.85"/>
                  <stop offset="50%" stop-color="#F97316" stop-opacity="0.35"/>
                  <stop offset="100%" stop-color="#F97316" stop-opacity="0"/>
                </radialGradient>
                <filter id="bikeShadow" x="-30%" y="-30%" width="160%" height="160%">
                  <feDropShadow dx="0" dy="3" stdDeviation="3.5" flood-color="#000000" flood-opacity="0.6"/>
                </filter>
              </defs>

              <!-- Forward Headlight Illumination Cone -->
              <polygon points="28,24 13,3 43,3" fill="url(#bikeHeadlight)"/>

              <!-- Outer Stealth Badge Disc with 3D Drop Shadow -->
              <circle cx="28" cy="28" r="16" fill="#111216" stroke="#F97316" stroke-width="2.5" filter="url(#bikeShadow)"/>
              <circle cx="28" cy="28" r="13" fill="none" stroke="#FFFFFF" stroke-width="1.2" stroke-opacity="0.9"/>

              <!-- Forward Heading Arrow Tip -->
              <path d="M28 13 L23.5 19 L28 17.5 L32.5 19 Z" fill="#F97316" stroke="#FFFFFF" stroke-width="1" stroke-linejoin="round"/>

              <!-- Top-down Motorcycle Silhouette -->
              <!-- Front tire -->
              <rect x="26.5" y="19" width="3" height="6" rx="1.5" fill="#FFFFFF"/>
              <!-- Handlebar with grip ends -->
              <path d="M20 23.5 L36 23.5" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/>
              <circle cx="19.5" cy="22.5" r="1.3" fill="#F97316"/>
              <circle cx="36.5" cy="22.5" r="1.3" fill="#F97316"/>
              <!-- Fuel tank -->
              <path d="M24.5 24.5 Q28 22.5 31.5 24.5 L30.5 29.5 L25.5 29.5 Z" fill="#F97316"/>
              <!-- Rider Helmet with visor reflection -->
              <circle cx="28" cy="28.5" r="3.2" fill="#FFFFFF"/>
              <path d="M26.5 27.5 Q28 26.3 29.5 27.5" stroke="#111216" stroke-width="1.2" stroke-linecap="round" fill="none"/>
              <!-- Seat -->
              <path d="M25.5 31 L30.5 31 L30 34.5 L26 34.5 Z" fill="#94A3B8"/>
              <!-- Rear wheel -->
              <rect x="26.5" y="34" width="3" height="5.5" rx="1.5" fill="#FFFFFF"/>
            </svg>
          `;
          wrap.appendChild(rotator);

          // "YOU" pill label
          const tag = document.createElement('div');
          tag.style.cssText = `
            position:absolute; bottom:-10px; left:50%; transform:translateX(-50%);
            background:rgba(15,16,20,0.95); color:#FFFFFF;
            font-family:'Inter',sans-serif; font-size:0.58rem; font-weight:800;
            padding:2px 7px; border-radius:100px; white-space:nowrap;
            border:1.5px solid #F97316; box-shadow:0 3px 10px rgba(0,0,0,0.5);
            display:flex; align-items:center; gap:4px; pointer-events:none; z-index:3;
          `;
          tag.innerHTML = `
            <span style="width:5px; height:5px; border-radius:50%; background:#F97316; box-shadow:0 0 6px #F97316;"></span>
            YOU
          `;
          wrap.appendChild(tag);
          return wrap;
        } else {
          // ── Pre-ride: highlighted bike badge with YOU indicator ──
          const size = 38;
          const wrap = document.createElement('div');
          wrap.className = 'gmaps-blue-dot';
          wrap.style.cssText = `
            position:relative; width:${size}px; height:${size}px; cursor:pointer;
            display:flex; align-items:center; justify-content:center;
          `;
          const pulse = document.createElement('div');
          pulse.style.cssText = `
            position:absolute; width:58px; height:58px;
            background:rgba(249,115,22,0.22); border-radius:50%;
            border:1.8px solid rgba(249,115,22,0.35);
            animation:pulse-ring 2s infinite; z-index:1; pointer-events:none;
          `;
          const dot = document.createElement('div');
          dot.style.cssText = `
            width:${size}px; height:${size}px;
            background:linear-gradient(135deg, #F97316 0%, #EA580C 100%);
            border-radius:50%;
            border:3px solid white;
            box-shadow: 0 0 16px rgba(249,115,22,0.75), 0 2px 8px rgba(0,0,0,0.4);
            z-index:2;
            display:flex; align-items:center; justify-content:center;
          `;
          // Crisp motorcycle icon
          dot.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="5.5" cy="17.5" r="3.5"/>
              <circle cx="18.5" cy="17.5" r="3.5"/>
              <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h2"/>
            </svg>
          `;
          const tag = document.createElement('div');
          tag.style.cssText = `
            position:absolute; top:-20px; left:50%; transform:translateX(-50%);
            background:rgba(15,16,20,0.92); color:#F97316;
            font-family:'Inter',sans-serif; font-size:0.58rem; font-weight:800;
            padding:2px 7px; border-radius:100px; white-space:nowrap;
            border:1.2px solid #F97316; box-shadow:0 2px 6px rgba(0,0,0,0.4);
            pointer-events:none; z-index:3;
          `;
          tag.textContent = 'YOU';

          wrap.appendChild(pulse);
          wrap.appendChild(dot);
          wrap.appendChild(tag);
          return wrap;
        }
      }

      const size = 34;
      const wrap = document.createElement('div');
      wrap.style.cssText = `position:relative;width:${size}px;height:${size}px;cursor:pointer;`;
      const avatar = document.createElement('div');
      avatar.style.cssText = `
        width:${size}px; height:${size}px; background:${color}; border-radius:50%;
        border:2px solid rgba(255,255,255,0.85); box-shadow:0 2px 10px rgba(0,0,0,0.22);
        display:flex; align-items:center; justify-content:center;
        font-family:'Inter',sans-serif; font-size:0.66rem; font-weight:800;
        color:white; user-select:none;
      `;
      avatar.textContent = getInitials(name);
      const tag = document.createElement('div');
      tag.style.cssText = `
        position:absolute; top:-22px; left:50%; transform:translateX(-50%);
        background:rgba(13,13,13,0.85); color:white;
        font-family:'Inter',sans-serif; font-size:0.58rem; font-weight:600;
        padding:2px 7px; border-radius:100px; white-space:nowrap;
        border:1px solid rgba(255,255,255,0.12); pointer-events:none;
      `;
      tag.textContent = name.toLowerCase();
      wrap.appendChild(tag);
      wrap.appendChild(avatar);
      return wrap;
    };

    const activeRiderIds = new Set();

    // 1. Current user marker (ALWAYS rendered from userCoords, even if Supabase cohort is not yet synced)
    if (userCoords && userCoords.lat && userCoords.lng) {
      const myId = currentRiderId || '__current_user__';
      activeRiderIds.add(myId);

      const expectedType = isRideStarted ? 'chevron' : 'dot';
      let myMarker = markersRef.current[myId];
      if (myMarker && myMarker.markerType !== expectedType) {
        myMarker.remove();
        delete markersRef.current[myId];
        myMarker = null;
      }

      const currentHeading = userHeading || 0;

      if (myMarker) {
        myMarker.setLngLat([userCoords.lng, userCoords.lat]);
        if (isRideStarted) {
          const el = myMarker.getElement();
          if (el) {
            const rotEl = el.querySelector('.rydr-bike-rotator') || el.querySelector('svg');
            if (rotEl) {
              rotEl.style.transform = `rotate(${currentHeading}deg)`;
            }
          }
        }
      } else {
        const el = createMarkerEl(userName || 'You', userColor || '#F97316', true, currentHeading);
        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([userCoords.lng, userCoords.lat])
          .addTo(map);
        marker.markerType = expectedType;
        el.addEventListener('click', () => {
          map.flyTo({ center: [userCoords.lng, userCoords.lat], zoom: 16 });
          if (setIsMapCentered) setIsMapCentered(false);
        });
        markersRef.current[myId] = marker;
      }
    }

    // 2. Cohort Pack Riders from Supabase
    riders.forEach(r => {
      if (!r.lat || !r.lng || !r.online) return;
      if (currentRiderId && r.id === currentRiderId) return; // already rendered as myId above
      activeRiderIds.add(r.id);

      const expectedType = 'standard';
      let existingMarker = markersRef.current[r.id];
      if (existingMarker && existingMarker.markerType !== expectedType) {
        existingMarker.remove();
        delete markersRef.current[r.id];
        existingMarker = null;
      }

      if (existingMarker) {
        existingMarker.setLngLat([r.lng, r.lat]);
      } else {
        const el = createMarkerEl(r.name, r.color || '#6366F1', false, 0);
        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([r.lng, r.lat])
          .addTo(map);
        marker.markerType = expectedType;
        el.addEventListener('click', () => {
          map.flyTo({ center: [r.lng, r.lat], zoom: 16 });
          if (setIsMapCentered) setIsMapCentered(false);
        });
        markersRef.current[r.id] = marker;
      }
    });

    Object.keys(markersRef.current).forEach(id => {
      if (!activeRiderIds.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });
  }, [riders, isRideStarted, currentRiderId, userHeading, userCoords, userName, userColor]);

  // Destination Marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (destination && destination.lat && destination.lng) {
      if (destMarkerRef.current) {
        const currentPos = destMarkerRef.current.getLngLat();
        if (Math.abs(currentPos.lat - destination.lat) > 0.0001 || Math.abs(currentPos.lng - destination.lng) > 0.0001) {
          destMarkerRef.current.setLngLat([destination.lng, destination.lat]);
        }
        const popup = destMarkerRef.current.getPopup();
        if (popup) {
          popup.setHTML(`<b style="font-family:Inter,sans-serif">${destination.name}</b><br><small style="color:#6B7280">Destination</small>`);
        }
      } else {
        const el = document.createElement('div');
        el.style.cssText = 'width:36px; height:36px; display:flex; align-items:center; justify-content:center; cursor:pointer; filter:drop-shadow(0px 3px 6px rgba(0,0,0,0.4));';
        el.innerHTML = `
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z" fill="#EF4444" stroke="#FFFFFF" stroke-width="1.8"/>
            <circle cx="12" cy="9" r="3.5" fill="#FFFFFF"/>
          </svg>
        `;
        destMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'bottom', draggable: true })
          .setLngLat([destination.lng, destination.lat])
          .setPopup(new maplibregl.Popup({ offset: 28 })
            .setHTML(`<b style="font-family:Inter,sans-serif">${destination.name}</b><br><small style="color:#6B7280">Destination</small>`))
          .addTo(map);

        destMarkerRef.current.on('dragend', () => {
          const lngLat = destMarkerRef.current.getLngLat();
          if (onUpdateDestination) {
            onUpdateDestination(lngLat.lat, lngLat.lng);
          }
        });
      }
    } else {
      if (destMarkerRef.current) {
        destMarkerRef.current.remove();
        destMarkerRef.current = null;
      }
    }
  }, [destination]);

  // Trigger trail updates
  useEffect(() => {
    const map = mapRef.current;
    if (map) drawTrailLayersRef.current(map);
  }, [userTrail]);

  // Trigger route rendering whenever routes, selection, or user coords changes.
  // drawRouteLayersRef.current always holds the latest closure with fresh props.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (map.isStyleLoaded()) {
      drawRouteLayersRef.current(map);
    }
  }, [allRoutes, selectedRouteIndex, userCoords]);

  return <div ref={mapContainerRef} style={{ width: '100%', height: '100%', borderRadius: 'inherit' }} />;
}
