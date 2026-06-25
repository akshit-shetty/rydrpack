// ===== HOME.JS — Rydr Landing Page Logic =====
// Navigation is now handled inline in index.html
// This file is kept for future home page logic if needed

export function initHome() {
  // Navigation is handled by inline script in index.html
  // Check for invite link in URL
  const params = new URLSearchParams(window.location.search);
  const rideId = params.get('ride') || params.get('rideId') || params.get('join');
  if (rideId) {
    window.location.href = `join-ride.html?rideId=${encodeURIComponent(rideId)}`;
  }
}
