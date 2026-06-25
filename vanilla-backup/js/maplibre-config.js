// ===== MAPLIBRE / MAPTILER CONFIG =====
// MapTiler key for map tiles + geocoding
// Dashboard: https://cloud.maptiler.com/account/keys/
export const MAPTILER_KEY = 'oyECSNKEJJEgtZCoaFWS';

// Map styles (swap by passing to initRide or toggling in UI)
export const MAP_STYLES = {
  outdoor:   `https://api.maptiler.com/maps/outdoor-v2/style.json?key=oyECSNKEJJEgtZCoaFWS`,
  streets:   `https://api.maptiler.com/maps/streets-v2/style.json?key=oyECSNKEJJEgtZCoaFWS`,
  satellite: `https://api.maptiler.com/maps/satellite/style.json?key=oyECSNKEJJEgtZCoaFWS`,
  dark:      `https://api.maptiler.com/maps/dataviz-dark/style.json?key=oyECSNKEJJEgtZCoaFWS`,
};
