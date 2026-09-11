import React from 'react';
import { AlertCircle, BrainCircuit, Network, CheckCircle2, TrendingUp, Layers, HelpCircle } from 'lucide-react';
import Reveal from './Reveal';

const Mission = () => {
  return (
    <section 
      id="mission" 
      className="relative min-h-screen py-28 flex flex-col justify-center items-center bg-[#070d1a] border-t border-cyan-500/10"
    >
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[450px] bg-cyan-600/10 rounded-full blur-[160px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 w-full">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <Reveal animation="fade-down">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/70 border border-cyan-500/30 text-cyan-300 text-xs font-mono uppercase tracking-wider mb-4">
              <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
              <span>The Civic Disconnect</span>
            </div>
          </Reveal>

          <Reveal animation="fade-up" delay={150}>
            <h2 className="font-['Outfit'] font-extrabold text-3xl sm:text-5xl md:text-6xl text-white tracking-tight leading-tight mb-6">
              Critical Problems Go Unsolved Because They Never Reach the{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-400">
                Right Minds
              </span>
            </h2>
          </Reveal>

          <Reveal animation="fade-up" delay={250}>
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
              Every day, citizens, grassroots NGOs, and overburdened municipal departments identify real-world emergencies. Yet without direct pipelines to specialized researchers and industry engineers, these issues linger in isolation.
            </p>
          </Reveal>
        </div>

        {/* 3-Column Glassmorphic Problem -> Mission Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1: The Civic Need */}
          <Reveal animation="fade-up" delay={100} className="h-full">
            <div className="relative h-full p-8 rounded-3xl bg-[#0d1629]/80 border border-slate-800 hover:border-cyan-500/40 transition-all duration-300 hover:-translate-y-2 group shadow-xl backdrop-blur-xl">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-6 group-hover:scale-110 group-hover:bg-cyan-500/20 transition-all">
                <AlertCircle className="w-7 h-7" />
              </div>

              <span className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-bold block mb-2">
                01 • The Problem
              </span>

              <h3 className="font-['Outfit'] font-bold text-2xl text-white mb-4 group-hover:text-cyan-300 transition-colors">
                Grassroots Invisibility
              </h3>

              <p className="text-sm text-slate-300 leading-relaxed mb-6">
                Citizens and localized NGOs experience frontline failures — contamination, traffic hazards, climate disasters — but lack access to institutional labs, computational power, and scientific domain specialists.
              </p>

              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>Stalled Initiatives:</span>
                <span className="font-bold text-cyan-400">84% Lack Technical Teams</span>
              </div>
            </div>
          </Reveal>

          {/* Card 2: The Untapped Expertise */}
          <Reveal animation="fade-up" delay={250} className="h-full">
            <div className="relative h-full p-8 rounded-3xl bg-[#0d1629]/80 border border-slate-800 hover:border-teal-500/40 transition-all duration-300 hover:-translate-y-2 group shadow-xl backdrop-blur-xl">
              <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 mb-6 group-hover:scale-110 group-hover:bg-teal-500/20 transition-all">
                <BrainCircuit className="w-7 h-7" />
              </div>

              <span className="text-xs font-mono uppercase tracking-widest text-teal-400 font-bold block mb-2">
                02 • The Opportunity
              </span>

              <h3 className="font-['Outfit'] font-bold text-2xl text-white mb-4 group-hover:text-teal-300 transition-colors">
                Siloed Academic R&D
              </h3>

              <p className="text-sm text-slate-300 leading-relaxed mb-6">
                Elite professors, PhD scholars, and corporate researchers possess unmatched technical competence, but their discoveries often remain confined to journals rather than tangible civic deployments.
              </p>

              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>Published Research:</span>
                <span className="font-bold text-teal-400">2.5M+ Papers Untested in Field</span>
              </div>
            </div>
          </Reveal>

          {/* Card 3: The CollabX Mission */}
          <Reveal animation="fade-up" delay={400} className="h-full">
            <div className="relative h-full p-8 rounded-3xl bg-gradient-to-b from-[#0f1d38] to-[#0b1426] border border-cyan-500/30 hover:border-cyan-400 transition-all duration-300 hover:-translate-y-2 group shadow-[0_10px_40px_rgba(6,182,212,0.12)] backdrop-blur-xl">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-teal-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 mb-6 group-hover:scale-110 transition-all">
                <Network className="w-7 h-7" />
              </div>

              <span className="text-xs font-mono uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-400 font-bold block mb-2">
                03 • The CollabX Engine
              </span>

              <h3 className="font-['Outfit'] font-bold text-2xl text-white mb-4 group-hover:text-cyan-300 transition-colors">
                Verified Civic Synthesis
              </h3>

              <p className="text-sm text-slate-300 leading-relaxed mb-6">
                CollabX establishes a verified pipeline. We validate real problem briefs, vet solver credentials through rigorous document review, and oversee collaborative milestones until the civic problem is solved.
              </p>

              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>Verified Matching:</span>
                <span className="font-bold text-teal-300">Under 72 Hours</span>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Supporting Trust Banner */}
        <Reveal animation="fade-in" delay={500} className="mt-16">
          <div className="p-6 rounded-2xl bg-[#09101f]/70 border border-slate-800 flex flex-wrap items-center justify-around gap-6 text-center">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-teal-400" />
              <span className="text-sm font-medium text-slate-200">Zero Commercial Advertisements</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-teal-400" />
              <span className="text-sm font-medium text-slate-200">100% Institutional Document Vetting</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-teal-400" />
              <span className="text-sm font-medium text-slate-200">Public Impact Transparency Logs</span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export default Mission;
