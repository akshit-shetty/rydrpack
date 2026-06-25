import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Navigation2, 
  ChevronRight, 
  Map, 
  Shield, 
  AlertTriangle,
  Compass,
  Zap,
  Activity,
  Flame
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
      className="page relative flex flex-col justify-between overflow-hidden" 
      style={{ 
        background: '#040406', 
        minHeight: '100dvh',
        padding: '20px',
        fontFamily: "'Outfit', sans-serif"
      }}
    >
      {/* Background Interactive Navigation Grid */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.12] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px'
        }}
      />

      {/* Cyberpunk Neon Glow Rings in Background */}
      <div className="absolute top-[-50px] right-[-50px] w-[280px] h-[280px] bg-orange-500/10 rounded-full blur-[90px] pointer-events-none z-0" />
      <div className="absolute bottom-[-50px] left-[-50px] w-[280px] h-[280px] bg-red-600/10 rounded-full blur-[90px] pointer-events-none z-0" />

      {/* Background Winding Neon Laser Route (Weaving across screen) */}
      <svg className="absolute inset-0 w-full h-full opacity-40 z-0 pointer-events-none" viewBox="0 0 350 700" preserveAspectRatio="none">
        <path 
          d="M -20 120 C 150 150, 80 320, 280 340 C 400 360, 100 500, 370 650" 
          fill="none" 
          stroke="url(#cockpitRouteGrad)" 
          strokeWidth="6" 
          strokeLinecap="round"
          className="drop-shadow-[0_0_12px_rgba(249,115,22,0.8)]"
        />
        <defs>
          <linearGradient id="cockpitRouteGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
      </svg>

      {/* ==================== 1. COCKPIT INSTRUMENT HEADER ==================== */}
      <header className="relative z-10 w-full flex justify-between items-center bg-zinc-950/60 backdrop-blur-md border border-white/5 px-4 py-3 rounded-2xl">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
            <Navigation2 className="text-white fill-white rotate-45 w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-black text-sm tracking-tight text-white block">RydrPack</span>
            <span className="text-[7.5px] text-zinc-500 tracking-widest font-extrabold uppercase leading-none">SYS: READY</span>
          </div>
        </div>

        {/* Tactical status dial */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col text-right">
            <span className="text-[7px] font-extrabold text-zinc-500 uppercase tracking-widest leading-none">TELEMETRY</span>
            <span className="text-[9px] font-bold text-emerald-400 font-mono mt-0.5">ONLINE</span>
          </div>
          <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]" />
        </div>
      </header>

      {/* ==================== 2. TACTICAL SPEEDOMETER / RADAR RING ==================== */}
      <section className="relative z-10 w-full flex flex-col items-center justify-center my-6">
        <div className="relative w-[180px] h-[180px] rounded-full border border-white/5 bg-zinc-950/40 backdrop-blur-sm flex items-center justify-center shadow-2xl">
          {/* Radial Sweep effect */}
          <div 
            className="absolute inset-2.5 rounded-full border border-dashed border-orange-500/20 animate-spin"
            style={{ animationDuration: '12s' }}
          />
          <div 
            className="absolute inset-5 rounded-full border border-double border-white/5 animate-spin"
            style={{ animationDuration: '30s', animationDirection: 'reverse' }}
          />

          {/* Glowing central status center */}
          <div className="text-center flex flex-col items-center">
            <Compass className="w-6 h-6 text-orange-500 animate-pulse mb-1.5" />
            <span className="text-[9px] font-extrabold text-zinc-500 tracking-widest uppercase">COHORT GPS</span>
            <h2 className="text-[2.2rem] font-black text-white font-mono leading-none tracking-tighter mt-1">
              82<span className="text-[10px] font-bold text-zinc-400 font-sans ml-1">km/h</span>
            </h2>
            <span className="text-[7.5px] font-bold text-zinc-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/5 mt-1.5">
              5 RIDERS ACTIVE
            </span>
          </div>

          {/* Compass labels around ring */}
          <span className="absolute top-2 text-[8px] font-bold text-zinc-600">N</span>
          <span className="absolute bottom-2 text-[8px] font-bold text-zinc-600">S</span>
          <span className="absolute left-2.5 text-[8px] font-bold text-zinc-600">W</span>
          <span className="absolute right-2.5 text-[8px] font-bold text-zinc-600">E</span>
        </div>
      </section>

      {/* ==================== 3. FLOATING MAIN CONTROL GLASS DECK ==================== */}
      <main className="relative z-10 w-full bg-gradient-to-b from-zinc-900/80 to-zinc-950/95 backdrop-blur-xl border border-white/10 rounded-[28px] p-5 shadow-2xl shadow-black/80 flex flex-col items-center text-center">
        {/* Core Tagline Pill */}
        <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 px-3 py-1 rounded-full text-[9px] font-extrabold text-orange-400 tracking-wider uppercase mb-4">
          <Activity className="w-3.5 h-3.5 text-orange-500" />
          <span>PROXIMITY RADAR v2.0</span>
        </div>

        {/* Title */}
        <h1 className="font-['Outfit'] text-[2.1rem] leading-[1.05] font-black text-white tracking-tight uppercase">
          RIDE TOGETHER.<br/>
          <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">STAY TOGETHER.</span>
        </h1>

        {/* Subtitle */}
        <p className="text-zinc-400 text-xs mt-3.5 leading-relaxed max-w-[280px] font-semibold">
          Secure your pack. Real-time telemetry sync, auto-lagging warnings, and instantaneous SOS broadcasting.
        </p>

        {/* Vertical Separator Grid */}
        <div className="grid grid-cols-3 gap-3 w-full border-t border-b border-white/5 my-5 py-4">
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-black text-orange-500 uppercase tracking-wide">Live Telemetry</span>
            <span className="text-[8px] text-zinc-500 font-extrabold mt-1">ZERO LATENCY</span>
          </div>
          <div className="flex flex-col items-center border-l border-r border-white/5">
            <span className="text-[10px] font-black text-orange-500 uppercase tracking-wide">Auto Alerts</span>
            <span className="text-[8px] text-zinc-500 font-extrabold mt-1">PROXIMITY SCAN</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-black text-orange-500 uppercase tracking-wide">Radar SOS</span>
            <span className="text-[8px] text-zinc-500 font-extrabold mt-1">INSTANT PING</span>
          </div>
        </div>

        {/* Biker Stack Visualizer */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex -space-x-2">
            <div className="w-6 h-6 rounded-full bg-orange-500 border border-zinc-950 flex items-center justify-center text-[7.5px] font-bold text-white uppercase">AS</div>
            <div className="w-6 h-6 rounded-full bg-zinc-700 border border-zinc-950 flex items-center justify-center text-[7.5px] font-bold text-white uppercase">JD</div>
            <div className="w-6 h-6 rounded-full bg-amber-500 border border-zinc-950 flex items-center justify-center text-[7.5px] font-bold text-black uppercase">LK</div>
          </div>
          <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-wider">
            Linked to Supabase Central Database
          </span>
        </div>
      </main>

      {/* ==================== 4. TACTICAL TRIGGER PANEL (IGNITION) ==================== */}
      <footer className="relative z-10 w-full flex flex-col gap-3 mt-5">
        {/* Engine Start/Ignition CTA Button */}
        <motion.button 
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/onboarding')} 
          className="w-full py-4.5 px-6 bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 hover:brightness-110 active:brightness-95 text-white font-black rounded-2xl shadow-xl shadow-orange-500/25 active:scale-[0.98] transition-all text-xs font-['Outfit'] uppercase tracking-widest flex items-center justify-center gap-2 border-t border-white/20"
        >
          <Flame className="w-4 h-4 text-white fill-white animate-pulse" />
          START ENGINE (CREATE PROFILE)
          <ChevronRight className="w-4 h-4" />
        </motion.button>

        {/* Access login */}
        <button 
          onClick={() => navigate('/login')}
          className="w-full py-3.5 px-6 bg-zinc-950/40 hover:bg-zinc-950/80 border border-white/5 text-zinc-300 hover:text-white font-bold rounded-2xl text-xs font-['Outfit'] uppercase tracking-widest transition-all"
        >
          Rider Console Login
        </button>

        <p className="text-[7.5px] text-zinc-600 text-center font-extrabold uppercase tracking-widest mt-1">
          RydrPack Tactical Instrument Cluster • Build v2.0
        </p>
      </footer>
    </div>
  );
}
