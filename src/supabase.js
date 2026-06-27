import { createClient } from '@supabase/supabase-js';

// ===== SUPABASE CLIENT CONFIGURATION =====
// Synced with your active Supabase Project emcodhbwlxrjrspqkodd
export const SUPABASE_URL = "https://emcodhbwlxrjrspqkodd.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtY29kaGJ3bHhyanJzcHFrb2RkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MDgwMTksImV4cCI6MjA5Nzk4NDAxOX0.1IhIQB65SB18nSzZ3DyMUfYBzn7LZBo_46o-kDXYnfw";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== MAPTILER CONFIG =====
export const MAPTILER_KEY = 'oyECSNKEJJEgtZCoaFWS';

// ===== GOOGLE MAPS CONFIG =====
export const GOOGLE_MAPS_KEY = 'AIzaSyBUXlVjNm313KZQGeDid5TUZERHHBt6tWU';

export const MAP_STYLES = {
  outdoor:   `https://api.maptiler.com/maps/outdoor-v2/style.json?key=${MAPTILER_KEY}`,
  streets:   `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`,
  satellite: `https://api.maptiler.com/maps/satellite/style.json?key=${MAPTILER_KEY}`,
  dark:      `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${MAPTILER_KEY}`,
};
