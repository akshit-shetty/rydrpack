import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Navigation2, 
  Users, 
  ShieldAlert, 
  PlusCircle, 
  KeyRound, 
  ChevronRight, 
  Radio, 
  Activity, 
  Compass,
  ArrowRight,
  TrendingUp
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

  // Framer Motion Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: 'spring', stiffness: 100, damping: 15 }
    }
  };

  return (
    <div 
      className="page animate-fade-in" 
      style={{ 
        background: '#040405', 
        overflowY: 'auto', 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'flex-start' 
      }}
    >
      {/* Background Decorative Neon Glows */}
      <div className="absolute top-[-100px] left-[-50px] w-[300px] h-[300px] bg-orange-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-[300px] right-[-50px] w-[250px] h-[250px] bg-amber-500/5 rounded-full blur-[80px] pointer-events-none" />
      
      {/* Scrollable Container */}
      <motion.div 
        className="w-full px-6 py-6 flex flex-col gap-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* BRAND NAVBAR */}
        <motion.div 
          className="flex justify-between items-center bg-zinc-900/60 backdrop-blur-md border border-white/5 px-4 py-3 rounded-2xl"
          variants={itemVariants}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/25">
              <Navigation2 className="text-white fill-white rotate-45 w-4 h-4 translate-y-[-1px] translate-x-[-1px]" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-white font-['Outfit'] block leading-none">RydrPack</span>
              <span className="text-[9px] text-orange-500 font-bold tracking-widest uppercase mt-0.5 block">COHORT HUD</span>
            </div>
          </div>
          <button 
            onClick={() => navigate('/login')}
            className="text-xs font-semibold text-zinc-300 hover:text-white px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 transition-all flex items-center gap-1"
          >
            Sign In <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </motion.div>

        {/* HERO TITLE SECTION */}
        <motion.div className="text-center mt-3" variants={itemVariants}>
          <div className="inline-flex items-center gap-1.5 bg-orange-500/10 text-orange-400 border border-orange-500/20 px-3 py-1 rounded-full text-xs font-bold mb-4">
            <Radio className="w-3 h-3 animate-pulse" />
            <span>v2.0 ACTIVE</span>
          </div>
          
          <h1 className="font-['Outfit'] text-[2.75rem] leading-[1.05] font-black text-white tracking-tight uppercase mb-3">
            Ride Together.<br/>
            <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">Stay Together.</span>
          </h1>
          <p className="text-zinc-400 text-sm max-w-xs mx-auto leading-relaxed">
            The premium cohort tracker for biker packs. Monitor live telemetry, coordinate routes, and guarantee rider safety.
          </p>
        </motion.div>

        {/* HIGH-FIDELITY LIVE MAP UI MOCKUP */}
        <motion.div 
          className="relative bg-zinc-950/80 border border-white/5 rounded-3xl overflow-hidden shadow-2xl shadow-black/80 group"
          variants={itemVariants}
          whileHover={{ scale: 1.01 }}
        >
          {/* Mock Map Background Grid */}
          <div 
            className="h-[240px] w-full relative bg-[#070709] overflow-hidden" 
            style={{
              backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
              backgroundSize: '16px 16px'
            }}
          >
            {/* Top HUD overlay */}
            <div className="absolute top-3 left-3 right-3 flex justify-between items-start pointer-events-none z-10">
              <div className="bg-black/80 backdrop-blur-md border border-white/10 rounded-xl px-2.5 py-1.5 flex items-center gap-2">
                <Compass className="w-3.5 h-3.5 text-orange-500 animate-spin" style={{ animationDuration: '6s' }} />
                <span className="text-[10px] font-bold text-zinc-200 tracking-wide">ROUTE ACTIVE</span>
              </div>
              <div className="bg-black/80 backdrop-blur-md border border-white/10 rounded-xl px-2.5 py-1.5 text-right flex flex-col items-end">
                <span className="text-[8px] font-semibold text-zinc-500">SPEED</span>
                <span className="text-[12px] font-extrabold text-orange-400 font-mono leading-none">82 <span className="text-[8px] font-normal text-zinc-400">km/h</span></span>
              </div>
            </div>

            {/* Glowing route line SVG */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 350 240">
              <defs>
                <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#F97316" />
                  <stop offset="100%" stopColor="#FF5500" />
                </linearGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              {/* Route line */}
              <path 
                d="M 50 180 C 120 180, 100 80, 180 80 C 260 80, 240 160, 310 160" 
                fill="none" 
                stroke="url(#routeGrad)" 
                strokeWidth="4" 
                strokeLinecap="round"
                filter="url(#glow)"
                className="opacity-95"
              />
              <path 
                d="M 50 180 C 120 180, 100 80, 180 80 C 260 80, 240 160, 310 160" 
                fill="none" 
                stroke="#fff" 
                strokeWidth="1" 
                strokeLinecap="round"
                className="opacity-30"
              />
            </svg>

            {/* Pulsing Riders */}
            {/* Rider 1: Lead (Akshit) */}
            <div className="absolute top-[72px] left-[172px] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
              <span className="absolute -top-6 bg-orange-500 text-black text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow-lg uppercase tracking-wider whitespace-nowrap">
                Akshit (Lead)
              </span>
              <span className="w-4 h-4 bg-orange-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center relative">
                <span className="absolute w-8 h-8 rounded-full bg-orange-500/40 animate-ping" />
              </span>
            </div>

            {/* Rider 2: Safe Biker */}
            <div className="absolute top-[172px] left-[42px] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
              <span className="absolute -top-6 bg-zinc-900 border border-white/10 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap">
                Sam
              </span>
              <span className="w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center relative">
                <span className="absolute w-6 h-6 rounded-full bg-emerald-500/30 animate-pulse" />
              </span>
            </div>

            {/* Rider 3: Lagging Alert Biker */}
            <div className="absolute top-[152px] left-[295px] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
              <span className="absolute -top-7 bg-red-500/90 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow-lg uppercase tracking-wider flex items-center gap-1 animate-bounce whitespace-nowrap">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                Leo (Lagging)
              </span>
              <span className="w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center relative">
                <span className="absolute w-6 h-6 rounded-full bg-red-500/40 animate-ping" style={{ animationDuration: '1.2s' }} />
              </span>
            </div>
          </div>

          {/* HUD Status Bar Card */}
          <div className="bg-zinc-900 border-t border-white/5 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <Activity className="w-4 h-4 text-red-500 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block">COHORT STATUS</span>
                <span className="text-xs font-bold text-zinc-200">Alert: Pack stretching</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block">GAP DISTANCE</span>
              <span className="text-xs font-extrabold text-orange-400 font-mono">180m max</span>
            </div>
          </div>
        </motion.div>

        {/* FEATURES HIGHLIGHT GRID */}
        <motion.div 
          className="flex flex-col gap-4"
          variants={itemVariants}
        >
          {/* Feature 1: Real-time map */}
          <motion.div 
            className="flex gap-4 bg-zinc-900/40 border border-white/5 hover:border-orange-500/20 p-4 rounded-2xl transition-all"
            whileHover={{ x: 4 }}
          >
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
              <Navigation2 className="w-5 h-5 text-orange-500 rotate-45" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white font-['Outfit']">Zero-Latency Track</h3>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Render coordinates instantly on the MapLibre engine. Keep tabs on each biker's absolute heading and route deviation.
              </p>
            </div>
          </motion.div>

          {/* Feature 2: Biker Security */}
          <motion.div 
            className="flex gap-4 bg-zinc-900/40 border border-white/5 hover:border-orange-500/20 p-4 rounded-2xl transition-all"
            whileHover={{ x: 4 }}
          >
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white font-['Outfit']">Cohort Proximity Shield</h3>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Smart HUD notices flash when group splits occur. Avoid checking rearview mirrors or halting the ride.
              </p>
            </div>
          </motion.div>

          {/* Feature 3: Smart SOS */}
          <motion.div 
            className="flex gap-4 bg-zinc-900/40 border border-white/5 hover:border-orange-500/20 p-4 rounded-2xl transition-all"
            whileHover={{ x: 4 }}
          >
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white font-['Outfit']">Instant SOS Radar</h3>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Emergency triggers push critical alerts to the entire cohort map. Automatically notifies pre-set emergency contacts.
              </p>
            </div>
          </motion.div>
        </motion.div>

        {/* COMMUNITY PREVIEW CARD */}
        <motion.div 
          className="bg-gradient-to-br from-zinc-900/70 to-zinc-950/90 border border-white/5 p-5 rounded-3xl flex flex-col gap-4"
          variants={itemVariants}
        >
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-extrabold text-orange-500 tracking-wider uppercase">COMMUNITY MILESTONES</span>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-emerald-400/5 px-2 py-0.5 border border-emerald-400/10 rounded-lg">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>ACTIVE NOW</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Avatar Stack */}
            <div className="flex -space-x-2.5">
              <div className="w-8 h-8 rounded-full bg-orange-600 border border-black flex items-center justify-center text-[10px] font-bold text-white uppercase shadow-md">AS</div>
              <div className="w-8 h-8 rounded-full bg-zinc-700 border border-black flex items-center justify-center text-[10px] font-bold text-white uppercase shadow-md">JD</div>
              <div className="w-8 h-8 rounded-full bg-amber-500 border border-black flex items-center justify-center text-[10px] font-bold text-black uppercase shadow-md">LK</div>
              <div className="w-8 h-8 rounded-full bg-zinc-800 border border-black flex items-center justify-center text-[8px] font-bold text-zinc-400 shadow-md">+40</div>
            </div>
            <div>
              <p className="text-xs font-extrabold text-zinc-200">Pack rides tracked worldwide</p>
              <p className="text-[10px] text-zinc-500">Over 14,800 miles traveled safely</p>
            </div>
          </div>
        </motion.div>

        {/* REDESIGNED ACTION CALL-TO-ACTIONS */}
        <motion.div 
          className="flex flex-col gap-3.5 w-full mt-2 mb-4"
          variants={itemVariants}
        >
          <h2 className="text-xl font-['Outfit'] font-black text-center text-white tracking-tight uppercase leading-tight">
            Track Your Pack. <span className="text-orange-500">Never Ride Alone.</span>
          </h2>

          <button 
            onClick={() => navigate('/onboarding')} 
            className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold rounded-2xl shadow-xl shadow-orange-500/20 hover:shadow-orange-500/35 hover:brightness-110 active:scale-[0.98] transition-all text-sm font-['Outfit'] uppercase tracking-wider"
          >
            <PlusCircle className="w-4 h-4" />
            Create Rider Profile
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>

          <button 
            onClick={() => navigate('/login')} 
            className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-zinc-900/60 hover:bg-zinc-900 border border-white/10 hover:border-white/20 text-zinc-200 font-bold rounded-2xl active:scale-[0.98] transition-all text-sm font-['Outfit'] uppercase tracking-wider"
          >
            <KeyRound className="w-4 h-4 text-orange-500" />
            Access Profile Login
          </button>
        </motion.div>

        {/* Small Footer */}
        <motion.div className="text-center py-2 text-[10px] text-zinc-600 tracking-wide font-semibold uppercase" variants={itemVariants}>
          © 2026 RydrPack Technologies Inc. • Protected Cohort GPS
        </motion.div>
      </motion.div>
    </div>
  );
}
