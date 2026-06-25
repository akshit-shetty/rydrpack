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
  isMapCentered,
  setIsMapCentered
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({}); // riderId -> Marker instance
  const destMarkerRef = useRef(null);
  const styleUrl = MAP_STYLES[mapStyle] || MAP_STYLES.outdoor;

  // Init Map
  useEffect(() => {
    const initLat = userCoords?.lat || 19.0760; // Mumbai fallback
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

    map.on('load', () => {
      // Map loaded, render trail and routes
      drawTrailLayers(map);
      drawRouteLayers(map);
    });

    map.on('styledata', () => {
      // Re-add layers when style changes
      drawTrailLayers(map);
      drawRouteLayers(map);
    });

    return () => {
      // Clean up markers
      Object.values(markersRef.current).forEach(m => m.remove());
      markersRef.current = {};
      if (destMarkerRef.current) {
        destMarkerRef.current.remove();
        destMarkerRef.current = null;
      }
      map.remove();
      mapRef.current = null;
    };
  }, []);

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
        duration: 600
      });
    }
  }, [userCoords, userHeading, isMapCentered]);

  // Update User & Riders Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Helper to get initials
    const getInitials = (name) => {
      if (!name) return 'U';
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      return name.slice(0, 2).toUpperCase();
    };

    // Helper to create HTML marker element
    const createMarkerEl = (name, color, isMe) => {
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

    // Upsert other riders
    riders.forEach(r => {
      if (!r.lat || !r.lng || !r.online) return;
      activeRiderIds.add(r.id);

      if (markersRef.current[r.id]) {
        markersRef.current[r.id].setLngLat([r.lng, r.lat]);
      } else {
        const el = createMarkerEl(r.name, r.color || '#6366F1', false);
        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([r.lng, r.lat])
          .addTo(map);

        el.addEventListener('click', () => {
          map.flyTo({ center: [r.lng, r.lat], zoom: 16 });
          if (setIsMapCentered) setIsMapCentered(false);
        });

        markersRef.current[r.id] = marker;
      }
    });

    // Clean up offline or removed riders
    Object.keys(markersRef.current).forEach(id => {
      if (!activeRiderIds.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });
  }, [riders]);

  // Destination Marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (destMarkerRef.current) {
      destMarkerRef.current.remove();
      destMarkerRef.current = null;
    }

    if (destination && destination.lat && destination.lng) {
      const el = document.createElement('div');
      el.style.cssText = 'font-size:2rem; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.35)); cursor:pointer;';
      el.textContent = '🏁';

      destMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([destination.lng, destination.lat])
        .setPopup(new maplibregl.Popup({ offset: 28 })
          .setHTML(`<b style="font-family:Inter,sans-serif">${destination.name}</b><br><small style="color:#6B7280">Destination</small>`))
        .addTo(map);
    }
  }, [destination]);

  // Draw Trails
  const drawTrailLayers = (map) => {
    if (!map || !map.isStyleLoaded()) return;

    // We can render user's trail
    if (userTrail.length >= 2) {
      const srcId = 'user-trail';
      const lyrId = 'user-trail-layer';
      const geojson = { type: 'Feature', geometry: { type: 'LineString', coordinates: userTrail } };

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
            'line-color': userColor || '#F97316',
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
      const geojson = { type: 'Feature', geometry: route.geometry };
      const isSelected = idx === selectedRouteIndex;

      if (map.getSource(srcId)) {
        map.getSource(srcId).setData(geojson);
      } else {
        map.addSource(srcId, { type: 'geojson', data: geojson });
      }

      // White outline casing for contrast
      if (map.getLayer(casingLyr)) {
        map.setLayoutProperty(casingLyr, 'visibility', 'visible');
        map.setPaintProperty(casingLyr, 'line-width', isSelected ? 9 : 6.5);
        map.setPaintProperty(casingLyr, 'line-opacity', isSelected ? 0.85 : 0.35);
      } else {
        map.addLayer({
          id: casingLyr,
          type: 'line',
          source: srcId,
          layout: { 'line-cap': 'round', 'line-join': 'round', 'visibility': 'visible' },
          paint: {
            'line-color': '#FFFFFF',
            'line-width': isSelected ? 9 : 6.5,
            'line-opacity': isSelected ? 0.85 : 0.35
          }
        });
      }

      // Route lines
      if (map.getLayer(lineLyr)) {
        map.setLayoutProperty(lineLyr, 'visibility', 'visible');
        map.setPaintProperty(lineLyr, 'line-color', isSelected ? '#F97316' : '#71717A');
        map.setPaintProperty(lineLyr, 'line-width', isSelected ? 6 : 3.5);
        map.setPaintProperty(lineLyr, 'line-opacity', isSelected ? 1 : 0.65);
      } else {
        map.addLayer({
          id: lineLyr,
          type: 'line',
          source: srcId,
          layout: { 'line-cap': 'round', 'line-join': 'round', 'visibility': 'visible' },
          paint: {
            'line-color': isSelected ? '#F97316' : '#71717A',
            'line-width': isSelected ? 6 : 3.5,
            'line-opacity': isSelected ? 1 : 0.65
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

  // Trigger trail and route updates when data changes
  useEffect(() => {
    const map = mapRef.current;
    if (map) {
      drawTrailLayers(map);
    }
  }, [userTrail]);

  useEffect(() => {
    const map = mapRef.current;
    if (map) {
      drawRouteLayers(map);
    }
  }, [allRoutes, selectedRouteIndex]);

  return <div ref={mapContainerRef} style={{ width: '100%', height: '100%', borderRadius: 'inherit' }} />;
}
