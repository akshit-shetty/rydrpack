import { createClient } from '@supabase/supabase-js';

// ===== SUPABASE CLIENT CONFIGURATION =====
// Synced with your active Supabase Project emcodhbwlxrjrspqkodd
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== MAPTILER CONFIG =====
export const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY;

// ===== GOOGLE MAPS CONFIG =====
export const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY;

export const MAP_STYLES = {
  streets: {
    version: 8,
    sources: {
      'google-roads': {
        type: 'raster',
        tiles: [
          'https://mt0.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
          'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
          'https://mt2.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
          'https://mt3.google.com/vt/lyrs=m&x={x}&y={y}&z={z}'
        ],
        tileSize: 256
      }
    },
    layers: [
      {
        id: 'google-roads-layer',
        type: 'raster',
        source: 'google-roads',
        minzoom: 0,
        maxzoom: 22
      }
    ]
  },
  satellite: {
    version: 8,
    sources: {
      'google-hybrid': {
        type: 'raster',
        tiles: [
          'https://mt0.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
          'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
          'https://mt2.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
          'https://mt3.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'
        ],
        tileSize: 256
      }
    },
    layers: [
      {
        id: 'google-hybrid-layer',
        type: 'raster',
        source: 'google-hybrid',
        minzoom: 0,
        maxzoom: 22
      }
    ]
  },
  outdoor: `https://api.maptiler.com/maps/outdoor-v2/style.json?key=${MAPTILER_KEY}`,
  dark:    `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${MAPTILER_KEY}`,
};
