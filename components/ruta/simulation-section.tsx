"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { 
  Play, Pause, RotateCcw, MapPin, Bus, Clock, 
  Wallet, ChevronRight, Navigation, Bot, Shield, 
  Activity, Zap, Info, Map as MapIcon
} from "lucide-react";

// ─── Route definition ──────────────────────────────────────────────────────────

interface Stop {
  label: string;
  sublabel: string;
  pct: number; // 0–1 position along the path
  x: number;   // canvas % [0-100]
  y: number;
}

const STOPS: Stop[] = [
  { label: "IT Park", sublabel: "Cebu IT Park Terminal", pct: 0,    x: 82, y: 14 },
  { label: "Lahug",   sublabel: "JY Square / Gorordo",  pct: 0.18,  x: 72, y: 30 },
  { label: "Capitol", sublabel: "Cebu Capitol Building", pct: 0.35,  x: 56, y: 44 },
  { label: "Fuente",  sublabel: "Fuente Osmeña Circle",  pct: 0.54,  x: 38, y: 56 },
  { label: "Junquera",sublabel: "P. Gomez / Junquera",   pct: 0.72,  x: 22, y: 68 },
  { label: "Colon",   sublabel: "Colon Street Terminal",  pct: 1,    x: 10, y: 82 },
];

const PATH_PTS = [
  { x: 82, y: 14 },
  { x: 74, y: 22 },
  { x: 68, y: 30 },
  { x: 62, y: 38 },
  { x: 56, y: 44 },
  { x: 48, y: 50 },
  { x: 38, y: 56 },
  { x: 30, y: 62 },
  { x: 22, y: 68 },
  { x: 16, y: 75 },
  { x: 10, y: 82 },
];

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function getPathPoint(t: number): { x: number; y: number; angle: number } {
  const total = PATH_PTS.length - 1;
  const raw = t * total;
  const idx = Math.min(Math.floor(raw), total - 1);
  const frac = raw - idx;
  const a = PATH_PTS[idx];
  const b = PATH_PTS[idx + 1];
  const x = lerp(a.x, b.x, frac);
  const y = lerp(a.y, b.y, frac);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const angle = Math.atan2(dy, dx);
  return { x, y, angle };
}

// ─── Canvas renderer ───────────────────────────────────────────────────────────

function drawSimulation(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  progress: number,
  time: number
) {
  ctx.clearRect(0, 0, W, H);

  const px = (v: number) => (v / 100) * W;
  const py = (v: number) => (v / 100) * H;

  // Grid
  ctx.strokeStyle = "rgba(56,189,248,0.03)";
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 50) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y < H; y += 50) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  // Path Shadow/Glow
  ctx.beginPath();
  PATH_PTS.forEach((pt, i) => {
    i === 0 ? ctx.moveTo(px(pt.x), py(pt.y)) : ctx.lineTo(px(pt.x), py(pt.y));
  });
  ctx.strokeStyle = "rgba(15,23,42,0.8)";
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  ctx.stroke();

  // Ghost Path
  ctx.strokeStyle = "rgba(148,163,184,0.1)";
  ctx.lineWidth = 4;
  ctx.stroke();

  // Active Segment
  const steps = 40;
  ctx.beginPath();
  for (let s = 0; s <= steps; s++) {
    const t = (s / steps) * progress;
    const pt = getPathPoint(t);
    s === 0 ? ctx.moveTo(px(pt.x), py(pt.y)) : ctx.lineTo(px(pt.x), py(pt.y));
  }
  const grad = ctx.createLinearGradient(px(82), py(14), px(10), py(82));
  grad.addColorStop(0, "rgba(56,189,248,0.2)");
  grad.addColorStop(1, "rgba(56,189,248,1)");
  ctx.strokeStyle = grad;
  ctx.lineWidth = 4;
  ctx.stroke();

  // Stops
  STOPS.forEach((stop) => {
    const cx = px(stop.x);
    const cy = py(stop.y);
    const reached = progress >= stop.pct;
    const pulse = Math.sin(time * 0.05 + stop.pct * 10);

    if (reached) {
      ctx.beginPath();
      ctx.arc(cx, cy, 12 + pulse * 4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(56,189,248,0.15)";
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(cx, cy, reached ? 6 : 4, 0, Math.PI * 2);
    ctx.fillStyle = reached ? "#38bdf8" : "#1e293b";
    ctx.fill();
    ctx.strokeStyle = reached ? "#fff" : "rgba(148,163,184,0.3)";
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  // Jeepney
  const pos = getPathPoint(progress);
  const jx = px(pos.x);
  const jy = py(pos.y);

  // Glow
  const jGlow = ctx.createRadialGradient(jx, jy, 0, jx, jy, 30);
  jGlow.addColorStop(0, "rgba(56,189,248,0.4)");
  jGlow.addColorStop(1, "rgba(56,189,248,0)");
  ctx.beginPath();
  ctx.arc(jx, jy, 30, 0, Math.PI * 2);
  ctx.fillStyle = jGlow;
  ctx.fill();

  // Jeepney Shape
  ctx.save();
  ctx.translate(jx, jy);
  ctx.rotate(pos.angle);
  
  // Body
  ctx.fillStyle = "#0ea5e9";
  ctx.beginPath();
  ctx.roundRect(-12, -7, 24, 14, 3);
  ctx.fill();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Cabin
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.fillRect(2, -5, 8, 10);

  ctx.restore();
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function SimulationSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const progressRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);
  const timeCounterRef = useRef(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStop, setCurrentStop] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [status, setStatus] = useState("Standby");

  const updateCurrentStop = useCallback((p: number) => {
    let idx = 0;
    for (let i = STOPS.length - 1; i >= 0; i--) {
      if (p >= STOPS[i].pct) { idx = i; break; }
    }
    setCurrentStop(idx);
  }, []);

  const animate = useCallback((ts: number) => {
    if (lastTimeRef.current === null) lastTimeRef.current = ts;
    const delta = ts - lastTimeRef.current;
    lastTimeRef.current = ts;
    timeCounterRef.current += 1;

    progressRef.current = Math.min(progressRef.current + delta / 45000, 1);
    const p = progressRef.current;

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) drawSimulation(ctx, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1), p, timeCounterRef.current);
    }

    setProgress(p);
    updateCurrentStop(p);
    
    if (p < 1) {
      animRef.current = requestAnimationFrame(animate);
    } else {
      setIsPlaying(false);
      setStatus("Completed");
    }
  }, [updateCurrentStop]);

  useEffect(() => {
    if (isPlaying) {
      setStatus("In Transit");
      const base = 22 + Math.sin(timeCounterRef.current * 0.1) * 4;
      setSpeed(Math.round(base));
      animRef.current = requestAnimationFrame(animate);
    } else {
      setSpeed(0);
      cancelAnimationFrame(animRef.current);
    }
    return () => cancelAnimationFrame(animRef.current);
  }, [isPlaying, animate]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      const ctx = canvas.getContext("2d");
      if (ctx) { ctx.scale(dpr, dpr); drawSimulation(ctx, w, h, progressRef.current, timeCounterRef.current); }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  const startPlay = () => {
    if (progressRef.current >= 1) { progressRef.current = 0; setProgress(0); }
    setIsPlaying(true);
  };
  const pause = () => setIsPlaying(false);
  const reset = () => {
    cancelAnimationFrame(animRef.current);
    progressRef.current = 0;
    setProgress(0);
    setCurrentStop(0);
    setIsPlaying(false);
    setStatus("Standby");
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) drawSimulation(ctx, canvas.width/(window.devicePixelRatio||1), canvas.height/(window.devicePixelRatio||1), 0, 0);
    }
  };

  const stop = STOPS[currentStop];
  const nextStop = STOPS[Math.min(currentStop + 1, STOPS.length - 1)];
  const elapsedMin = Math.round(progress * 35);
  const distanceLeft = (1 - progress) * 5.2;

  return (
    <section id="simulation" className="py-20 px-4 bg-[#0a0f1d] overflow-hidden">
      <div className="max-w-7xl mx-auto">
        
        {/* Header - Minimalist & Specific */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Live Operations Monitor</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter">
              TRANSIT <span className="text-blue-500">SIMULATOR</span>
            </h2>
          </div>
          <div className="flex items-center gap-4 bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-2xl p-4">
             <div className="text-right">
                <p className="text-[10px] font-bold text-slate-500 uppercase">System Time</p>
                <p className="text-lg font-mono font-bold text-white">12:45:02 <span className="text-xs text-blue-400">PM</span></p>
             </div>
             <div className="w-px h-10 bg-white/10" />
             <div className="flex flex-col items-center">
                <Zap className="w-5 h-5 text-yellow-400 mb-1" />
                <span className="text-[9px] font-bold text-slate-500">OPTIMIZED</span>
             </div>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column - Real-time Data (3/12) */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Active Vehicle Card */}
            <div className="bg-slate-900/80 border border-white/5 rounded-[32px] p-6 shadow-2xl overflow-hidden relative group">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-colors" />
              
              <div className="flex justify-between items-start mb-8">
                <div className="w-12 h-12 rounded-2xl bg-blue-500 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.5)]">
                  <Bus className="w-6 h-6 text-white" />
                </div>
                <div className="px-3 py-1 rounded-full bg-slate-800 text-[10px] font-bold text-slate-300 border border-white/5">
                  ID: RUTA-017-B
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Status</p>
                  <p className="text-xl font-bold text-white flex items-center gap-2">
                    {status} 
                    {isPlaying && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Speed</p>
                    <p className="text-2xl font-mono font-bold text-white">{speed}<span className="text-xs ml-1 text-slate-500">km/h</span></p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Pass.</p>
                    <p className="text-2xl font-mono font-bold text-white">14<span className="text-xs ml-1 text-slate-500">/22</span></p>
                  </div>
                </div>
              </div>
            </div>

            {/* Next Stop Card */}
            <div className="bg-blue-600 rounded-[32px] p-6 shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4">
                 <Navigation className="w-10 h-10 text-white/20" />
               </div>
               <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1">Next Destination</p>
               <h3 className="text-2xl font-bold text-white mb-1">{nextStop.label}</h3>
               <p className="text-xs text-white/70 mb-4">{nextStop.sublabel}</p>
               
               <div className="flex items-center gap-2 bg-white/10 rounded-xl p-3">
                 <Clock className="w-4 h-4 text-white" />
                 <p className="text-xs font-bold text-white">ETA: <span className="font-mono">{Math.max(1, 5 - (elapsedMin % 5))} MIN</span></p>
               </div>
            </div>

            {/* Weather/Context */}
            <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-5 flex items-center justify-between">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
                   <Info className="w-5 h-5 text-slate-400" />
                 </div>
                 <div>
                   <p className="text-[10px] font-bold text-slate-500 uppercase">Traffic Cond.</p>
                   <p className="text-xs font-bold text-white">Moderate Flow</p>
                 </div>
               </div>
               <ChevronRight className="w-4 h-4 text-slate-600" />
            </div>

          </div>

          {/* Center Column - Visualizer (6/12) */}
          <div className="lg:col-span-6 space-y-6">
            <div className="relative rounded-[48px] border border-white/10 bg-slate-950 shadow-[0_40px_100px_rgba(0,0,0,0.6)] overflow-hidden" style={{ aspectRatio: "1/1" }}>
              
              <canvas ref={canvasRef} className="w-full h-full" />

              {/* Map Floating UI */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-8 left-8 bg-slate-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-blue-400" />
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Secure Link</p>
                      <p className="text-xs font-bold text-white">GPS ACTIVE</p>
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-8 right-8 bg-slate-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl">
                  <div className="flex items-center gap-3">
                    <Activity className="w-5 h-5 text-emerald-400" />
                    <p className="text-[10px] font-bold text-white uppercase tracking-tighter">DATA STREAMING...</p>
                  </div>
                </div>
              </div>

              {/* Scrubber overlay */}
              <div className="absolute bottom-8 left-8 right-32 h-2 bg-white/5 rounded-full overflow-hidden">
                 <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${progress * 100}%` }} />
              </div>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center justify-center gap-4">
              <button onClick={reset} className="w-14 h-14 rounded-2xl bg-slate-900 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-all">
                <RotateCcw className="w-6 h-6" />
              </button>
              <button 
                onClick={isPlaying ? pause : startPlay}
                className={`w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl transition-all hover:scale-105 active:scale-95 ${
                  isPlaying ? "bg-amber-500 shadow-amber-500/20" : "bg-blue-600 shadow-blue-500/20"
                }`}
              >
                {isPlaying ? <Pause className="w-8 h-8 text-white" /> : <Play className="w-8 h-8 text-white ml-1" />}
              </button>
              <button className="w-14 h-14 rounded-2xl bg-slate-900 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-all">
                <MapIcon className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Right Column - Itinerary (3/12) */}
          <div className="lg:col-span-3">
            <div className="bg-slate-900/80 border border-white/5 rounded-[32px] p-8 h-full flex flex-col">
              <div className="flex items-center gap-3 mb-10">
                <div className="w-2 h-8 bg-blue-500 rounded-full" />
                <p className="text-xs font-bold text-white uppercase tracking-widest">Flight Manifest</p>
              </div>

              <div className="relative flex-1 space-y-1">
                {STOPS.map((s, i) => {
                  const reached = progress >= s.pct;
                  const active = currentStop === i && progress < 0.99;
                  return (
                    <div key={i} className={`flex items-start gap-4 p-4 rounded-2xl transition-all duration-500 ${
                      active ? "bg-blue-500/10 border border-blue-500/20" : "bg-transparent border border-transparent"
                    }`}>
                      <div className="relative flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full transition-all duration-500 ${
                          reached ? "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,1)]" : "bg-slate-800"
                        }`} />
                        {i < STOPS.length - 1 && (
                          <div className={`w-0.5 h-12 transition-colors duration-500 ${reached ? "bg-blue-500/30" : "bg-slate-800"}`} />
                        )}
                      </div>
                      <div className="-mt-1">
                        <p className={`text-sm font-bold transition-colors ${reached ? "text-white" : "text-slate-600"}`}>
                          {s.label}
                        </p>
                        <p className="text-[10px] text-slate-600 font-medium">{s.sublabel}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 pt-8 border-t border-white/5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Estimated Fare</span>
                  <span className="text-lg font-mono font-bold text-white">₱13-20</span>
                </div>
                <button className="w-full py-4 rounded-2xl bg-slate-800 text-white text-xs font-bold border border-white/5 hover:bg-slate-700 transition-colors">
                  VIEW FULL REPORT
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
