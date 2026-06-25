import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingScreen from './screens/LandingScreen';
import LoginScreen from './screens/LoginScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import DashboardScreen from './screens/DashboardScreen';
import CreateRideScreen from './screens/CreateRideScreen';
import RideCreatedScreen from './screens/RideCreatedScreen';
import JoinRideScreen from './screens/JoinRideScreen';
import LiveRideScreen from './screens/LiveRideScreen';
import PostRideScreen from './screens/PostRideScreen';
import Toast from './components/Toast';

export default function App() {
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<LandingScreen />} />
          <Route path="/login" element={<LoginScreen onShowToast={showToast} />} />
          <Route path="/onboarding" element={<OnboardingScreen onShowToast={showToast} />} />
          <Route path="/dashboard" element={<DashboardScreen onShowToast={showToast} />} />
          <Route path="/create-ride" element={<CreateRideScreen onShowToast={showToast} />} />
          <Route path="/ride-created" element={<RideCreatedScreen onShowToast={showToast} />} />
          <Route path="/join-ride" element={<JoinRideScreen onShowToast={showToast} />} />
          <Route path="/ride" element={<LiveRideScreen onShowToast={showToast} />} />
          <Route path="/post-ride" element={<PostRideScreen onShowToast={showToast} />} />
        </Routes>
        
        <Toast toast={toast} onClose={() => setToast(null)} />
      </div>
    </Router>
  );
}
