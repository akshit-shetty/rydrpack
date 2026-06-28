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
  outdoor:   `https://api.maptiler.com/maps/outdoor-v2/style.json?key=${MAPTILER_KEY}`,
  streets:   `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`,
  satellite: `https://api.maptiler.com/maps/satellite/style.json?key=${MAPTILER_KEY}`,
  dark:      `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${MAPTILER_KEY}`,
};
