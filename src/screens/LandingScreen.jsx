import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Navigation2, 
  ChevronRight, 
  Radio, 
  Map, 
  Shield, 
  AlertTriangle,
  UserPlus
} from 'lucide-react';

export default function LandingScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    // If profile already exists, auto-redirect to dashboard
    try {
      const profileStr = localStorage.getItem('rydr_rider_profile');
      if (profileStr) {
        const profile = JSON.parse(profileStr);
        if (profile.firstName && profile.lastName) {
          navigate('/dashboard');
        }
      }
    } catch (e) {
      console.warn('No existing profile found:', e);
    }
  }, [navigate]);

  return (
    <div 
      className="page relative flex flex-col justify-between" 
      style={{ 
        background: '#070709', 
        overflowY: 'auto',
        minHeight: '100dvh',
        padding: '32px 24px'
      }}
    >
      {/* Premium Top Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[350px] h-[350px] bg-gradient-to-b from-orange-500/10 to-transparent rounded-full blur-[100px] pointer-events-none z-0" />
      
      {/* 1. HEADER / NAVBAR */}
      <header className="relative flex justify-between items-center w-full z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Navigation2 className="text-white fill-white rotate-45 w-3.5 h-3.5 translate-y-[-0.5px] translate-x-[-0.5px]" />
          </div>
          <span className="font-black text-base tracking-tight text-white font-['Outfit']">RydrPack</span>
        </div>
        
        <button 
          onClick={() => navigate('/login')}
          className="text-xs font-bold text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg border border-white/5 bg-white/2 hover:bg-white/5 transition-all"
        >
          Sign In
        </button>
      </header>

      {/* 2. HERO INTRO */}
      <main className="relative flex flex-col items-center text-center mt-6 z-10 w-full">
        {/* Pulsing Active Tag */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-1.5 bg-orange-500/8 text-orange-400 border border-orange-500/15 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider mb-5"
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-orange-500"></span>
          </span>
          <span>Live Cohort Sync</span>
        </motion.div>

        {/* Title */}
        <motion.h1 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="font-['Outfit'] text-[2.5rem] leading-[1.05] font-black text-white tracking-tight uppercase"
        >
          Ride Together.<br/>
          <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">Stay Together.</span>
        </motion.h1>

        {/* Description */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-zinc-400 text-xs mt-3.5 max-w-[280px] leading-relaxed font-medium"
        >
          The ultimate real-time navigation and safety assistant designed specifically for group motorcycle rides.
        </motion.p>
      </main>

      {/* 3. HIGH-FIDELITY MAP HUD WIDGET (The Focal Point) */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.3 }}
        className="relative w-full aspect-[4/3] bg-zinc-950/80 border border-white/5 rounded-2xl overflow-hidden shadow-xl shadow-black/60 my-6 z-10"
      >
        {/* Animated Map Grid */}
        <div 
          className="absolute inset-0 bg-[#08080a]" 
          style={{
            backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px)',
            backgroundSize: '18px 18px'
          }}
        >
          {/* Neon Route Vector */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 350 220">
            <path 
              d="M 40 160 C 100 160, 90 60, 170 60 C 250 60, 230 140, 310 140" 
              fill="none" 
              stroke="#F97316" 
              strokeWidth="4.5" 
              strokeLinecap="round"
              className="drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]"
            />
            <path 
              d="M 40 160 C 100 160, 90 60, 170 60 C 250 60, 230 140, 310 140" 
              fill="none" 
              stroke="#ffffff" 
              strokeWidth="1.2" 
              strokeLinecap="round"
              className="opacity-40"
            />
          </svg>

          {/* Map Nodes (Pulsing Bikers) */}
          {/* Rider 1: Lead */}
          <div className="absolute top-[52px] left-[170px] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
            <span className="text-[8px] font-extrabold bg-orange-500 text-black px-1 py-0.5 rounded shadow-md uppercase tracking-wider mb-1">
              Lead
            </span>
            <span className="w-3.5 h-3.5 bg-orange-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center relative">
              <span className="absolute w-7 h-7 rounded-full bg-orange-500/40 animate-ping" />
            </span>
          </div>

          {/* Rider 2: Safe */}
          <div className="absolute top-[152px] left-[40px] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
            <span className="w-3 h-3 bg-emerald-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center relative">
              <span className="absolute w-5 h-5 rounded-full bg-emerald-500/30 animate-pulse" />
            </span>
          </div>

          {/* Rider 3: Lagging Alert */}
          <div className="absolute top-[132px] left-[295px] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
            <span className="text-[7px] font-extrabold bg-red-500 text-white px-1 py-0.5 rounded shadow-md uppercase tracking-wider mb-1 animate-bounce">
              Lagging
            </span>
            <span className="w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center relative">
              <span className="absolute w-6 h-6 rounded-full bg-red-500/40 animate-ping" style={{ animationDuration: '1.5s' }} />
            </span>
          </div>
        </div>

        {/* HUD overlay dashboard (Clean Glassmorphism) */}
        <div className="absolute bottom-3 left-3 right-3 bg-zinc-950/80 backdrop-blur-md border border-white/5 rounded-xl p-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-bold text-zinc-300 tracking-wide uppercase">PACK STRETCHED</span>
          </div>
          <div className="flex gap-4">
            <div className="flex flex-col text-right">
              <span className="text-[7px] font-bold text-zinc-500 uppercase tracking-widest">Speed</span>
              <span className="text-[11px] font-extrabold text-orange-400 font-mono">82 km/h</span>
            </div>
            <div className="flex flex-col text-right border-l border-white/5 pl-3">
              <span className="text-[7px] font-bold text-zinc-500 uppercase tracking-widest">Active</span>
              <span className="text-[11px] font-extrabold text-zinc-200">5 / 5</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 4. CLEAN MINI-FEATURES ROW */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="grid grid-cols-3 gap-3 w-full text-center z-10"
      >
        <div className="flex flex-col items-center gap-1.5 bg-zinc-900/30 border border-white/5 rounded-xl py-2.5 px-2">
          <Map className="w-4 h-4 text-orange-500" />
          <span className="text-[9px] font-extrabold text-white uppercase tracking-wider">Live GPS</span>
        </div>
        <div className="flex flex-col items-center gap-1.5 bg-zinc-900/30 border border-white/5 rounded-xl py-2.5 px-2">
          <Shield className="w-4 h-4 text-orange-500" />
          <span className="text-[9px] font-extrabold text-white uppercase tracking-wider">Proximity</span>
        </div>
        <div className="flex flex-col items-center gap-1.5 bg-zinc-900/30 border border-white/5 rounded-xl py-2.5 px-2">
          <AlertTriangle className="w-4 h-4 text-orange-500" />
          <span className="text-[9px] font-extrabold text-white uppercase tracking-wider">SOS Radar</span>
        </div>
      </motion.div>

      {/* 5. PRIMARY CTA CALL-TO-ACTIONS */}
      <footer className="relative flex flex-col gap-3 w-full mt-6 z-10">
        <motion.button 
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/onboarding')} 
          className="w-full py-4 px-6 bg-gradient-to-r from-orange-500 to-red-600 text-white font-black rounded-xl shadow-lg shadow-orange-500/10 hover:shadow-orange-500/20 active:scale-[0.98] transition-all text-xs font-['Outfit'] uppercase tracking-wider flex items-center justify-center gap-2"
        >
          <UserPlus className="w-3.5 h-3.5" />
          Create Rider Profile
          <ChevronRight className="w-3.5 h-3.5" />
        </motion.button>
        
        <p className="text-[10px] text-zinc-500 text-center font-bold uppercase tracking-widest mt-1">
          RydrPack Cohort HUD v2.0
        </p>
      </footer>
    </div>
  );
}
