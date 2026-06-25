import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Navigation2, 
  ChevronRight, 
  Map, 
  Shield, 
  AlertTriangle,
  User,
  Radio,
  ArrowUpRight,
  Gauge,
  Compass
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
      className="page relative flex flex-col justify-between overflow-x-hidden" 
      style={{ 
        background: '#09090b', 
        overflowY: 'auto',
        minHeight: '100dvh',
        padding: '24px 20px 32px'
      }}
    >
      {/* Premium Cinematic Background Elements */}
      <div className="absolute top-[-80px] left-[-40px] w-[300px] h-[300px] bg-orange-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-[280px] right-[-40px] w-[260px] h-[260px] bg-red-600/5 rounded-full blur-[90px] pointer-events-none" />
      
      {/* 1. TOP NAVBAR */}
      <header className="relative flex justify-between items-center w-full z-10 py-2">
        <div className="flex items-center gap-2">
          <div className="w-8.5 h-8.5 bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/25">
            <Navigation2 className="text-white fill-white rotate-45 w-4 h-4 translate-y-[-0.5px] translate-x-[-0.5px]" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-sm tracking-tight text-white font-['Outfit'] leading-none">RydrPack</span>
            <span className="text-[7.5px] text-zinc-500 tracking-widest uppercase font-bold mt-0.5">Tactical HUD</span>
          </div>
        </div>
        
        <button 
          onClick={() => navigate('/login')}
          className="text-xs font-bold text-zinc-300 hover:text-white px-3.5 py-1.5 rounded-xl border border-white/5 bg-zinc-900/60 backdrop-blur-md hover:bg-zinc-800 transition-all flex items-center gap-1"
        >
          Sign In
          <ArrowUpRight className="w-3 h-3 text-orange-500" />
        </button>
      </header>

      {/* 2. HERO HEADER SECTION */}
      <main className="relative flex flex-col items-center text-center mt-6 z-10 w-full">
        {/* Pulsing telemetry tag */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 px-3 py-1 rounded-full text-[9px] font-extrabold text-orange-400 tracking-wider uppercase mb-4"
        >
          <Radio className="w-3 h-3 animate-pulse text-orange-500" />
          <span>COHORT STATUS: 4 ACTIVE</span>
        </motion.div>

        {/* Cinematic Title */}
        <motion.h1 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="font-['Outfit'] text-[2.50rem] leading-[1.05] font-black text-white tracking-tight uppercase"
        >
          Ride Together.<br/>
          <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">Stay Together.</span>
        </motion.h1>

        {/* Clean Description */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-zinc-400 text-xs mt-3.5 max-w-[300px] leading-relaxed font-semibold font-['Inter']"
        >
          The ultimate real-time navigation and safety assistant designed specifically for group motorcycle rides.
        </motion.p>
      </main>

      {/* 3. HIGH-FIDELITY SIMULATED COHORT MAP HUD */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.2 }}
        className="relative w-full aspect-[4/3] bg-zinc-950/90 border border-white/5 rounded-2xl overflow-hidden shadow-2xl shadow-black/80 my-5 z-10 flex flex-col justify-between"
      >
        {/* Mock Map Canvas */}
        <div 
          className="absolute inset-0 bg-[#070709] w-full h-full" 
          style={{
            backgroundImage: `
              radial-gradient(rgba(249, 115, 22, 0.03) 1px, transparent 1px),
              radial-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px)
            `,
            backgroundSize: '24px 24px, 12px 12px'
          }}
        >
          {/* Compass & Navigation Ticks */}
          <div className="absolute top-2 left-2 text-[7.5px] font-mono text-zinc-600">37.7749° N, 122.4194° W</div>
          <div className="absolute top-2 right-2 text-[7.5px] font-mono text-zinc-600">GPS ACC: 2.4m</div>
          
          <div className="absolute top-[10%] left-0 right-0 h-[1px] bg-white/5" />
          <div className="absolute bottom-[15%] left-0 right-0 h-[1px] bg-white/5" />
          <div className="absolute left-[15%] top-0 bottom-0 w-[1px] bg-white/5" />
          <div className="absolute right-[15%] top-0 bottom-0 w-[1px] bg-white/5" />

          {/* Styled Neon Path */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 350 220">
            <defs>
              <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ff7b00" />
                <stop offset="50%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#ef4444" />
              </linearGradient>
            </defs>
            {/* Planned Route Casing */}
            <path 
              d="M 30 150 C 90 150, 80 50, 160 50 C 240 50, 220 130, 310 130" 
              fill="none" 
              stroke="url(#glowGrad)" 
              strokeWidth="4" 
              strokeLinecap="round"
              className="drop-shadow-[0_0_6px_rgba(249,115,22,0.5)]"
            />
            {/* Inner line */}
            <path 
              d="M 30 150 C 90 150, 80 50, 160 50 C 240 50, 220 130, 310 130" 
              fill="none" 
              stroke="#ffffff" 
              strokeWidth="1.2" 
              strokeLinecap="round"
              className="opacity-60"
            />
          </svg>

          {/* Map Biker Markers */}
          {/* Lead Rider */}
          <div className="absolute top-[41px] left-[158px] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
            <div className="bg-zinc-950/90 text-orange-400 border border-orange-500/20 text-[7px] font-extrabold px-1 py-0.5 rounded shadow-lg tracking-wider uppercase mb-1">
              Lead: Akshit
            </div>
            <div className="w-4 h-4 bg-orange-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center relative">
              <span className="absolute w-7 h-7 rounded-full bg-orange-500/40 animate-ping" />
              <User className="w-2 h-2 text-white fill-white" />
            </div>
          </div>

          {/* Safe Rider */}
          <div className="absolute top-[141px] left-[30px] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
            <div className="w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center relative">
              <span className="absolute w-5 h-5 rounded-full bg-emerald-500/20 animate-pulse" />
              <User className="w-1.5 h-1.5 text-white fill-white" />
            </div>
          </div>

          {/* Lagging Biker */}
          <div className="absolute top-[121px] left-[295px] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
            <div className="bg-red-500/90 text-white text-[7px] font-black px-1.5 py-0.5 rounded shadow-lg uppercase tracking-wider mb-1 animate-bounce flex items-center gap-0.5">
              <span>Sam: Lagging</span>
            </div>
            <div className="w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center relative">
              <span className="absolute w-6 h-6 rounded-full bg-red-500/45 animate-ping" style={{ animationDuration: '1.2s' }} />
              <User className="w-1.5 h-1.5 text-white fill-white" />
            </div>
          </div>
        </div>

        {/* Header HUD overlay */}
        <div className="relative top-3 left-3 right-3 flex justify-between items-start pointer-events-none z-10">
          <div className="bg-zinc-950/80 backdrop-blur-md border border-white/5 rounded-xl px-2.5 py-1.5 flex items-center gap-1.5">
            <Compass className="w-3 h-3 text-orange-500 animate-spin" style={{ animationDuration: '8s' }} />
            <span className="text-[8px] font-extrabold text-zinc-400 tracking-wider">HUD ONLINE</span>
          </div>
        </div>

        {/* Lower HUD status metrics */}
        <div className="relative bottom-3 left-3 right-3 bg-zinc-950/80 backdrop-blur-md border border-white/5 rounded-xl p-3 flex justify-between items-center z-10">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <div className="flex flex-col">
              <span className="text-[7.5px] font-bold text-zinc-500 uppercase tracking-widest leading-none">STATUS</span>
              <span className="text-[10px] font-black text-zinc-200 uppercase mt-0.5">PACK STRETCHED</span>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex flex-col text-right">
              <span className="text-[7.5px] font-bold text-zinc-500 uppercase tracking-widest leading-none">SPEED</span>
              <span className="text-[10px] font-black text-orange-400 font-mono mt-0.5">82 km/h</span>
            </div>
            <div className="flex flex-col text-right border-l border-white/5 pl-3">
              <span className="text-[7.5px] font-bold text-zinc-500 uppercase tracking-widest leading-none">COHORT</span>
              <span className="text-[10px] font-black text-zinc-200 mt-0.5">5 / 5</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 4. CLEAN MINI-FEATURES ROW */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="grid grid-cols-3 gap-3 w-full text-center z-10 mt-1"
      >
        <div className="flex flex-col items-center gap-1 bg-zinc-900/30 border border-white/5 rounded-xl py-3 px-2">
          <div className="w-7 h-7 bg-orange-500/10 rounded-lg flex items-center justify-center mb-1">
            <Map className="w-4 h-4 text-orange-500" />
          </div>
          <span className="text-[9px] font-extrabold text-white uppercase tracking-wider">Live GPS</span>
          <span className="text-[7.5px] text-zinc-500 font-bold leading-none mt-0.5">MapLibre Engine</span>
        </div>
        
        <div className="flex flex-col items-center gap-1 bg-zinc-900/30 border border-white/5 rounded-xl py-3 px-2">
          <div className="w-7 h-7 bg-orange-500/10 rounded-lg flex items-center justify-center mb-1">
            <Shield className="w-4 h-4 text-orange-500" />
          </div>
          <span className="text-[9px] font-extrabold text-white uppercase tracking-wider">Proximity</span>
          <span className="text-[7.5px] text-zinc-500 font-bold leading-none mt-0.5">Stretching Alert</span>
        </div>

        <div className="flex flex-col items-center gap-1 bg-zinc-900/30 border border-white/5 rounded-xl py-3 px-2">
          <div className="w-7 h-7 bg-orange-500/10 rounded-lg flex items-center justify-center mb-1">
            <AlertTriangle className="w-4 h-4 text-orange-500 animate-pulse" />
          </div>
          <span className="text-[9px] font-extrabold text-white uppercase tracking-wider">SOS Radar</span>
          <span className="text-[7.5px] text-zinc-500 font-bold leading-none mt-0.5">Emergency Ping</span>
        </div>
      </motion.div>

      {/* 5. PRIMARY ACTION CALL-TO-ACTION */}
      <footer className="relative flex flex-col gap-3.5 w-full mt-6 z-10">
        <motion.button 
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/onboarding')} 
          className="w-full py-4.5 px-6 bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 hover:brightness-110 active:brightness-95 text-white font-extrabold rounded-xl shadow-lg shadow-orange-500/10 active:scale-[0.98] transition-all text-xs font-['Outfit'] uppercase tracking-wider flex items-center justify-center gap-2"
        >
          Create Rider Profile
          <ChevronRight className="w-4 h-4" />
        </motion.button>
        
        <p className="text-[9px] text-zinc-600 text-center font-extrabold uppercase tracking-widest">
          RydrPack Cohort HUD • v2.0
        </p>
      </footer>
    </div>
  );
}
