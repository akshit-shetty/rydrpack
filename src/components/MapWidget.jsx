import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { MAP_STYLES } from '../supabase';

export default function MapWidget({
  userCoords,
  userColor,
  userName,
  userHeading,
  riders = [],
  destination,
  userTrail = [],
  mapStyle = 'outdoor',
  allRoutes = [],
  selectedRouteIndex = 0,
  onSelectRoute,
  onUpdateDestination,
  isMapCentered,
  setIsMapCentered,
  isRideStarted = false,
  currentRiderId = null,
  showTraffic = false,
  tomtomKey
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({}); // riderId -> Marker instance
  const destMarkerRef = useRef(null);
  const styleUrl = MAP_STYLES[mapStyle] || MAP_STYLES.outdoor;

  // ─── Mutable refs for draw functions ────────────────────────────────────────
  // This is the key fix: map.on('load') / map.on('styledata') are set up ONCE
  // in the init useEffect. Those closures would permanently capture the empty
  // allRoutes/selectedRouteIndex from the first render. By calling through
  // these refs, the event listeners always invoke the LATEST version of the
  // draw functions with the LATEST props.
  const drawRouteLayersRef = useRef(null);
  const drawTrailLayersRef = useRef(null);

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
            'line-width': 3,
            'line-opacity': 0.6
          }
        });
      }
    }
  };

  // Draw Routes
  const drawRouteLayers = (map) => {
    if (!map || !map.isStyleLoaded() || !allRoutes || !allRoutes.length) return;

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
      const geojson = { type: 'Feature', geometry: route.geometry, properties: {} };
      const isSelected = idx === selectedRouteIndex;

      if (map.getSource(srcId)) {
        map.getSource(srcId).setData(geojson);
      } else {
        map.addSource(srcId, { type: 'geojson', data: geojson });
      }

      // White outline casing for contrast
      if (map.getLayer(casingLyr)) {
        map.setLayoutProperty(casingLyr, 'visibility', 'visible');
        map.setPaintProperty(casingLyr, 'line-width', isSelected ? 11 : 7.5);
        map.setPaintProperty(casingLyr, 'line-opacity', isSelected ? 0.9 : 0.3);
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

      // Route lines
      if (map.getLayer(lineLyr)) {
        map.setLayoutProperty(lineLyr, 'visibility', 'visible');
        map.setPaintProperty(lineLyr, 'line-color', isSelected ? '#3B82F6' : '#71717A');
        map.setPaintProperty(lineLyr, 'line-width', isSelected ? 7 : 4.5);
        map.setPaintProperty(lineLyr, 'line-opacity', isSelected ? 0.55 : 0.7);
      } else {
        map.addLayer({
          id: lineLyr,
          type: 'line',
          source: srcId,
          layout: { 'line-cap': 'round', 'line-join': 'round', 'visibility': 'visible' },
          paint: {
            'line-color': isSelected ? '#3B82F6' : '#71717A',
            'line-width': isSelected ? 7 : 4.5,
            'line-opacity': isSelected ? 0.55 : 0.7
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
          if (onSelectRoute) onSelectRoute(idx);
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
    const selLine   = `rydr-route-line-${selectedRouteIndex}`;
    const selClick  = `rydr-route-click-${selectedRouteIndex}`;
    if (map.getLayer(selCasing)) map.moveLayer(selCasing);
    if (map.getLayer(selLine))   map.moveLayer(selLine);
    if (map.getLayer(selClick))  map.moveLayer(selClick);

    // Hide extra layers
    for (let idx = allRoutes.length; idx < 10; idx++) {
      const casingLyr = `rydr-route-casing-${idx}`;
      const lineLyr   = `rydr-route-line-${idx}`;
      const clickLyr  = `rydr-route-click-${idx}`;
      if (map.getLayer(casingLyr)) map.setLayoutProperty(casingLyr, 'visibility', 'none');
      if (map.getLayer(lineLyr))   map.setLayoutProperty(lineLyr, 'visibility', 'none');
      if (map.getLayer(clickLyr))  map.setLayoutProperty(clickLyr, 'visibility', 'none');
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

    map.on('style.load', () => {
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
    if (map) map.setStyle(styleUrl);
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
          const size = 32;
          const wrap = document.createElement('div');
          wrap.className = 'gmaps-nav-chevron';
          wrap.style.cssText = `
            position:relative; width:${size}px; height:${size}px; cursor:pointer;
            display:flex; align-items:center; justify-content:center;
          `;
          const heading = initialHeading || 0;
          wrap.innerHTML = `
            <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"
              style="filter: drop-shadow(0px 3px 5px rgba(0,0,0,0.45));"
              transform="rotate(${heading})"
            >
              <path d="M12 2L3 22L12 17.5L21 22L12 2Z" fill="#3B82F6" stroke="#FFFFFF" stroke-width="2.5" stroke-linejoin="round"/>
            </svg>
          `;
          return wrap;
        } else {
          const size = 20;
          const wrap = document.createElement('div');
          wrap.className = 'gmaps-blue-dot';
          wrap.style.cssText = `
            position:relative; width:${size}px; height:${size}px; cursor:pointer;
            display:flex; align-items:center; justify-content:center;
          `;
          const dot = document.createElement('div');
          dot.style.cssText = `
            width:${size}px; height:${size}px;
            background:#3B82F6; border-radius:50%;
            border:2.5px solid white;
            box-shadow: 0 0 8px rgba(59,130,246,0.6); z-index:2;
          `;
          const pulse = document.createElement('div');
          pulse.style.cssText = `
            position:absolute; width:38px; height:38px;
            background:rgba(59,130,246,0.25); border-radius:50%;
            animation:pulse-ring 2s infinite; z-index:1; pointer-events:none;
          `;
          wrap.appendChild(pulse);
          wrap.appendChild(dot);
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

    riders.forEach(r => {
      if (!r.lat || !r.lng || !r.online) return;
      activeRiderIds.add(r.id);

      const isMe = r.id === currentRiderId;
      const expectedType = isMe ? (isRideStarted ? 'chevron' : 'dot') : 'standard';

      let existingMarker = markersRef.current[r.id];
      if (existingMarker && existingMarker.markerType !== expectedType) {
        existingMarker.remove();
        delete markersRef.current[r.id];
        existingMarker = null;
      }

      const currentHeading = r.heading || userHeading || 0;

      if (existingMarker) {
        existingMarker.setLngLat([r.lng, r.lat]);
        if (isMe && isRideStarted) {
          const el = existingMarker.getElement();
          if (el) {
            const svg = el.querySelector('svg');
            if (svg) svg.setAttribute('transform', `rotate(${currentHeading})`);
          }
        }
      } else {
        const el = createMarkerEl(r.name, r.color || '#6366F1', isMe, currentHeading);
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
  }, [riders, isRideStarted, currentRiderId, userHeading]);

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

  // Trigger route rendering whenever routes or selection changes.
  // drawRouteLayersRef.current always holds the latest closure with fresh props.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (map.isStyleLoaded()) {
      drawRouteLayersRef.current(map);
    } else {
      map.once('load', () => drawRouteLayersRef.current(map));
    }
  }, [allRoutes, selectedRouteIndex]);

  // Toggle Traffic Layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const lyrId = 'google-traffic';
    const srcId = 'google-traffic-src';

    if (showTraffic) {
      if (!map.getSource(srcId)) {
        map.addSource(srcId, {
          type: 'raster',
          tiles: ['https://mt1.google.com/vt?lyrs=traffic&x={x}&y={y}&z={z}'],
          tileSize: 256
        });
      }
      if (!map.getLayer(lyrId)) {
        map.addLayer({
          id: lyrId,
          type: 'raster',
          source: srcId,
          paint: { 'raster-opacity': 0.8 }
        }, map.getLayer('waterway') ? 'waterway' : undefined);
      }
    } else {
      if (map.getLayer(lyrId)) map.removeLayer(lyrId);
      if (map.getSource(srcId)) map.removeSource(srcId);
    }
  }, [showTraffic]);

  return <div ref={mapContainerRef} style={{ width: '100%', height: '100%', borderRadius: 'inherit' }} />;
}
