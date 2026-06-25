// ===== RYDR RIDE.JS — MapLibre GL JS + MapTiler + OSRM =====

import {
  collection, doc, setDoc, updateDoc,
  onSnapshot, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { MAPTILER_KEY, MAP_STYLES } from "./maplibre-config.js";

// ===== BASE64 DECODE =====
function urlBase64ToUnicode(encoded) {
  const b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '=='.slice(0, (4 - b64.length % 4) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

// ===== UTILS =====
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast show' + (type ? ' ' + type : '');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 3000);
}

function calcDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatTime(seconds) {
  if (seconds === null || isNaN(seconds) || seconds < 0) return '--';
  const h = Math.floor(seconds / 3600);
  const m = Math.ceil((seconds % 3600) / 60);
  if (h > 0) {
    let finalH = h;
    let finalM = m;
    if (finalM >= 60) {
      finalH += 1;
      finalM -= 60;
    }
    return `${finalH}h ${finalM}m`;
  }
  return `${m > 0 ? m : 1} min`;
}

function getInitials(name) {
  if (!name || name === 'You') return 'U';
  const clean = name.trim();
  const p = clean.split(/\s+/);
  if (p.length >= 2) {
    return (p[0][0] + p[p.length - 1][0]).toUpperCase();
  }
  if (clean.length > 1) {
    return (clean[0] + clean[clean.length - 1]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try { return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }); }
  catch { return dateStr; }
}

function formatTimeStr(timeStr) {
  if (!timeStr) return '—';
  try {
    const [h, m] = timeStr.split(':');
    const d = new Date(); d.setHours(+h, +m);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch { return timeStr; }
}

// ===== STATE =====
let map = null;
let mapLoaded = false;
let currentStyleKey = 'outdoor';

const riderMarkers = {};         // riderId → maplibregl.Marker
const riderTrails = {};         // riderId → [[lng,lat], ...]

let watchId = null;
let timerInterval = null;
let startTime = null;
let totalDistance = 0;
let lastLat = null, lastLng = null;
let topSpeed = 0;
let elapsedSeconds = 0;
let remainingSeconds = null;
let baseRouteDistance = null;
let baseOSRMDuration = null;
let baseOSRMDistance = null;
let allRoutes = [];
let selectedRouteIndex = 0;
let routeAbortController = null;
let lastGPSTime = null;
let isMapCentered = true;

let db = null;
let session = null;
let rideId = null;
let rideData = null;
let unsubRiders = null;
let unsubRide = null;
let currentRiders = [];
let isRegistered = false;
let lastFbUpdate = 0;
const FB_INTERVAL = 3000;

let destination = null;
let destMarker = null;
let routeDrawn = false;
let lastRouteUpdateLat = null;
let lastRouteUpdateLng = null;
const ROUTE_REFRESH_KM = 0.3;

let alertDismissed = false;

// ===== INIT =====
export function initRide(firestoreDb) {
  db = firestoreDb;

  const params = new URLSearchParams(window.location.search);
  const urlRideId = params.get('r') || params.get('ride') || params.get('rideId');
  const encoded = params.get('s');

  console.log("initRide starting. urlRideId:", urlRideId, "encoded:", !!encoded);

  session = null; rideId = null;

  if (encoded) {
    try {
      const decoded = urlBase64ToUnicode(encoded);
      console.log("Decoded session string:", decoded);
      session = JSON.parse(decoded);
      if (session?.rideId) {
        rideId = session.rideId;
        if (session.destination?.lat) destination = session.destination;
        sessionStorage.setItem('rydr_session', JSON.stringify(session));
        localStorage.setItem('rydr_rider', JSON.stringify(session));
        console.log("Session loaded from URL encoded param. rideId:", rideId);
      }
    } catch (e) { console.error('Session decode error:', e); }
  }

  if (!session) {
    try {
      const ss = sessionStorage.getItem('rydr_session') || sessionStorage.getItem('ridesync_session');
      console.log("Session from sessionStorage:", ss);
      if (ss) { 
        const p = JSON.parse(ss); 
        if (!urlRideId || p.rideId === urlRideId) { 
          session = p; 
          rideId = session.rideId; 
          console.log("Session loaded from sessionStorage. rideId:", rideId);
        } else {
          console.log("sessionStorage rideId mismatch. p.rideId:", p.rideId, "urlRideId:", urlRideId);
        }
      }
    } catch (e) { console.error("sessionStorage parse error:", e); }
  }

  if (!session) {
    try {
      const ls = localStorage.getItem('rydr_rider') || localStorage.getItem('ridesync_rider');
      console.log("Session from localStorage:", ls);
      if (ls) { 
        const p = JSON.parse(ls); 
        if (!urlRideId || p.rideId === urlRideId) { 
          session = p; 
          rideId = session.rideId; 
          console.log("Session loaded from localStorage. rideId:", rideId);
        } else {
          console.log("localStorage rideId mismatch. p.rideId:", p.rideId, "urlRideId:", urlRideId);
        }
      }
    } catch (e) { console.error("localStorage parse error:", e); }
  }

  if (!rideId) rideId = urlRideId;
  console.log("Final check. session:", session, "rideId:", rideId);
  
  if (!session && rideId) { 
    console.log("No session but rideId exists. Redirecting to join-ride.html");
    window.location.href = `join-ride.html?rideId=${encodeURIComponent(rideId)}`; 
    return; 
  }
  if (!session || !rideId) { 
    console.log("No session or rideId. Redirecting to index.html in 1.2s");
    showToast("Redirecting to home page...", "error");
    setTimeout(() => { window.location.href = 'index.html'; }, 1200); 
    return; 
  }

  document.getElementById('topRideTitle').textContent = session.rideTitle || 'Live Ride';
  document.getElementById('topRideId').textContent = rideId;
  document.title = `Rydr — ${session.rideTitle || 'Live Ride'}`;

  subscribeToRideDoc();

  setupMapWithGPS();
  setupUIHandlers();
}

function subscribeToRideDoc() {
  try {
    unsubRide = onSnapshot(doc(db, 'rides', rideId), snap => {
      if (!snap.exists()) return;
      rideData = snap.data();
      const title = rideData.title || 'Live Ride';
      document.getElementById('topRideTitle').textContent = title;
      document.title = `Rydr — ${title}`;
      // Populate details panel
      setText('detailRideName', title);
      setText('detailRideId', rideId);
      setText('detailStart', rideData.startLocationName || '—');
      setText('detailDest', rideData.destinationName || '—');
      setText('detailDate', formatDate(rideData.rideDate));
      setText('detailTime', formatTimeStr(rideData.rideTime));
      // Load destination from Firestore if not in session
      if (!destination && rideData.destinationLat && rideData.destinationLng) {
        destination = { name: rideData.destinationName || 'Destination', lat: rideData.destinationLat, lng: rideData.destinationLng };
        if (mapLoaded) { placeDestMarker(); showDestHUD(); if (lastLat) drawRoute(lastLat, lastLng); }
      }
    });
  } catch (e) { console.error("Firestore ride sub error:", e); }
}

// ===== GPS PERMISSION =====
function setupMapWithGPS() {
  const overlay = document.getElementById('gpsOverlay');
  const btn = document.getElementById('enableGpsBtn');

  if (!('geolocation' in navigator)) {
    overlay.querySelector('.gps-title').textContent = 'GPS Not Available';
    overlay.querySelector('.gps-desc').textContent = 'Use Chrome on mobile for GPS.';
    btn.style.display = 'none';
    return;
  }

  btn.addEventListener('click', () => {
    overlay.style.opacity = '0.7';
    btn.textContent = 'Requesting GPS…';
    btn.disabled = true;
    startTracking();
  });

  if (navigator.permissions) {
    navigator.permissions.query({ name: 'geolocation' })
      .then(r => { if (r.state === 'granted') { overlay.style.display = 'none'; startTracking(); } })
      .catch(() => { });
  }
}

function startTracking() {
  let done = false;
  const t = setTimeout(() => { if (!done) { done = true; onFail({ code: 3 }); } }, 6000);

  function onOk(pos) {
    if (done) return; done = true; clearTimeout(t);
    document.getElementById('gpsOverlay').style.display = 'none';
    initMap(pos.coords.latitude, pos.coords.longitude);
  }
  function onFail(err) {
    if (done) return; done = true; clearTimeout(t);
    console.warn('GPS location fetch failed, using fallback starting location:', err);
    showToast('GPS failed — loading map at fallback location', 'warning');
    
    const ov = document.getElementById('gpsOverlay');
    if (ov) ov.style.display = 'none';

    let fallbackLat = 19.0760; // Mumbai default
    let fallbackLng = 72.8777;

    if (session && session.startLocationCoords && session.startLocationCoords.lat) {
      fallbackLat = session.startLocationCoords.lat;
      fallbackLng = session.startLocationCoords.lng;
    } else if (rideData && rideData.startLat && rideData.startLng) {
      fallbackLat = rideData.startLat;
      fallbackLng = rideData.startLng;
    } else if (destination && destination.lat && destination.lng) {
      fallbackLat = destination.lat;
      fallbackLng = destination.lng;
    }

    initMap(fallbackLat, fallbackLng);
  }

  navigator.geolocation.getCurrentPosition(onOk,
    err => navigator.geolocation.getCurrentPosition(onOk, onFail, { enableHighAccuracy: false, timeout: 5000 }),
    { enableHighAccuracy: true, timeout: 4000 }
  );
}

// ===== INIT MAPLIBRE MAP =====
async function initMap(initLat, initLng) {
  map = new maplibregl.Map({
    container: 'map',
    style: MAP_STYLES.outdoor,
    center: [initLng, initLat],   // MapLibre: [lng, lat]
    zoom: 15,
    pitch: 40,
    bearing: 0,
    antialias: true,
    attributionControl: true,
  });

  // Navigation control (zoom + compass)
  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');

  // Stop auto-centering when user manually drags
  map.on('dragstart', () => { isMapCentered = false; });

  map.on('load', () => {
    mapLoaded = true;
    if (destination) { placeDestMarker(); showDestHUD(); drawRoute(initLat, initLng); }
    // Re-render any trails already in memory
    Object.entries(riderTrails).forEach(([id, coords]) => {
      if (coords.length >= 2) renderTrail(id, coords, id === session.riderId ? session.color : '#888');
    });
  });

  // Reload sources after style change
  map.on('styledata', () => {
    if (!mapLoaded) return;

    // Render trails if missing in new style
    Object.entries(riderTrails).forEach(([id, coords]) => {
      const lyrId = `trail-layer-${id}`;
      if (coords.length >= 2 && !map.getLayer(lyrId)) {
        renderTrail(id, coords, id === session.riderId ? session.color : '#888');
      }
    });

    // Render routes if missing in new style
    if (destination) {
      if (!map.getLayer('rydr-route-line-0')) {
        if (allRoutes && allRoutes.length > 0) {
          renderRoutes();
        } else if (lastLat) {
          drawRoute(lastLat, lastLng);
        }
      }
    }
  });

  // Firestore subscription moved to subscribeToRideDoc()

  startGPSWatch();
  listenToRiders();
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ===== DESTINATION MARKER =====
function placeDestMarker() {
  if (!destination || !map) return;
  if (destMarker) destMarker.remove();
  const el = document.createElement('div');
  el.style.cssText = 'font-size:2rem; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.35)); cursor:pointer;';
  el.textContent = '🏁';
  destMarker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
    .setLngLat([destination.lng, destination.lat])
    .setPopup(new maplibregl.Popup({ offset: 28 })
      .setHTML(`<b style="font-family:Inter,sans-serif">${destination.name}</b><br><small style="color:#6B7280">Destination</small>`))
    .addTo(map);
}

function showDestHUD() {
  const row = document.getElementById('destRow');
  if (row) { row.style.display = 'flex'; setText('destRowName', destination.name); }
}

// ===== RENDER ROUTE LAYERS (Dark Black selected on top, Light Black alts underneath) =====
function renderRoutes() {
  if (!mapLoaded || !map || !allRoutes || !allRoutes.length) return;

  // PASS 1: Render all routes (alts first so selected goes on top)
  // Sort: alternates first, selected last so it ends up on top
  const renderOrder = [];
  for (let i = 0; i < Math.min(allRoutes.length, 10); i++) {
    if (i !== selectedRouteIndex) renderOrder.push(i); // alts first
  }
  renderOrder.push(selectedRouteIndex); // selected last (drawn on top)

  for (const idx of renderOrder) {
    const srcId = `rydr-route-src-${idx}`;
    const casingLyr = `rydr-route-casing-${idx}`;
    const lineLyr = `rydr-route-line-${idx}`;
    const clickLyr = `rydr-route-click-${idx}`;
    const route = allRoutes[idx];
    const geojson = { type: 'Feature', geometry: route.geometry };
    const isSelected = idx === selectedRouteIndex;

    // Update or create source
    if (map.getSource(srcId)) {
      map.getSource(srcId).setData(geojson);
    } else {
      map.addSource(srcId, { type: 'geojson', data: geojson });
    }

    // --- Casing layer (white outline underneath for contrast on dark map styles) ---
    if (map.getLayer(casingLyr)) {
      map.setLayoutProperty(casingLyr, 'visibility', 'visible');
      map.setPaintProperty(casingLyr, 'line-width', isSelected ? 9 : 6.5);
      map.setPaintProperty(casingLyr, 'line-opacity', isSelected ? 0.85 : 0.35);
    } else {
      map.addLayer({
        id: casingLyr, type: 'line', source: srcId,
        layout: { 'line-cap': 'round', 'line-join': 'round', 'visibility': 'visible' },
        paint: {
          'line-color': '#FFFFFF',
          'line-width': isSelected ? 9 : 6.5,
          'line-opacity': isSelected ? 0.85 : 0.35
        }
      });
    }

    // --- Route line layer ---
    // Selected: solid dark black (#0F172A), thick, fully opaque → covers alt overlaps
    // Alternate: muted charcoal (#71717A), slightly thinner → only diverging part visible
    if (map.getLayer(lineLyr)) {
      map.setLayoutProperty(lineLyr, 'visibility', 'visible');
      map.setPaintProperty(lineLyr, 'line-color', isSelected ? '#0F172A' : '#71717A');
      map.setPaintProperty(lineLyr, 'line-width', isSelected ? 6 : 3.5);
      map.setPaintProperty(lineLyr, 'line-opacity', isSelected ? 1 : 0.65);
    } else {
      map.addLayer({
        id: lineLyr, type: 'line', source: srcId,
        layout: { 'line-cap': 'round', 'line-join': 'round', 'visibility': 'visible' },
        paint: {
          'line-color': isSelected ? '#0F172A' : '#71717A',
          'line-width': isSelected ? 6 : 3.5,
          'line-opacity': isSelected ? 1 : 0.65
        }
      });
    }

    // --- Click catcher layer (transparent wide area) ---
    if (map.getLayer(clickLyr)) {
      map.setLayoutProperty(clickLyr, 'visibility', 'visible');
    } else {
      map.addLayer({
        id: clickLyr, type: 'line', source: srcId,
        layout: { 'line-cap': 'round', 'line-join': 'round', 'visibility': 'visible' },
        paint: { 'line-color': 'rgba(0,0,0,0)', 'line-width': 18 }
      });
      map.on('click', clickLyr, () => { selectRoute(idx); });
      map.on('mouseenter', clickLyr, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', clickLyr, () => { map.getCanvas().style.cursor = ''; });
    }
  }

  // PASS 2: Bring selected route's layers to top so they paint over the alternates' shared segments
  const selCasing = `rydr-route-casing-${selectedRouteIndex}`;
  const selLine   = `rydr-route-line-${selectedRouteIndex}`;
  const selClick  = `rydr-route-click-${selectedRouteIndex}`;
  if (map.getLayer(selCasing)) map.moveLayer(selCasing);
  if (map.getLayer(selLine))   map.moveLayer(selLine);
  if (map.getLayer(selClick))  map.moveLayer(selClick);

  // PASS 3: Hide slots beyond the number of returned routes
  for (let idx = allRoutes.length; idx < 10; idx++) {
    const casingLyr = `rydr-route-casing-${idx}`;
    const lineLyr   = `rydr-route-line-${idx}`;
    const clickLyr  = `rydr-route-click-${idx}`;
    if (map.getLayer(casingLyr)) map.setLayoutProperty(casingLyr, 'visibility', 'none');
    if (map.getLayer(lineLyr))   map.setLayoutProperty(lineLyr, 'visibility', 'none');
    if (map.getLayer(clickLyr))  map.setLayoutProperty(clickLyr, 'visibility', 'none');
  }
}


// ===== OSRM ROUTING (Free, no key needed) =====
async function drawRoute(fromLat, fromLng) {
  if (!destination || !mapLoaded || !map) return;
  
  if (routeAbortController) {
    routeAbortController.abort();
  }
  routeAbortController = new AbortController();
  const { signal } = routeAbortController;

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&alternatives=true`;
    const res = await fetch(url, { signal });
    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes?.length) return;

    allRoutes = data.routes;
    renderRoutes();

    routeDrawn = true;
    updateBaseRouteMetrics();

    if (!timerInterval) { startTime = Date.now(); startTimer(); }
  } catch (e) {
    if (e.name !== 'AbortError') {
      console.warn('OSRM route error:', e);
    }
  } finally {
    if (routeAbortController?.signal === signal) {
      routeAbortController = null;
    }
  }
}

function selectRoute(idx) {
  if (idx < 0 || idx >= allRoutes.length) return;
  selectedRouteIndex = idx;
  
  renderRoutes();

  updateBaseRouteMetrics();
  showToast(`Switched to Route ${idx + 1}${idx === 0 ? ' (Fastest)' : ''}`, 'success');
}

function updateBaseRouteMetrics() {
  if (selectedRouteIndex >= allRoutes.length) selectedRouteIndex = 0;
  const route = allRoutes[selectedRouteIndex];
  if (!route) return;

  const distKm = (route.distance / 1000).toFixed(1);
  const formattedTime = formatTime(route.duration);
  const prefix = selectedRouteIndex === 0 ? '🏆 Fastest Route: ' : `Route ${selectedRouteIndex + 1}: `;
  setText('destRowDist', `${prefix}${distKm} km · ~${formattedTime}`);

  baseRouteDistance = route.distance;
  baseOSRMDuration = route.duration;
  
  let lat = lastLat;
  let lng = lastLng;
  if (!lat && lastRouteUpdateLat) {
    lat = lastRouteUpdateLat;
    lng = lastRouteUpdateLng;
  }
  if (lat) {
    baseOSRMDistance = calcDistance(lat, lng, destination.lat, destination.lng);
  }
  
  updateHUDMetrics();
}

function clearRouteLayers() {
  if (!map) return;
  for (let i = 0; i < 10; i++) {
    try {
      if (map.getLayer(`rydr-route-click-${i}`)) map.removeLayer(`rydr-route-click-${i}`);
      if (map.getLayer(`rydr-route-line-${i}`)) map.removeLayer(`rydr-route-line-${i}`);
      if (map.getLayer(`rydr-route-casing-${i}`)) map.removeLayer(`rydr-route-casing-${i}`);
      if (map.getSource(`rydr-route-src-${i}`)) map.removeSource(`rydr-route-src-${i}`);
    } catch (e) { }
  }
}

// ===== RIDER TRAIL (GeoJSON Layer) =====
function renderTrail(riderId, coords, color) {
  if (!mapLoaded || !map || coords.length < 2) return;
  const srcId = `trail-${riderId}`;
  const lyrId = `trail-layer-${riderId}`;
  const geojson = { type: 'Feature', geometry: { type: 'LineString', coordinates: coords } };

  if (map.getSource(srcId)) {
    map.getSource(srcId).setData(geojson);
  } else {
    map.addSource(srcId, { type: 'geojson', data: geojson });
    map.addLayer({
      id: lyrId, type: 'line', source: srcId,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': color || '#0D0D0D',
        'line-width': 3,
        'line-opacity': 0.55,
        ...(riderId !== session.riderId ? { 'line-dasharray': [2, 2] } : {}),
      },
    });
  }
}

// ===== FIREBASE REGISTER =====
async function registerRider(lat, lng, speed, heading) {
  await setDoc(doc(db, 'rides', rideId, 'riders', session.riderId), {
    name: session.name, bike: session.bike || null, color: session.color,
    email: session.email || null,
    contact: session.contact || null,
    bloodGroup: session.bloodGroup || null,
    lat, lng, speed, heading,
    lastSeen: serverTimestamp(), online: true, isHost: session.isHost || false,
  });
}

// ===== GPS WATCH =====
function startGPSWatch() {
  watchId = navigator.geolocation.watchPosition(
    onGPS,
    err => console.warn('GPS:', err.message),
    { enableHighAccuracy: true, timeout: 20000, maximumAge: 2000 }
  );
}

async function onGPS(pos) {
  const now = Date.now();
  const { latitude: lat, longitude: lng, speed, heading } = pos.coords;

  // Calculate speed (m/s → km/h)
  let speedKmh = 0;
  if (speed !== null && speed > 0) {
    speedKmh = Math.round(speed * 3.6);
  } else if (lastLat !== null && lastGPSTime !== null) {
    const dist = calcDistance(lastLat, lastLng, lat, lng);
    const hrs = (now - lastGPSTime) / 3600000;
    if (hrs > 0 && dist > 0.01 && dist / hrs < 200) speedKmh = Math.round(dist / hrs);
  }

  // Filter out low-speed GPS jitter
  if (speedKmh < 3) {
    speedKmh = 0;
  }

  lastGPSTime = now;

  // Accumulate distance only if moving (speedKmh > 0)
  if (lastLat !== null && speedKmh > 0) {
    const d = calcDistance(lastLat, lastLng, lat, lng);
    if (d > 0.02) { // 20m threshold
      totalDistance += d;
      if (!riderTrails[session.riderId]) riderTrails[session.riderId] = [];
      riderTrails[session.riderId].push([lng, lat]); // MapLibre: [lng, lat]
      renderTrail(session.riderId, riderTrails[session.riderId], session.color);
    }
  }
  lastLat = lat; lastLng = lng;
  if (speedKmh > topSpeed) topSpeed = speedKmh;

  // HUD update
  setText('speedDisplay', speedKmh);
  
  updateHUDMetrics();

  // Start timer on first GPS fix
  if (!timerInterval) { startTime = Date.now(); startTimer(); }

  // My marker
  upsertMarker(session.riderId, lat, lng, session.color, session.name, true, heading || 0);

  // Camera follow
  if (isMapCentered && map) {
    map.easeTo({ center: [lng, lat], bearing: heading || 0, duration: 600 });
  }

  // Firebase
  if (!isRegistered) {
    isRegistered = true;
    try { await registerRider(lat, lng, speedKmh, heading || 0); lastFbUpdate = now; }
    catch { isRegistered = false; }
  } else if (now - lastFbUpdate >= FB_INTERVAL) {
    lastFbUpdate = now;
    try {
      await updateDoc(doc(db, 'rides', rideId, 'riders', session.riderId), {
        lat, lng, speed: speedKmh, heading: heading || 0,
        lastSeen: serverTimestamp(), online: true,
      });
    } catch { }
  }

  // Refresh route
  if (destination) {
    const moved = !lastRouteUpdateLat ||
      calcDistance(lastRouteUpdateLat, lastRouteUpdateLng, lat, lng) >= ROUTE_REFRESH_KM;
    if (moved) {
      lastRouteUpdateLat = lat; lastRouteUpdateLng = lng;
      drawRoute(lat, lng);
    }
  }

  updateRidersUI(currentRiders);
}

// ===== MAPLIBRE MARKER: CREATE / UPDATE =====
function upsertMarker(riderId, lat, lng, color, name, isMe, heading) {
  if (!map) return;
  if (riderMarkers[riderId]) {
    riderMarkers[riderId].setLngLat([lng, lat]);
  } else {
    const el = buildMarkerEl(name, color, isMe);
    const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
      .setLngLat([lng, lat])
      .addTo(map);
    el.addEventListener('click', () => map.flyTo({ center: [lng, lat], zoom: 16 }));
    riderMarkers[riderId] = marker;
  }
}

function buildMarkerEl(name, color, isMe) {
  let displayName = name;
  if (isMe) {
    try {
      const profileStr = localStorage.getItem('rydr_rider_profile');
      if (profileStr) {
        const profile = JSON.parse(profileStr);
        if (profile && profile.firstName) {
          displayName = `${profile.firstName} ${profile.lastName || ''}`.trim();
        }
      }
    } catch {}
  }
  if (!displayName || displayName === 'You') displayName = 'you';

  const size = isMe ? 42 : 34;
  const wrap = document.createElement('div');
  wrap.style.cssText = `position:relative;width:${size}px;height:${size}px;cursor:pointer;`;

  const avatar = document.createElement('div');
  avatar.style.cssText = `
    width:${size}px; height:${size}px;
    background:${color};
    border-radius:50%;
    border:${isMe ? '3px solid white' : '2px solid rgba(255,255,255,0.85)'};
    box-shadow:${isMe ? `0 0 0 3px ${color}44, 0 4px 16px rgba(0,0,0,0.28)` : '0 2px 10px rgba(0,0,0,0.22)'};
    display:flex; align-items:center; justify-content:center;
    font-family:'Inter',sans-serif;
    font-size:${isMe ? '0.78rem' : '0.66rem'};
    font-weight:800; color:white;
    user-select:none;
    transition:transform 0.2s;
  `;
  avatar.textContent = getInitials(displayName);

  const tag = document.createElement('div');
  tag.style.cssText = `
    position:absolute; top:-22px; left:50%; transform:translateX(-50%);
    background:rgba(13,13,13,0.85); color:white;
    font-family:'Inter',sans-serif; font-size:0.58rem; font-weight:600;
    padding:2px 7px; border-radius:100px; white-space:nowrap;
    border:1px solid rgba(255,255,255,0.12); pointer-events:none;
  `;
  tag.textContent = displayName.toLowerCase();

  wrap.appendChild(tag);
  wrap.appendChild(avatar);
  return wrap;
}

// ===== REALTIME RIDERS (Firebase) =====
function listenToRiders() {
  unsubRiders = onSnapshot(collection(db, 'rides', rideId, 'riders'), snap => {
    const riders = [];
    snap.forEach(d => {
      const data = d.data();
      riders.push({ id: d.id, ...data });
      if (d.id !== session.riderId && data.lat && data.lng) {
        if (!riderTrails[d.id]) riderTrails[d.id] = [];
        const trail = riderTrails[d.id];
        const last = trail[trail.length - 1];
        if (!last || last[0] !== data.lng || last[1] !== data.lat) {
          trail.push([data.lng, data.lat]);
          renderTrail(d.id, trail, data.color || '#888');
        }
        upsertMarker(d.id, data.lat, data.lng, data.color || '#888', data.name, false, data.heading || 0);
      }
    });
    currentRiders = riders;
    updateRidersUI(riders);
    checkAlert(riders);
  });
}

// ===== ALERT — Rider Falling Behind =====
function checkAlert(riders) {
  if (alertDismissed || !lastLat) return;
  for (const r of riders) {
    if (r.id === session.riderId || !r.lat) continue;
    const d = calcDistance(lastLat, lastLng, r.lat, r.lng);
    if (d > 3) { triggerAlert(r.name, d); return; }
  }
}

function triggerAlert(name, distKm) {
  const el = document.getElementById('riderAlert');
  if (!el || el.style.display === 'block') return;
  setText('alertTitle', `${name} is falling behind`);
  setText('alertDist', `${distKm.toFixed(1)} km behind the group`);
  setText('alertStatus', distKm > 5 ? 'Needs attention' : 'Slightly behind');
  el.style.display = 'block';
}

// ===== TIMER =====
function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    updateHUDMetrics();
  }, 1000);
}

function updateHUDMetrics() {
  if (destination && destination.lat && destination.lng) {
    let lat = lastLat;
    let lng = lastLng;
    if (!lat && lastRouteUpdateLat) {
      lat = lastRouteUpdateLat;
      lng = lastRouteUpdateLng;
    }
    if (!lat) return;
    
    const currentDist = calcDistance(lat, lng, destination.lat, destination.lng);
    let displayDist = 0;
    let displaySeconds = 0;
    
    if (baseOSRMDistance && baseOSRMDistance > 0.001) {
      const ratio = currentDist / baseOSRMDistance;
      if (baseRouteDistance !== null) {
        displayDist = (baseRouteDistance / 1000) * ratio;
      } else {
        displayDist = currentDist;
      }
      if (baseOSRMDuration !== null) {
        displaySeconds = Math.max(0, Math.round(baseOSRMDuration * ratio));
      }
    } else {
      displayDist = currentDist;
      displaySeconds = Math.round(currentDist * 90); // 40 km/h fallback
    }
    
    setText('distDisplay', displayDist.toFixed(1));
    setText('timeDisplay', formatTime(displaySeconds));
  } else {
    setText('distDisplay', totalDistance.toFixed(1));
    setText('timeDisplay', '--');
  }
}

// ===== RIDERS UI =====
function updateRidersUI(riders) {
  const online = riders.filter(r => r.online !== false);
  setText('ridersCountChip', online.length);
  setText('ridersPanelCount', `(${online.length})`);
  setText('detailRiders', online.length);

  const sorted = [...riders].sort((a, b) =>
    a.id === session.riderId ? -1 : b.id === session.riderId ? 1 : 0);

  // Bottom panel preview (first 2)
  const preview = document.getElementById('riderPreviewList');
  if (preview) {
    preview.innerHTML = sorted.slice(0, 2).map(r => {
      const isMe = r.id === session.riderId;
      let dist = '';
      if (!isMe && lastLat && r.lat)
        dist = `${calcDistance(lastLat, lastLng, r.lat, r.lng).toFixed(1)} km`;
      return `
        <div class="rider-preview-item">
          <div class="rider-avatar" style="background:${r.color || '#888'}">${getInitials(r.name || '?')}</div>
          <div class="rider-preview-name">${r.name}${isMe ? ' (You)' : ''}</div>
          ${r.isHost || isMe ? '<span class="rider-leader-badge">Leader</span>' : ''}
          ${dist ? `<span class="rider-dist-text">${dist}</span>` : ''}
          <div class="rider-online-dot" style="background:${r.online !== false ? '#22C55E' : '#ccc'}"></div>
        </div>`;
    }).join('');
  }

  // Full riders panel
  const panelList = document.getElementById('ridersPanelList');
  if (panelList) {
    panelList.innerHTML = sorted.map(r => {
      const isMe = r.id === session.riderId;
      let distText = isMe ? 'You' : 'Calculating…';
      let warn = false;
      if (!isMe && lastLat && r.lat) {
        const d = calcDistance(lastLat, lastLng, r.lat, r.lng);
        distText = `${d.toFixed(1)} km from group`;
        warn = d > 2;
      }
      
      const hasEmergency = r.bloodGroup || r.contact || r.email;
      let emergencyHtml = '';
      if (hasEmergency) {
        emergencyHtml = `
          <div class="riders-panel-emergency" style="font-size: 0.72rem; color: #6b7280; display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; padding-left: 46px;">
            ${r.bloodGroup ? `<span style="background: rgba(239,68,68,0.08); color: #EF4444; font-weight: 700; padding: 2px 6px; border-radius: 4px;">🩸 ${r.bloodGroup}</span>` : ''}
            ${r.contact ? `<span style="background: #F3F4F6; padding: 2px 6px; border-radius: 4px;">📞 <a href="tel:${r.contact}" style="color: inherit; text-decoration: none;">${r.contact}</a></span>` : ''}
            ${r.email ? `<span style="background: #F3F4F6; padding: 2px 6px; border-radius: 4px; white-space: nowrap; text-overflow: ellipsis; overflow: hidden; max-width: 130px;">✉️ ${r.email}</span>` : ''}
          </div>
        `;
      }

      return `
        <div class="riders-panel-item" onclick="window.focusRider(${r.lng || 0},${r.lat || 0})" style="flex-direction: column; align-items: stretch; gap: 4px;">
          <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
            <div class="riders-panel-avatar" style="background:${r.color || '#888'}">${getInitials(r.name || '?')}</div>
            <div class="riders-panel-info" style="flex: 1; margin-left: 12px;">
              <div class="riders-panel-name">${r.name}${isMe ? ' (You)' : ''}
                ${r.isHost || isMe ? '<span class="riders-panel-badge">Leader</span>' : ''}</div>
              <div class="riders-panel-dist${warn ? ' warning' : ''}">${distText}</div>
            </div>
            ${warn ? '<span style="color:#EF4444;font-size:0.9rem;margin-right:8px;">⚠</span>' : ''}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M9 6l6 6-6 6" stroke="#ABABAB" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          ${emergencyHtml}
        </div>`;
    }).join('');
  }
}

// ===== OVERLAY UTILS =====
const openOverlay = (pid, bid) => {
  const p = document.getElementById(pid), b = document.getElementById(bid);
  if (p) { p.style.display = 'flex'; p.style.flexDirection = 'column'; }
  if (b) b.style.display = 'block';
};
const closeOverlay = (pid, bid) => {
  const p = document.getElementById(pid), b = document.getElementById(bid);
  if (p) p.style.display = 'none';
  if (b) b.style.display = 'none';
};

// ===== UI HANDLERS =====
function setupUIHandlers() {

  // Re-center map on my location
  document.getElementById('myLocationBtn')?.addEventListener('click', () => {
    if (lastLat && map) {
      isMapCentered = true;
      map.flyTo({ center: [lastLng, lastLat], zoom: 16, pitch: 40, duration: 800 });
    }
  });

  // Cycle through map styles
  const styleOrder = ['outdoor', 'streets', 'satellite', 'dark'];
  const styleLabels = { outdoor: '🏔 Outdoor', streets: '🗺 Streets', satellite: '🛰 Satellite', dark: '🌙 Dark' };
  let styleIndex = 0;
  document.getElementById('layerBtn')?.addEventListener('click', () => {
    styleIndex = (styleIndex + 1) % styleOrder.length;
    currentStyleKey = styleOrder[styleIndex];
    map.setStyle(MAP_STYLES[currentStyleKey]);
    showToast(styleLabels[currentStyleKey]);
  });

  // ⋮ Dropdown menu
  const dropdown = document.getElementById('dropdownMenu');
  document.getElementById('menuToggleBtn')?.addEventListener('click', e => {
    e.stopPropagation(); dropdown?.classList.toggle('open');
  });
  document.addEventListener('click', e => {
    const toggleBtn = document.getElementById('menuToggleBtn');
    if (!dropdown?.contains(e.target) && !toggleBtn?.contains(e.target)) {
      dropdown?.classList.remove('open');
    }
  });

  // View Riders from menu
  document.getElementById('viewRidersMenuBtn')?.addEventListener('click', () => {
    dropdown?.classList.remove('open');
    openOverlay('ridersPanel', 'ridersPanelBackdrop');
    reverseGeocode();
  });

  // Map Style cycle from menu
  const menuStyleOrder = ['outdoor', 'streets', 'satellite', 'dark'];
  const menuStyleEmoji  = { outdoor: '🏔', streets: '🗺', satellite: '🛰', dark: '🌙' };
  const menuStyleNames  = { outdoor: 'Outdoor', streets: 'Streets', satellite: 'Satellite', dark: 'Dark' };
  let menuStyleIndex = 0;
  function updateMapStyleLabel() {
    const lbl = document.getElementById('mapStyleMenuLabel');
    const key = menuStyleOrder[menuStyleIndex];
    if (lbl) lbl.textContent = `Style: ${menuStyleEmoji[key]} ${menuStyleNames[key]}`;
  }
  updateMapStyleLabel();
  document.getElementById('mapStyleMenuBtn')?.addEventListener('click', () => {
    menuStyleIndex = (menuStyleIndex + 1) % menuStyleOrder.length;
    currentStyleKey = menuStyleOrder[menuStyleIndex];
    if (map) map.setStyle(MAP_STYLES[currentStyleKey]);
    showToast(`${menuStyleEmoji[currentStyleKey]} ${menuStyleNames[currentStyleKey]} map`);
    updateMapStyleLabel();
    dropdown?.classList.remove('open');
  });

  // My Profile — show rider profile info as a toast
  document.getElementById('myProfileMenuBtn')?.addEventListener('click', () => {
    dropdown?.classList.remove('open');
    try {
      const profileStr = localStorage.getItem('rydr_rider_profile');
      const profile = profileStr ? JSON.parse(profileStr) : null;
      if (profile) {
        const name = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
        const blood = profile.bloodGroup ? ` · 🩸 ${profile.bloodGroup}` : '';
        showToast(`👤 ${name}${blood}`, '');
      } else {
        showToast('No profile set. Create one from the home page.', '');
      }
    } catch { showToast('Could not load profile.', 'error'); }
  });

  // Logout
  document.getElementById('logoutMenuBtn')?.addEventListener('click', () => {
    dropdown?.classList.remove('open');
    const confirmed = window.confirm('Logout? Your current ride session will end and you will be taken back to the home screen.');
    if (!confirmed) return;
    if (timerInterval) clearInterval(timerInterval);
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    if (unsubRiders) unsubRiders();
    if (unsubRide) unsubRide();
    try {
      updateDoc(doc(db, 'rides', rideId, 'riders', session.riderId), { online: false }).catch(() => {});
    } catch {}
    sessionStorage.clear();
    localStorage.removeItem('rydr_rider');
    localStorage.removeItem('ridesync_rider');
    localStorage.removeItem('rydr_rider_profile');
    showToast('Logged out 👋', 'success');
    setTimeout(() => { window.location.href = 'index.html'; }, 1200);
  });


  // Ride Details
  document.getElementById('openRideDetailsBtn')?.addEventListener('click', () => {
    dropdown?.classList.remove('open');
    openOverlay('rideDetailsPanel', 'rideDetailsBackdrop');
  });
  document.getElementById('closeRideDetails')?.addEventListener('click', () => closeOverlay('rideDetailsPanel', 'rideDetailsBackdrop'));
  // Removed backdrop click listener to keep screen blurred on screen tap
  // document.getElementById('rideDetailsBackdrop')?.addEventListener('click', () => closeOverlay('rideDetailsPanel', 'rideDetailsBackdrop'));
  document.getElementById('detailCopyIdBtn')?.addEventListener('click', () =>
    navigator.clipboard.writeText(rideId).then(() => showToast('Ride ID copied!', 'success')));

  // Riders Panel
  document.getElementById('viewAllBtn')?.addEventListener('click', () => {
    openOverlay('ridersPanel', 'ridersPanelBackdrop');
    reverseGeocode();
  });
  document.getElementById('closeRidersPanel')?.addEventListener('click', () => closeOverlay('ridersPanel', 'ridersPanelBackdrop'));
  // Removed backdrop click listener to keep screen blurred on screen tap
  // document.getElementById('ridersPanelBackdrop')?.addEventListener('click', () => closeOverlay('ridersPanel', 'ridersPanelBackdrop'));

  // Alert
  document.getElementById('closeAlert')?.addEventListener('click', () => {
    document.getElementById('riderAlert').style.display = 'none';
    alertDismissed = true;
    setTimeout(() => { alertDismissed = false; }, 60000);
  });
  document.getElementById('viewAlertRiderBtn')?.addEventListener('click', () => {
    document.getElementById('riderAlert').style.display = 'none';
    openOverlay('ridersPanel', 'ridersPanelBackdrop');
  });

  // Share
  const openShare = () => {
    const link = `${location.origin}${location.pathname.replace('ride.html', 'join-ride.html')}?rideId=${encodeURIComponent(rideId)}`;
    const input = document.getElementById('shareLinkInput');
    if (input) input.value = link;
    openOverlay('shareModal', 'shareBackdrop');
  };
  document.getElementById('sharePanelBtn')?.addEventListener('click', openShare);
  document.getElementById('shareFromMenuBtn')?.addEventListener('click', () => { dropdown?.classList.remove('open'); openShare(); });
  document.getElementById('closeShareModal')?.addEventListener('click', () => closeOverlay('shareModal', 'shareBackdrop'));
  // Removed backdrop click listener to keep screen blurred on screen tap
  // document.getElementById('shareBackdrop')?.addEventListener('click', () => closeOverlay('shareModal', 'shareBackdrop'));
  document.getElementById('copyShareLinkBtn')?.addEventListener('click', () => {
    const v = document.getElementById('shareLinkInput')?.value;
    if (v) navigator.clipboard.writeText(v).then(() => showToast('Link copied!', 'success'));
  });
  document.getElementById('shareWhatsapp')?.addEventListener('click', () => {
    const link = document.getElementById('shareLinkInput')?.value;
    if (link) window.open(`https://wa.me/?text=${encodeURIComponent('Join my Rydr ride! 🏍️\n' + link)}`);
  });
  document.getElementById('shareNative')?.addEventListener('click', async () => {
    const link = document.getElementById('shareLinkInput')?.value;
    if (!link) return;
    if (navigator.share) { try { await navigator.share({ title: 'Join my Rydr!', url: link }); } catch { } }
    else navigator.clipboard.writeText(link).then(() => showToast('Link copied!', 'success'));
  });

  // End Ride
  const openEnd = () => {
    setText('endDistVal', totalDistance.toFixed(1));
    setText('endTimeVal', formatTime(elapsedSeconds));
    setText('endSpeedVal', topSpeed);
    openOverlay('endConfirmModal', 'endConfirmBackdrop');
  };
  document.getElementById('endRidePanelBtn')?.addEventListener('click', openEnd);
  document.getElementById('endRideMenuBtn')?.addEventListener('click', () => { dropdown?.classList.remove('open'); openEnd(); });
  document.getElementById('endRideDetailsBtn')?.addEventListener('click', () => { closeOverlay('rideDetailsPanel', 'rideDetailsBackdrop'); openEnd(); });
  document.getElementById('cancelEndBtn')?.addEventListener('click', () => closeOverlay('endConfirmModal', 'endConfirmBackdrop'));
  // Removed backdrop click listener to keep screen blurred on screen tap
  // document.getElementById('endConfirmBackdrop')?.addEventListener('click', () => closeOverlay('endConfirmModal', 'endConfirmBackdrop'));
  document.getElementById('confirmEndBtn')?.addEventListener('click', endRide);

  // Route toggle
  document.getElementById('routeToggleBtn')?.addEventListener('click', () => {
    if (!map) return;
    const hasRoute = map.getLayer('rydr-route-line-0');
    if (hasRoute) {
      clearRouteLayers();
      routeDrawn = false;
    } else {
      let lat = lastLat;
      let lng = lastLng;
      if (!lat && lastRouteUpdateLat) {
        lat = lastRouteUpdateLat;
        lng = lastRouteUpdateLng;
      }
      if (lat) drawRoute(lat, lng);
    }
  });
}

// ===== REVERSE GEOCODE (MapTiler) =====
async function reverseGeocode() {
  const activeRiders = currentRiders.filter(r => r.online !== false && r.lat && r.lng);
  let targetLat = lastLat;
  let targetLng = lastLng;

  if (activeRiders.length > 0) {
    let sumLat = 0, sumLng = 0;
    activeRiders.forEach(r => {
      sumLat += r.lat;
      sumLng += r.lng;
    });
    targetLat = sumLat / activeRiders.length;
    targetLng = sumLng / activeRiders.length;
  }

  if (!targetLat) return;
  try {
    const url = `https://api.maptiler.com/geocoding/${targetLng},${targetLat}.json?key=${MAPTILER_KEY}&language=en`;
    const res = await fetch(url);
    const data = await res.json();
    const name = data.features?.[0]?.place_name?.split(',').slice(0, 2).join(',') || 'Unknown';
    setText('groupCenterLoc', `Near ${name}`);
  } catch { }
}

// ===== END RIDE =====
async function endRide() {
  try {
    if (timerInterval) clearInterval(timerInterval);
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    if (unsubRiders) unsubRiders();
    if (unsubRide) unsubRide();
    await updateDoc(doc(db, 'rides', rideId, 'riders', session.riderId), { online: false });
    sessionStorage.clear();
    localStorage.removeItem('rydr_rider');
    localStorage.removeItem('ridesync_rider');
    showToast('Ride ended. Great ride! 🏁', 'success');
    setTimeout(() => { window.location.href = 'index.html'; }, 2000);
  } catch { window.location.href = 'index.html'; }
}

// ===== GLOBAL: focus rider from panel tap =====
window.focusRider = function (lng, lat) {
  if (lng && lat && map) {
    isMapCentered = false;
    map.flyTo({ center: [lng, lat], zoom: 16, pitch: 30, duration: 900 });
  }
};
