import React from 'react';
import { ArrowRight, Sparkles, CheckCircle2, ShieldCheck, Building2, GraduationCap, ArrowUpRight, Activity } from 'lucide-react';
import Reveal from './Reveal';

const Hero = ({ onOpenJoin }) => {
  return (
    <section 
      id="hero" 
      className="relative min-h-screen pt-28 pb-20 flex flex-col justify-center items-center overflow-hidden bg-[#060911] cyber-grid"
    >
      {/* Background Animated Gradient / Floating Geometric Shapes in Teal & Cyan */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[15%] left-1/2 -translate-x-1/2 w-[700px] h-[550px] bg-cyan-500/15 rounded-full blur-[120px] animate-orb-1" />
        <div className="absolute top-[35%] -left-[10%] w-[550px] h-[550px] bg-teal-500/12 rounded-full blur-[140px] animate-orb-2" />
        <div className="absolute bottom-[5%] -right-[10%] w-[600px] h-[600px] bg-blue-600/15 rounded-full blur-[130px] animate-orb-3" />
        
        {/* Decorative Geometric Wireframe Hexagons / Grid accents */}
        <div className="absolute top-1/4 left-10 w-24 h-24 border border-cyan-500/20 rounded-2xl rotate-12 hidden lg:block animate-pulse" />
        <div className="absolute bottom-1/3 right-12 w-32 h-32 border border-teal-500/20 rounded-full hidden lg:block" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 text-center flex flex-col items-center">
        {/* Top Innovation Pill Badge */}
        <Reveal animation="fade-down" delay={100}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0c1629]/90 border border-cyan-500/30 text-cyan-300 text-xs sm:text-sm font-medium mb-8 shadow-[0_0_20px_rgba(6,182,212,0.15)] backdrop-blur-md">
            <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
            <Sparkles className="w-4 h-4 text-cyan-300" />
            <span>Bridging Civic Challenges With Verified Brainpower</span>
          </div>
        </Reveal>

        {/* Large Bold Headline */}
        <Reveal animation="fade-up" delay={200}>
          <h1 className="font-['Outfit'] font-black text-4xl sm:text-6xl md:text-7xl lg:text-8xl tracking-tight text-white max-w-5xl leading-[1.08] mb-6">
            Turning Real-World <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-sky-400">
              Civic Problems
            </span>{' '}
            Into Solutions
          </h1>
        </Reveal>

        {/* Subheadline one line below */}
        <Reveal animation="fade-up" delay={300}>
          <p className="text-lg sm:text-xl md:text-2xl text-slate-300 font-normal max-w-3xl leading-relaxed mb-10">
            A trusted platform connecting citizens, NGOs, and government bodies with verified university researchers and industry innovators to resolve societal challenges together.
          </p>
        </Reveal>

        {/* Centered Big Red Pill Button (The ONLY Red Element) */}
        <Reveal animation="scale-in" delay={400}>
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 justify-center">
            <button
              onClick={onOpenJoin}
              className="red-pill-button px-10 py-5 text-lg sm:text-xl tracking-wider uppercase"
            >
              <span>Join CollabX</span>
              <ArrowRight className="w-6 h-6 ml-3 inline" />
            </button>

            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#0c1629]/80 hover:bg-[#12203d] border border-cyan-500/30 text-cyan-300 font-['Outfit'] font-semibold text-base transition-all hover:border-cyan-400/60"
            >
              <span>Explore Process</span>
              <ArrowUpRight className="w-4 h-4" />
            </a>
          </div>
        </Reveal>

        {/* Hero Interactive Preview Card: Real Civic Problem Meeting Verified Research */}
        <Reveal animation="fade-up" delay={500} className="w-full max-w-4xl mt-16">
          <div className="p-1 rounded-3xl bg-gradient-to-b from-cyan-500/30 via-teal-500/10 to-transparent shadow-[0_20px_60px_-15px_rgba(6,182,212,0.2)]">
            <div className="bg-[#0b1222]/95 border border-cyan-500/20 rounded-[22px] p-6 sm:p-8 backdrop-blur-2xl text-left">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-teal-400 animate-pulse" />
                  <span className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-bold">
                    Active Challenge Dispatch #CX-8120
                  </span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-teal-950/70 border border-teal-500/40 text-teal-300 text-xs font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Escrow & Identity Verified</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                {/* Civic Challenge Post */}
                <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80">
                  <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-2">
                    <Building2 className="w-4 h-4" />
                    <span>Posted by Municipal Clean Water NGO</span>
                  </div>
                  <h4 className="text-lg font-bold text-white mb-2 font-['Outfit']">
                    Sub-Surface Arsenic Contamination Mapping & Filtration Pilot
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                    Groundwater salinity and heavy metal concentration spiking across 14 village aquifer zones. Seeking specialized chemical hydrologists for low-cost filtration membrane deployment.
                  </p>
                  <div className="flex items-center gap-2 mt-4 text-[11px] text-slate-400 font-mono">
                    <span className="px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300">Target: 45 Days</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">Dataset Attached (3.2 GB)</span>
                  </div>
                </div>

                {/* Verified Solver Match */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0c1830] to-[#0a1224] border border-cyan-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-teal-400 uppercase tracking-wider">
                      <GraduationCap className="w-4 h-4" />
                      <span>Matched Verified Solver</span>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-[10px] font-bold border border-teal-500/30">
                      <CheckCircle2 className="w-3 h-3" /> VERIFIED
                    </span>
                  </div>
                  <h4 className="text-lg font-bold text-white mb-1 font-['Outfit']">
                    Advanced Membrane Lab • IISc / IIT Tech Consortium
                  </h4>
                  <p className="text-xs text-slate-300 mb-3">
                    Lead: Prof. R. Krishnamurthy (Ph.D., Environmental Engineering) — 14 Patents in Nanofiltration.
                  </p>
                  <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/20 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-cyan-300 block font-mono">Solution Blueprint Accepted</span>
                      <span className="text-xs font-bold text-white">Stage 2: Pilot Testing Initiated</span>
                    </div>
                    <div className="flex items-center gap-1 text-teal-400 text-xs font-semibold">
                      <Activity className="w-4 h-4 animate-pulse" />
                      <span>Live Collab</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export default Hero;
